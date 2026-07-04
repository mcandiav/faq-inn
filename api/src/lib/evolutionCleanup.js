import { createEvolutionClient } from './evolutionClient.js';

/**
 * Limpia instancias FAQ Inn que no quedaron conectadas.
 *
 * Reglas:
 * - Nunca borra instancias con status=connected en nuestra DB.
 * - Si Evolution reporta open, sincroniza a connected (no borra).
 * - Si lleva más de `staleMinutes` en qr_pending/error/draft, logout+delete en Evolution
 *   y marca error/abandoned en PostgreSQL.
 * - También elimina huérfanas en Evolution (prefijo faqinn_) no conectadas y sin fila connected.
 */
export async function cleanupStaleEvolutionInstances(pool, config, logger = console) {
  if (!config.evolutionApiBaseUrl || !config.evolutionApiKey) {
    return { skipped: true, reason: 'evolution_not_configured' };
  }

  const staleMinutes = Number(config.evolutionStaleMinutes || 10);
  const evolution = createEvolutionClient(config);
  const prefix = (config.evolutionInstancePrefix || 'faqinn_').replace(/_+$/, '_');

  const summary = {
    checked: 0,
    syncedConnected: 0,
    deleted: 0,
    orphansDeleted: 0,
    errors: 0,
  };

  const [staleRows] = await pool.query(
    `SELECT id, tenant_id, instance_name, status, phone_number,
            COALESCE(last_qr_at, updated_at, created_at) AS activity_at
     FROM evolution_instances
     WHERE status IN ('draft', 'qr_pending', 'error')
       AND COALESCE(last_qr_at, updated_at, created_at)
           < NOW() - (? * INTERVAL '1 minute')
     ORDER BY id ASC
     LIMIT 50`,
    [staleMinutes]
  );

  for (const row of staleRows) {
    summary.checked += 1;
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

      await evolution.logoutInstance(row.instance_name);
      await evolution.deleteInstance(row.instance_name);

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
        'evolution cleanup: instancia no conectada eliminada'
      );
    } catch (error) {
      summary.errors += 1;
      logger.warn?.(
        { err: error, instance: row.instance_name },
        'evolution cleanup: error procesando fila'
      );
    }
  }

  // Huérfanas en Evolution: prefijo faqinn_ sin registro connected en nuestra DB.
  try {
    const [connectedRows] = await pool.query(
      `SELECT instance_name FROM evolution_instances WHERE status = 'connected'`
    );
    const keep = new Set(connectedRows.map((r) => r.instance_name));

    const instances = await evolution.listInstances();

    for (const item of instances) {
      const name =
        item?.instanceName ||
        item?.name ||
        item?.instance?.instanceName ||
        item?.instance?.name;
      if (!name || !String(name).startsWith(prefix)) {
        continue;
      }
      if (keep.has(name)) {
        continue;
      }

      // No tocar filas recientes (aún en proceso de escaneo).
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

      await evolution.logoutInstance(name);
      await evolution.deleteInstance(name);
      summary.orphansDeleted += 1;
      logger.info?.(
        { instance: name },
        'evolution cleanup: huérfana no conectada eliminada'
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

  // Primer ciclo tras arranque (da tiempo a migraciones/red).
  const startupTimer = setTimeout(tick, 20_000);
  const intervalTimer = setInterval(tick, intervalMs);

  return () => {
    clearTimeout(startupTimer);
    clearInterval(intervalTimer);
  };
}
