import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRuntimeWorkflowItem, enrichBookingConfig } from './runtimeService.js';

test('enrichBookingConfig derives placeholder_map from variable_params', () => {
  const config = enrichBookingConfig({
    variable_params: {
      CheckIn: '{{checkin}}',
      CheckOut: '{{checkout}}',
      ad: '{{adults}}',
      NRooms: '{{rooms}}',
    },
    date_format: 'DDMMYYYY',
    supports_rooms: true,
  });

  assert.equal(config.placeholder_map.checkin, '{{checkin}}');
  assert.equal(config.placeholder_map.checkout, '{{checkout}}');
  assert.equal(config.placeholder_map.adults, '{{adults}}');
  assert.equal(config.placeholder_map.rooms, '{{rooms}}');
  assert.ok(Array.isArray(config.required_fields));
  assert.ok(config.required_fields.includes('checkin'));
});

test('enrichBookingConfig parses JSON string input', () => {
  const raw = JSON.stringify({
    variable_params: { ad: '{{adults}}' },
    supports_children: true,
  });
  const config = enrichBookingConfig(raw);
  assert.equal(config.placeholder_map.adults, '{{adults}}');
  assert.equal(config.supports_children, true);
});

test('buildRuntimeWorkflowItem flattens tenant only (no webhook message fields)', () => {
  const tenant = {
    tenant_id: 't1',
    tenant_slug: 'miguel-telefono',
    tenant_db_id: 1,
    tenant_name: 'Miguel',
    tenant_display_name: 'Miguel Tel',
    business_type: 'hotel',
    vertical: 'hotel',
    primary_language: 'es',
    agent_id: 'a1',
    agent_name: 'FAQ',
    initial_greeting: 'Hola',
    booking_url_base: 'https://example.com',
    booking_url_template: 'https://example.com?in={{checkin}}',
    booking_url_mode: 'template',
    validation_status: 'ok',
    confidence_score: 0.9,
    booking_config_json: '{}',
    placeholder_map: { checkin: '{{checkin}}' },
    required_fields: ['checkin'],
    date_format: 'DDMMYYYY',
    supports_rooms: true,
    supports_children: false,
    supports_child_ages: false,
    business_hours: null,
    policies: null,
    whatsapp_phone: '557581477477',
    pause_trigger: '**',
    pause_ttl_seconds: 3600,
    search_limit: 5,
    unanswered_limit: 3,
    faq_search_endpoint: '/api/search',
    unanswered_endpoint: '/api/unanswered',
    evolution_instance_name: 'faqinn_miguel-telefono',
    evolution_api_url: 'https://evo.example',
    evolution_api_key: 'key123',
  };

  const item = buildRuntimeWorkflowItem(tenant);

  assert.equal(item.status, 'ok');
  assert.equal(item.tenant_slug, 'miguel-telefono');
  assert.equal(item.evolution_api_url, 'https://evo.example');
  assert.equal(item.placeholder_map_json, JSON.stringify({ checkin: '{{checkin}}' }));
  assert.equal(item.required_fields_json, JSON.stringify(['checkin']));
  assert.equal('chatInput' in item, false);
  assert.equal('sessionId' in item, false);
  assert.equal('pause_key' in item, false);
  assert.equal(item.search_limit, 5);
  assert.equal(item.faq_search_endpoint, '/api/search');
});
