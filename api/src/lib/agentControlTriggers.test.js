import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_AGENT_OFF_TRIGGER,
  DEFAULT_AGENT_ON_TRIGGER,
  resolveControlAction,
  validateAgentControlTriggers,
} from './agentControlTriggers.js';

test('defaults use ** for off and ## for on', () => {
  assert.equal(DEFAULT_AGENT_OFF_TRIGGER, '**');
  assert.equal(DEFAULT_AGENT_ON_TRIGGER, '##');
});

test('validateAgentControlTriggers rejects invalid pairs', () => {
  assert.equal(validateAgentControlTriggers('**', '##'), null);
  assert.match(validateAgentControlTriggers('*', '##'), /2 caracteres/);
  assert.match(validateAgentControlTriggers('**', '**'), /distintos/);
});

test('resolveControlAction only matches exact tenant-side commands', () => {
  assert.equal(
    resolveControlAction({
      message: '**',
      fromMe: true,
      agentOffTrigger: '**',
      agentOnTrigger: '##',
    }),
    'suspend'
  );
  assert.equal(
    resolveControlAction({
      message: '##',
      fromMe: true,
      agentOffTrigger: '**',
      agentOnTrigger: '##',
    }),
    'resume'
  );
  assert.equal(
    resolveControlAction({
      message: '** hola',
      fromMe: true,
      agentOffTrigger: '**',
      agentOnTrigger: '##',
    }),
    'none'
  );
  assert.equal(
    resolveControlAction({
      message: '**',
      fromMe: false,
      agentOffTrigger: '**',
      agentOnTrigger: '##',
    }),
    'none'
  );
});
