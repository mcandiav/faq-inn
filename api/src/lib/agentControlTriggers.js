export const DEFAULT_AGENT_OFF_TRIGGER = '**';
export const DEFAULT_AGENT_ON_TRIGGER = '##';

export function normalizeAgentControlTrigger(value) {
  return String(value ?? '').trim();
}

export function validateAgentControlTriggers(agentOffTrigger, agentOnTrigger) {
  const off = normalizeAgentControlTrigger(agentOffTrigger);
  const on = normalizeAgentControlTrigger(agentOnTrigger);

  if (off.length !== 2) {
    return 'agent_off_trigger debe tener exactamente 2 caracteres';
  }
  if (on.length !== 2) {
    return 'agent_on_trigger debe tener exactamente 2 caracteres';
  }
  if (off === on) {
    return 'agent_off_trigger y agent_on_trigger deben ser distintos';
  }

  return null;
}

export function resolveControlAction({
  message,
  fromMe,
  agentOffTrigger,
  agentOnTrigger,
}) {
  if (!fromMe) {
    return 'none';
  }

  const text = String(message ?? '').trim();
  const off = normalizeAgentControlTrigger(agentOffTrigger);
  const on = normalizeAgentControlTrigger(agentOnTrigger);

  if (text === off) {
    return 'suspend';
  }
  if (text === on) {
    return 'resume';
  }

  return 'none';
}
