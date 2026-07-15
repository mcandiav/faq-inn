import {
  DEFAULT_AGENT_OFF_TRIGGER,
  DEFAULT_AGENT_ON_TRIGGER,
  resolveControlAction,
  validateAgentControlTriggers,
} from './agentControlTriggers.js';

function validationError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeChatId(chatId) {
  const value = String(chatId ?? '').trim();
  if (!value) {
    throw validationError('chat_id es obligatorio');
  }
  return value;
}

function normalizeAgentId(agentId) {
  const value = String(agentId ?? '').trim();
  if (!value) {
    throw validationError('agent_id es obligatorio');
  }
  return value;
}

function normalizeTenantDbId(tenantDbId) {
  const value = Number(tenantDbId);
  if (!Number.isInteger(value) || value <= 0) {
    throw validationError('tenant_db_id es obligatorio');
  }
  return value;
}

export async function loadAgentControlTriggers(pool, tenantDbId) {
  const tenantId = normalizeTenantDbId(tenantDbId);
  const [rows] = await pool.query(
    `SELECT agent_off_trigger, agent_on_trigger
     FROM tenant_settings
     WHERE tenant_id = ?`,
    [tenantId]
  );
  const row = rows[0] || {};
  return {
    agent_off_trigger: row.agent_off_trigger || DEFAULT_AGENT_OFF_TRIGGER,
    agent_on_trigger: row.agent_on_trigger || DEFAULT_AGENT_ON_TRIGGER,
  };
}

export async function getConversationState(pool, tenantDbId, agentId, chatId) {
  const tenantId = normalizeTenantDbId(tenantDbId);
  const agent = normalizeAgentId(agentId);
  const chat = normalizeChatId(chatId);

  const [rows] = await pool.query(
    `SELECT agent_status
     FROM conversation_states
     WHERE tenant_id = ? AND agent_id = ? AND chat_id = ?`,
    [tenantId, agent, chat]
  );

  return rows[0]?.agent_status === 'suspended' ? 'suspended' : 'active';
}

async function upsertConversationState(pool, {
  tenantId,
  agentId,
  chatId,
  agentStatus,
  contactId = null,
}) {
  const now = new Date();
  const isSuspended = agentStatus === 'suspended';

  await pool.query(
    `INSERT INTO conversation_states (
       tenant_id,
       agent_id,
       chat_id,
       contact_id,
       agent_status,
       suspended_at,
       resumed_at,
       created_at,
       updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (tenant_id, agent_id, chat_id)
     DO UPDATE SET
       agent_status = EXCLUDED.agent_status,
       contact_id = COALESCE(EXCLUDED.contact_id, conversation_states.contact_id),
       suspended_at = CASE
         WHEN EXCLUDED.agent_status = 'suspended' THEN EXCLUDED.suspended_at
         ELSE conversation_states.suspended_at
       END,
       resumed_at = CASE
         WHEN EXCLUDED.agent_status = 'active' THEN EXCLUDED.resumed_at
         ELSE conversation_states.resumed_at
       END,
       updated_at = EXCLUDED.updated_at`,
    [
      tenantId,
      agentId,
      chatId,
      contactId,
      agentStatus,
      isSuspended ? now : null,
      isSuspended ? null : now,
      now,
      now,
    ]
  );
}

export async function setConversationSuspended(pool, tenantDbId, agentId, chatId, contactId = null) {
  const tenantId = normalizeTenantDbId(tenantDbId);
  const agent = normalizeAgentId(agentId);
  const chat = normalizeChatId(chatId);

  await upsertConversationState(pool, {
    tenantId,
    agentId: agent,
    chatId: chat,
    agentStatus: 'suspended',
    contactId,
  });

  return 'suspended';
}

export async function setConversationActive(pool, tenantDbId, agentId, chatId, contactId = null) {
  const tenantId = normalizeTenantDbId(tenantDbId);
  const agent = normalizeAgentId(agentId);
  const chat = normalizeChatId(chatId);

  await upsertConversationState(pool, {
    tenantId,
    agentId: agent,
    chatId: chat,
    agentStatus: 'active',
    contactId,
  });

  return 'active';
}

export async function processConversationControl(pool, input = {}) {
  const tenantId = normalizeTenantDbId(input.tenant_db_id ?? input.tenantDbId);
  const agentId = normalizeAgentId(input.agent_id ?? input.agentId);
  const chatId = normalizeChatId(input.chat_id ?? input.chatId);
  const message = input.message ?? input.chatInput ?? input.text ?? '';
  const fromMe = Boolean(input.from_me ?? input.fromMe);
  const contactId = input.contact_id ?? input.contactId ?? null;

  const triggers = await loadAgentControlTriggers(pool, tenantId);
  const action = resolveControlAction({
    message,
    fromMe,
    agentOffTrigger: triggers.agent_off_trigger,
    agentOnTrigger: triggers.agent_on_trigger,
  });

  if (action === 'suspend') {
    const agentStatus = await setConversationSuspended(
      pool,
      tenantId,
      agentId,
      chatId,
      contactId
    );
    return {
      action,
      agent_status: agentStatus,
      ...triggers,
    };
  }

  if (action === 'resume') {
    const agentStatus = await setConversationActive(
      pool,
      tenantId,
      agentId,
      chatId,
      contactId
    );
    return {
      action,
      agent_status: agentStatus,
      ...triggers,
    };
  }

  const agentStatus = await getConversationState(pool, tenantId, agentId, chatId);
  return {
    action: 'none',
    agent_status: agentStatus,
    ...triggers,
  };
}

export async function updateAgentControlTriggers(pool, tenantDbId, input = {}) {
  const tenantId = normalizeTenantDbId(tenantDbId);
  const off =
    input.agent_off_trigger !== undefined
      ? String(input.agent_off_trigger).trim()
      : undefined;
  const on =
    input.agent_on_trigger !== undefined
      ? String(input.agent_on_trigger).trim()
      : undefined;

  if (off === undefined && on === undefined) {
    throw validationError('Indica al menos un comando de control');
  }

  const current = await loadAgentControlTriggers(pool, tenantId);
  const nextOff = off ?? current.agent_off_trigger;
  const nextOn = on ?? current.agent_on_trigger;
  const validationMessage = validateAgentControlTriggers(nextOff, nextOn);
  if (validationMessage) {
    throw validationError(validationMessage);
  }

  const [exists] = await pool.query(
    `SELECT tenant_id FROM tenant_settings WHERE tenant_id = ?`,
    [tenantId]
  );
  if (exists.length === 0) {
    await pool.query(
      `INSERT INTO tenant_settings (tenant_id, agent_off_trigger, agent_on_trigger)
       VALUES (?, ?, ?)`,
      [tenantId, nextOff, nextOn]
    );
  } else {
    await pool.query(
      `UPDATE tenant_settings
       SET agent_off_trigger = ?, agent_on_trigger = ?, updated_at = NOW()
       WHERE tenant_id = ?`,
      [nextOff, nextOn, tenantId]
    );
  }

  return {
    agent_off_trigger: nextOff,
    agent_on_trigger: nextOn,
  };
}
