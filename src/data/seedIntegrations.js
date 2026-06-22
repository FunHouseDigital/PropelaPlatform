// Deterministic pseudo-random using a seed
function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 4294967296;
  };
}

function pick(arr, rand) {
  return arr[Math.floor(rand() * arr.length)];
}

function generateTimestamp(rand, yearStart, yearEnd) {
  const year = Math.floor(rand() * (yearEnd - yearStart + 1)) + yearStart;
  const month = Math.floor(rand() * 12) + 1;
  const day = Math.floor(rand() * 28) + 1;
  const hour = Math.floor(rand() * 24);
  const minute = Math.floor(rand() * 60);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

function generateApiKey(rand) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'pk_live_';
  for (let i = 0; i < 32; i++) {
    key += chars[Math.floor(rand() * chars.length)];
  }
  return key;
}

function generateWebhookSecret(rand) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let secret = 'whsec_';
  for (let i = 0; i < 24; i++) {
    secret += chars[Math.floor(rand() * chars.length)];
  }
  return secret;
}

const KEY_STATUSES = ['active', 'active', 'active', 'revoked', 'expired'];
const WEBHOOK_STATUSES = ['active', 'active', 'active', 'inactive', 'paused'];
const DELIVERY_STATUSES = ['delivered', 'delivered', 'delivered', 'failed', 'pending'];
const INTEGRATION_STATUSES = ['connected', 'connected', 'disconnected', 'error'];
const SYNC_STATUSES = ['success', 'success', 'success', 'in_progress', 'failed'];

const WEBHOOK_EVENTS = [
  'nurse.created',
  'nurse.updated',
  'nurse.status_changed',
  'placement.created',
  'placement.completed',
  'document.uploaded',
  'document.verified',
  'compliance.alert',
  'cohort.milestone',
  'communication.sent',
];

const SYNC_FREQUENCIES = ['real-time', 'every_5_minutes', 'every_15_minutes', 'hourly', 'daily'];

export function seedIntegrations() {
  const rand = seededRandom(1337);

  // (a) API Endpoints
  const apiEndpoints = [
    { id: 'ep-001', method: 'GET', path: '/api/v1/nurses', description: 'List all nurses with optional filters', status: 'active', responseDelay: Math.floor(rand() * 200) + 50, errorRate: parseFloat((rand() * 0.05).toFixed(3)) },
    { id: 'ep-002', method: 'GET', path: '/api/v1/nurses/:id', description: 'Get a single nurse by ID', status: 'active', responseDelay: Math.floor(rand() * 150) + 30, errorRate: parseFloat((rand() * 0.02).toFixed(3)) },
    { id: 'ep-003', method: 'POST', path: '/api/v1/nurses', description: 'Create a new nurse record', status: 'active', responseDelay: Math.floor(rand() * 300) + 100, errorRate: parseFloat((rand() * 0.08).toFixed(3)) },
    { id: 'ep-004', method: 'PUT', path: '/api/v1/nurses/:id', description: 'Update an existing nurse record', status: 'active', responseDelay: Math.floor(rand() * 250) + 80, errorRate: parseFloat((rand() * 0.06).toFixed(3)) },
    { id: 'ep-005', method: 'DELETE', path: '/api/v1/nurses/:id', description: 'Delete a nurse record', status: 'deprecated', responseDelay: Math.floor(rand() * 200) + 60, errorRate: parseFloat((rand() * 0.03).toFixed(3)) },
    { id: 'ep-006', method: 'GET', path: '/api/v1/placements', description: 'List all placements', status: 'active', responseDelay: Math.floor(rand() * 180) + 40, errorRate: parseFloat((rand() * 0.04).toFixed(3)) },
    { id: 'ep-007', method: 'POST', path: '/api/v1/placements', description: 'Create a new placement', status: 'active', responseDelay: Math.floor(rand() * 350) + 120, errorRate: parseFloat((rand() * 0.07).toFixed(3)) },
    { id: 'ep-008', method: 'GET', path: '/api/v1/documents', description: 'List all documents with status filters', status: 'active', responseDelay: Math.floor(rand() * 200) + 50, errorRate: parseFloat((rand() * 0.03).toFixed(3)) },
    { id: 'ep-009', method: 'POST', path: '/api/v1/documents/upload', description: 'Upload a new document', status: 'beta', responseDelay: Math.floor(rand() * 500) + 200, errorRate: parseFloat((rand() * 0.1).toFixed(3)) },
    { id: 'ep-010', method: 'GET', path: '/api/v1/communications', description: 'List communication history', status: 'active', responseDelay: Math.floor(rand() * 160) + 40, errorRate: parseFloat((rand() * 0.02).toFixed(3)) },
    { id: 'ep-011', method: 'POST', path: '/api/v1/communications/send', description: 'Send a new communication', status: 'active', responseDelay: Math.floor(rand() * 400) + 150, errorRate: parseFloat((rand() * 0.09).toFixed(3)) },
    { id: 'ep-012', method: 'GET', path: '/api/v1/cohorts', description: 'List all cohorts with progress data', status: 'active', responseDelay: Math.floor(rand() * 170) + 45, errorRate: parseFloat((rand() * 0.03).toFixed(3)) },
  ];

  // (b) API Keys
  const apiKeys = [];
  const keyNames = ['Production API Key', 'Staging API Key', 'Development Key', 'Mobile App Key', 'Webhook Service Key'];
  for (let i = 0; i < keyNames.length; i++) {
    apiKeys.push({
      id: `key-${String(i + 1).padStart(3, '0')}`,
      name: keyNames[i],
      key: generateApiKey(rand),
      status: pick(KEY_STATUSES, rand),
      created: generateTimestamp(rand, 2024, 2025),
      lastUsed: generateTimestamp(rand, 2025, 2025),
    });
  }

  // (c) Webhooks
  const webhooks = [];
  const webhookUrls = [
    'https://hooks.example.com/propela/nurses',
    'https://api.nhsjobs.co.uk/webhooks/receive',
    'https://internal.propela.io/events/placements',
    'https://compliance.propela.io/hooks/documents',
    'https://notifications.propela.io/webhook/alerts',
  ];
  for (let i = 0; i < webhookUrls.length; i++) {
    const eventCount = Math.floor(rand() * 3) + 1;
    const events = [];
    for (let e = 0; e < eventCount; e++) {
      const event = pick(WEBHOOK_EVENTS, rand);
      if (!events.includes(event)) {
        events.push(event);
      }
    }
    webhooks.push({
      id: `wh-${String(i + 1).padStart(3, '0')}`,
      url: webhookUrls[i],
      events,
      secret: generateWebhookSecret(rand),
      status: pick(WEBHOOK_STATUSES, rand),
      createdAt: generateTimestamp(rand, 2024, 2025),
    });
  }

  // (d) Webhook Delivery Log
  const webhookDeliveryLog = [];
  for (let i = 0; i < 15; i++) {
    const status = pick(DELIVERY_STATUSES, rand);
    webhookDeliveryLog.push({
      id: `del-${String(i + 1).padStart(3, '0')}`,
      webhookId: pick(webhooks, rand).id,
      event: pick(WEBHOOK_EVENTS, rand),
      status,
      timestamp: generateTimestamp(rand, 2025, 2025),
      responseCode: status === 'delivered' ? 200 : status === 'failed' ? pick([500, 502, 503, 408], rand) : null,
      payload: { type: pick(WEBHOOK_EVENTS, rand), data: { id: `record-${Math.floor(rand() * 1000)}` } },
    });
  }

  // (e) Integrations
  const integrations = [
    {
      id: 'int-001',
      name: 'NHS Jobs',
      provider: 'NHS Digital',
      status: pick(INTEGRATION_STATUSES, rand),
      apiKey: generateApiKey(rand),
      syncFrequency: pick(SYNC_FREQUENCIES, rand),
      lastSync: generateTimestamp(rand, 2025, 2025),
      syncHistory: generateSyncHistory(rand, 8),
    },
    {
      id: 'int-002',
      name: 'NMC Online',
      provider: 'Nursing & Midwifery Council',
      status: pick(INTEGRATION_STATUSES, rand),
      apiKey: generateApiKey(rand),
      syncFrequency: pick(SYNC_FREQUENCIES, rand),
      lastSync: generateTimestamp(rand, 2025, 2025),
      syncHistory: generateSyncHistory(rand, 6),
    },
    {
      id: 'int-003',
      name: 'DBS Check Service',
      provider: 'Disclosure and Barring Service',
      status: pick(INTEGRATION_STATUSES, rand),
      apiKey: generateApiKey(rand),
      syncFrequency: pick(SYNC_FREQUENCIES, rand),
      lastSync: generateTimestamp(rand, 2025, 2025),
      syncHistory: generateSyncHistory(rand, 5),
    },
    {
      id: 'int-004',
      name: 'Visa Tracking',
      provider: 'UK Visas & Immigration',
      status: pick(INTEGRATION_STATUSES, rand),
      apiKey: generateApiKey(rand),
      syncFrequency: pick(SYNC_FREQUENCIES, rand),
      lastSync: generateTimestamp(rand, 2025, 2025),
      syncHistory: generateSyncHistory(rand, 7),
    },
  ];

  // (f) Sync Status
  const syncStatus = {};
  for (const integration of integrations) {
    syncStatus[integration.id] = {
      lastSync: integration.lastSync,
      status: pick(SYNC_STATUSES, rand),
      conflicts: Math.floor(rand() * 5),
    };
  }

  return {
    apiEndpoints,
    apiKeys,
    webhooks,
    webhookDeliveryLog,
    integrations,
    syncStatus,
  };
}

function generateSyncHistory(rand, count) {
  const history = [];
  for (let i = 0; i < count; i++) {
    history.push({
      timestamp: generateTimestamp(rand, 2025, 2025),
      status: pick(SYNC_STATUSES, rand),
      recordsSynced: Math.floor(rand() * 150) + 10,
      errors: Math.floor(rand() * 3),
    });
  }
  return history;
}
