import { createEvolutionClient } from './evolutionClient.js';

function normalizePrefix(prefix) {
  return String(prefix || 'faqinn_').replace(/_+$/, '_') || 'faqinn_';
}

/** Solo instancias creadas por FAQ Inn (prefijo obligatorio). */
export function isFaqInnInstance(instanceName, prefix = 'faqinn_') {
  const name = String(instanceName || '').trim();
  const p = normalizePrefix(prefix);
  return name.length > p.length && name.startsWith(p);
}

async function safeDeleteInstance(evolution, instanceName, prefix, logger) {
  if (!isFaqInnInstance(instanceName, prefix)) {
    logger.warn?.(
      { instance: instanceName, prefix },
      'evolution cleanup: BLOQUEADO borrar instancia fuera de prefijo faqinn_'
    );
    return false;
  }
  await evolution.logoutInstance(instanceName);
  await evolution.deleteInstance(instanceName);
  return true;
}

/**
 * Limpia instancias FAQ Inn que no quedaron conectadas.
 *
 * Regla dura: SOLO nombres que empiecen por EVOLUTION_INSTANCE_PREFIX (faqinn_).
 * Nunca toca instancias de otros sistemas en el mismo Evolution.
 */
export async function cleanupStaleEvolutionInstances(pool, config, logger = console) {
  if (!config.evolutionApiBaseUrl || !config.evolutionApiKey) {
    return { skipped: true, reason: 'evolution_not_configured' };
  }

  const staleMinutes = Number(config.evolutionStaleMinutes || 10);
  const evolution = createEvolutionClient(config);
  const prefix = normalizePrefix(config.evolutionInstancePrefix);
  const likePrefix = `${prefix}%`;

  const summary = {
    prefix,
    checked: 0,
    syncedConnected: 0,
    deleted: 0,
    orphansDeleted: 0,
    skippedForeign: 0,
    errors: 0,
  };

  const [staleRows] = await pool.query(
    `SELECT id, tenant_id, instance_name, status, phone_number,
            COALESCE(last_qr_at, updated_at, created_at) AS activity_at
     FROM evolution_instances
     WHERE status IN ('draft', 'qr_pending', 'error')
       AND instance_name LIKE ?
       AND COALESCE(last_qr_at, updated_at, created_at)
           < NOW() - (? * INTERVAL '1 minute')
     ORDER BY id ASC
     LIMIT 50`,
    [likePrefix, staleMinutes]
  );

  for (const row of staleRows) {
    summary.checked += 1;

    if (!isFaqInnInstance(row.instance_name, prefix)) {
      summary.skippedForeign += 1;
      logger.warn?.(
        { instance: row.instance_name },
        'evolution cleanup: fila DB ignorada (no es faqinn_)'
      );
      continue;
    }

    try {
      let connected = false;
      try {
        const state = await evolution.getConnectionState(row.instance_name);
        connected = state.connected;
      } catch {
        connected = false;
      }

      if (connected) {
        const phoneNumber =
          (await evolution.resolvePhoneNumber(row.instance_name)) ||
          row.phone_number ||
          '';
        await pool.query(
          `UPDATE evolution_instances
           SET status = 'connected',
               phone_number = ?,
               last_qr_base64 = '',
               connected_at = COALESCE(connected_at, NOW()),
               last_error = '',
               updated_at = NOW()
           WHERE id = ?`,
          [phoneNumber, row.id]
        );
        await pool.query(
          `UPDATE tenants SET status = 'connected', updated_at = NOW() WHERE id = ?`,
          [row.tenant_id]
        );
        await pool.query(
          `UPDATE tenant_provisioning
           SET status = 'connected', last_error = '', updated_at = NOW()
           WHERE tenant_id = ?`,
          [row.tenant_id]
        );
        summary.syncedConnected += 1;
        logger.info?.(
          { instance: row.instance_name },
          'evolution cleanup: sincronizada instancia ya conectada'
        );
        continue;
      }

      const deleted = await safeDeleteInstance(
        evolution,
        row.instance_name,
        prefix,
        logger
      );
      if (!deleted) {
        summary.skippedForeign += 1;
        continue;
      }

      await pool.query(
        `UPDATE evolution_instances
         SET status = 'error',
             last_qr_base64 = '',
             last_error = 'stale_cleanup',
             updated_at = NOW()
         WHERE id = ?`,
        [row.id]
      );
      await pool.query(
        `UPDATE tenants
         SET status = CASE WHEN status IN ('draft', 'qr_pending') THEN 'error' ELSE status END,
             updated_at = NOW()
         WHERE id = ?`,
        [row.tenant_id]
      );
      await pool.query(
        `UPDATE tenant_provisioning
         SET status = 'error',
             last_error = 'stale_cleanup',
             updated_at = NOW()
         WHERE tenant_id = ?`,
        [row.tenant_id]
      );

      summary.deleted += 1;
      logger.info?.(
        { instance: row.instance_name },
        'evolution cleanup: instancia faqinn_ no conectada eliminada'
      );
    } catch (error) {
      summary.errors += 1;
      logger.warn?.(
        { err: error, instance: row.instance_name },
        'evolution cleanup: error procesando fila'
      );
    }
  }

  // Huérfanas en Evolution: SOLO prefijo faqinn_, no conectadas, sin fila connected.
  try {
    const [connectedRows] = await pool.query(
      `SELECT instance_name FROM evolution_instances
       WHERE status = 'connected' AND instance_name LIKE ?`,
      [likePrefix]
    );
    const keep = new Set(connectedRows.map((r) => r.instance_name));

    const instances = await evolution.listInstances();

    for (const item of instances) {
      const name =
        item?.instanceName ||
        item?.name ||
        item?.instance?.instanceName ||
        item?.instance?.name;

      if (!isFaqInnInstance(name, prefix)) {
        continue;
      }
      if (keep.has(name)) {
        continue;
      }

      const [recent] = await pool.query(
        `SELECT id FROM evolution_instances
         WHERE instance_name = ?
           AND status IN ('draft', 'qr_pending')
           AND COALESCE(last_qr_at, updated_at, created_at)
               >= NOW() - (? * INTERVAL '1 minute')
         LIMIT 1`,
        [name, staleMinutes]
      );
      if (recent.length > 0) {
        continue;
      }

      let connected = false;
      try {
        const state = await evolution.getConnectionState(name);
        connected = state.connected;
      } catch {
        connected = false;
      }

      if (connected) {
        continue;
      }

      const deleted = await safeDeleteInstance(evolution, name, prefix, logger);
      if (!deleted) {
        summary.skippedForeign += 1;
        continue;
      }

      summary.orphansDeleted += 1;
      logger.info?.(
        { instance: name },
        'evolution cleanup: huérfana faqinn_ no conectada eliminada'
      );
    }
  } catch (error) {
    summary.errors += 1;
    logger.warn?.(
      { err: error },
      'evolution cleanup: no se pudo listar instancias Evolution'
    );
  }

  return summary;
}

export function startEvolutionCleanupScheduler(pool, config, logger = console) {
  if (!config.evolutionApiBaseUrl || !config.evolutionApiKey) {
    logger.info?.('evolution cleanup: desactivado (sin EVOLUTION_API_*)');
    return () => {};
  }

  const prefix = normalizePrefix(config.evolutionInstancePrefix);
  logger.info?.(
    { prefix, staleMinutes: config.evolutionStaleMinutes },
    'evolution cleanup: activo solo para instancias con prefijo faqinn_'
  );

  const intervalMinutes = Number(config.evolutionCleanupIntervalMinutes || 5);
  const intervalMs = Math.max(1, intervalMinutes) * 60_000;
  let running = false;

  const tick = async () => {
    if (running) {
      return;
    }
    running = true;
    try {
      const summary = await cleanupStaleEvolutionInstances(pool, config, logger);
      if (!summary.skipped) {
        logger.info?.({ summary }, 'evolution cleanup: ciclo terminado');
      }
    } catch (error) {
      logger.error?.({ err: error }, 'evolution cleanup: fallo del ciclo');
    } finally {
      running = false;
    }
  };

  const startupTimer = setTimeout(tick, 20_000);
  const intervalTimer = setInterval(tick, intervalMs);

  return () => {
    clearTimeout(startupTimer);
    clearInterval(intervalTimer);
  };
}
