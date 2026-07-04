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
    payload?.qrcode,
    payload?.qrcode?.code,
  ];

  for (const value of candidates) {
    if (typeof value === 'string' && value.length > 20) {
      return value.startsWith('data:')
        ? value
        : `data:image/png;base64,${value.replace(/^data:image\/\w+;base64,/, '')}`;
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

/** Estados en los que NO se debe pedir un QR nuevo (interrumpe el emparejamiento). */
export function isPairingInProgress(state) {
  const value = String(state || '').toLowerCase();
  return value === 'connecting' || value === 'open';
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
      signal: AbortSignal.timeout(30_000),
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

  return {
    buildInstanceName(tenantSlug) {
      return buildInstanceName(config.evolutionInstancePrefix, tenantSlug);
    },

    async createInstance(instanceName) {
      try {
        return await request('POST', '/instance/create', {
          instanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        });
      } catch (error) {
        const detail = JSON.stringify(error.detail || error.message || '');
        if (
          error.statusCode === 403 ||
          error.statusCode === 409 ||
          /already|exist|exists/i.test(detail)
        ) {
          return { instanceName, alreadyExists: true };
        }
        throw error;
      }
    },

    async getQr(instanceName) {
      const payload = await request(
        'GET',
        `/instance/connect/${encodeURIComponent(instanceName)}`
      );
      const qrBase64 = extractQrBase64(payload);
      if (!qrBase64) {
        throw evolutionError(
          'Evolution API no devolvió QR en Base64',
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
      return {
        state,
        connected: isConnectedState(state, connectedState),
        pairing: isPairingInProgress(state),
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
  };
}
