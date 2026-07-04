function evolutionError(message, statusCode = 502, detail = null) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.detail = detail;
  return error;
}

function buildInstanceName(prefix, tenantSlug) {
  const safePrefix = String(prefix || 'faqinn_').replace(/_+$/, '') + '_';
  return `${safePrefix}${tenantSlug}`.slice(0, 64);
}

function extractQrBase64(payload) {
  const candidates = [
    payload?.qrcode?.base64,
    payload?.base64,
    payload?.qr?.base64,
    payload?.qrcode?.code,
    payload?.qrcode,
  ];

  for (const value of candidates) {
    if (typeof value !== 'string' || value.length < 20) {
      continue;
    }
    // Evolution a veces devuelve el código QR en texto, no imagen.
    if (!value.includes('base64') && !/^[A-Za-z0-9+/=\s]+$/.test(value.slice(0, 80))) {
      continue;
    }
    if (value.startsWith('data:image')) {
      return value;
    }
    const cleaned = value.replace(/^data:image\/\w+;base64,/, '').replace(/\s/g, '');
    // Solo aceptar payloads que parezcan PNG/JPEG base64 (no el string del QR crudo).
    if (cleaned.startsWith('iVBOR') || cleaned.startsWith('/9j/')) {
      return `data:image/png;base64,${cleaned}`;
    }
    if (cleaned.length > 200) {
      return `data:image/png;base64,${cleaned}`;
    }
  }

  return null;
}

function extractConnectionState(payload) {
  return (
    payload?.instance?.state ||
    payload?.state ||
    payload?.connectionState ||
    payload?.status ||
    null
  );
}

export function isConnectedState(state, expected = 'open') {
  return String(state || '').toLowerCase() === String(expected || 'open').toLowerCase();
}

function extractPhoneNumber(payload) {
  const candidates = [
    payload?.instance?.ownerJid,
    payload?.instance?.owner,
    payload?.ownerJid,
    payload?.owner,
    payload?.phoneNumber,
    payload?.phone,
    payload?.number,
    payload?.wuid,
  ];

  for (const value of candidates) {
    if (!value) {
      continue;
    }
    const text = String(value);
    const digits = text.replace(/@.+$/, '').replace(/\D/g, '');
    if (digits.length >= 8) {
      return digits;
    }
  }

  return null;
}

export function createEvolutionClient(config) {
  const baseUrl = config.evolutionApiBaseUrl;
  const apiKey = config.evolutionApiKey;
  const connectedState = (
    config.evolutionConnectedState || 'open'
  ).toLowerCase();

  if (!baseUrl) {
    throw evolutionError('EVOLUTION_API_BASE_URL no configurada', 503);
  }

  if (!apiKey) {
    throw evolutionError('EVOLUTION_API_KEY no configurada', 503);
  }

  async function request(method, path, body) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        apikey: apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(45_000),
    });

    let data = null;
    const text = await response.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      const message =
        data?.response?.message ||
        data?.message ||
        data?.error ||
        `Evolution API ${response.status}`;
      throw evolutionError(
        Array.isArray(message) ? message.join(', ') : String(message),
        response.status >= 400 && response.status < 500 ? response.status : 502,
        data
      );
    }

    return data;
  }

  async function ignoreNotFound(fn) {
    try {
      return await fn();
    } catch (error) {
      if (error.statusCode === 404 || /not found|does not exist|exist/i.test(error.message)) {
        return null;
      }
      return null;
    }
  }

  return {
    buildInstanceName(tenantSlug) {
      return buildInstanceName(config.evolutionInstancePrefix, tenantSlug);
    },

    async logoutInstance(instanceName) {
      return ignoreNotFound(() =>
        request('DELETE', `/instance/logout/${encodeURIComponent(instanceName)}`)
      );
    },

    async deleteInstance(instanceName) {
      return ignoreNotFound(() =>
        request('DELETE', `/instance/delete/${encodeURIComponent(instanceName)}`)
      );
    },

    async createInstance(instanceName) {
      return request('POST', '/instance/create', {
        instanceName,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      });
    },

    async getQr(instanceName) {
      const payload = await request(
        'GET',
        `/instance/connect/${encodeURIComponent(instanceName)}`
      );
      const qrBase64 = extractQrBase64(payload);
      if (!qrBase64) {
        throw evolutionError(
          'Evolution API no devolvió QR en imagen Base64',
          502,
          payload
        );
      }
      return { qrBase64, payload };
    },

    async getConnectionState(instanceName) {
      const payload = await request(
        'GET',
        `/instance/connectionState/${encodeURIComponent(instanceName)}`
      );
      const state = extractConnectionState(payload);
      const normalized = String(state || '').toLowerCase();
      return {
        state,
        connected: isConnectedState(state, connectedState),
        // "connecting" = QR activo o emparejando; no regenerar QR.
        awaitingScanOrPairing: normalized === 'connecting',
        payload,
      };
    },

    async fetchInstance(instanceName) {
      const payload = await request(
        'GET',
        `/instance/fetchInstances?instanceName=${encodeURIComponent(instanceName)}`
      );
      const row = Array.isArray(payload)
        ? payload[0]
        : payload?.instance || payload;
      return {
        phoneNumber: extractPhoneNumber(row) || extractPhoneNumber(payload),
        payload,
      };
    },

    async listInstances() {
      const payload = await request('GET', '/instance/fetchInstances');
      if (Array.isArray(payload)) {
        return payload;
      }
      if (Array.isArray(payload?.instance)) {
        return payload.instance;
      }
      return [];
    },

    async resolvePhoneNumber(instanceName) {
      try {
        const fetched = await this.fetchInstance(instanceName);
        if (fetched.phoneNumber) {
          return fetched.phoneNumber;
        }
      } catch {
        /* fall through */
      }

      try {
        const state = await this.getConnectionState(instanceName);
        return extractPhoneNumber(state.payload);
      } catch {
        return null;
      }
    },

    /**
     * Sesión limpia: logout + delete + create.
     * Evita instancias en limbo "connecting" que impiden vincular el dispositivo.
     */
    async createFreshQrSession(instanceName) {
      await this.logoutInstance(instanceName);
      await this.deleteInstance(instanceName);

      // Pequeña pausa para que Evolution libere la instancia en Redis/DB.
      await new Promise((resolve) => setTimeout(resolve, 800));

      const created = await this.createInstance(instanceName);
      let qrBase64 = extractQrBase64(created);

      if (!qrBase64) {
        // Solo un connect si create no trajo imagen QR.
        await new Promise((resolve) => setTimeout(resolve, 500));
        const qr = await this.getQr(instanceName);
        qrBase64 = qr.qrBase64;
      }

      return { qrBase64, created };
    },
  };
}
