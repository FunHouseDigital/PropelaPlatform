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

function generateIpAddress(rand) {
  return `192.168.${Math.floor(rand() * 256)}.${Math.floor(rand() * 256)}`;
}

const USERS = [
  'Aya Rahman',
  'James Mitchell',
  'Sarah Chen',
  'David Okonkwo',
  'Emily Watson',
  'Michael Brown',
  'Priya Patel',
  'Thomas Wilson',
];

const ACTIONS = [
  'nurse.created',
  'nurse.updated',
  'nurse.status_changed',
  'document.uploaded',
  'document.verified',
  'document.expired',
  'placement.assigned',
  'placement.completed',
  'placement.cancelled',
  'cohort.created',
  'cohort.updated',
  'communication.sent',
  'communication.received',
  'settings.updated',
  'user.login',
  'user.logout',
];

const ENTITY_TYPES = ['nurse', 'placement', 'document', 'cohort', 'communication'];

const ENTITY_NAMES = [
  'Grace Okafor',
  'Fatima Al-Hassan',
  'Chen Wei',
  'Mary Nwosu',
  'Placement #P-2401',
  'Placement #P-2402',
  'DBS Certificate',
  'NMC Registration',
  'Visa Document',
  'Cohort Alpha 2025',
  'Cohort Beta 2025',
  'Welcome Email',
  'Compliance Alert',
];

const SEVERITIES = ['info', 'info', 'info', 'info', 'warning', 'warning', 'critical'];

const SESSION_STATUSES = ['active', 'active', 'idle', 'expired'];

const ROLES = ['Admin', 'Manager', 'Recruiter', 'Compliance Officer', 'Viewer'];

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/17.2',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Firefox/121.0',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2) Mobile/15E148',
  'Mozilla/5.0 (Linux; Android 14) Chrome/120.0.6099.43',
];

const CHANGE_TYPES = ['create', 'update', 'update', 'update', 'delete'];

const FIELD_CHANGES = [
  { field: 'status', oldValue: 'pending', newValue: 'active' },
  { field: 'status', oldValue: 'active', newValue: 'inactive' },
  { field: 'email', oldValue: 'old@example.com', newValue: 'new@example.com' },
  { field: 'phone', oldValue: '+44 7700 900111', newValue: '+44 7700 900222' },
  { field: 'role', oldValue: 'Viewer', newValue: 'Manager' },
  { field: 'assignedFacility', oldValue: 'London General', newValue: 'Manchester Royal' },
  { field: 'expiryDate', oldValue: '2024-12-31', newValue: '2025-12-31' },
  { field: 'compliance', oldValue: 'pending', newValue: 'verified' },
  { field: 'name', oldValue: 'J. Smith', newValue: 'Jane Smith' },
  { field: 'cohort', oldValue: 'Alpha 2024', newValue: 'Beta 2025' },
  { field: 'priority', oldValue: 'normal', newValue: 'high' },
  { field: 'notes', oldValue: '', newValue: 'Updated contact information' },
];

const AUDIT_DETAILS = [
  'User logged in successfully',
  'Updated nurse compliance status',
  'Document verification completed',
  'New placement created and assigned',
  'Cohort milestone reached',
  'Communication template modified',
  'Settings configuration changed',
  'Failed login attempt detected',
  'API key regenerated',
  'Webhook endpoint updated',
  'Bulk import completed (15 records)',
  'Report generated and exported',
  'User permissions modified',
  'Data export requested',
  'System backup completed',
  'Integration sync triggered manually',
];

export function seedAuditTrail() {
  const rand = seededRandom(4242);

  // (a) Activity Feed - 55 entries
  const activityFeed = [];
  for (let i = 0; i < 55; i++) {
    const entityType = pick(ENTITY_TYPES, rand);
    const action = pick(ACTIONS, rand);
    const beforeStatus = pick(['pending', 'active', 'draft', 'in_progress'], rand);
    const afterStatus = pick(['active', 'completed', 'verified', 'approved'], rand);
    activityFeed.push({
      id: `af-${String(i + 1).padStart(3, '0')}`,
      timestamp: generateTimestamp(rand, 2025, 2025),
      user: pick(USERS, rand),
      action,
      entityType,
      entityId: `${entityType.substring(0, 3)}-${String(Math.floor(rand() * 900) + 100).padStart(4, '0')}`,
      entityName: pick(ENTITY_NAMES, rand),
      details: {
        before: { status: beforeStatus },
        after: { status: afterStatus },
      },
      ipAddress: generateIpAddress(rand),
    });
  }

  // (b) Audit Log - 85 entries
  const auditLog = [];
  for (let i = 0; i < 85; i++) {
    auditLog.push({
      id: `al-${String(i + 1).padStart(3, '0')}`,
      timestamp: generateTimestamp(rand, 2025, 2025),
      user: pick(USERS, rand),
      action: pick(ACTIONS, rand),
      entityType: pick(ENTITY_TYPES, rand),
      entityId: `ent-${String(Math.floor(rand() * 9000) + 1000)}`,
      ipAddress: generateIpAddress(rand),
      details: pick(AUDIT_DETAILS, rand),
      severity: pick(SEVERITIES, rand),
    });
  }

  // (c) User Sessions - 10 entries
  const userSessions = [];
  for (let i = 0; i < 10; i++) {
    const loginTime = generateTimestamp(rand, 2025, 2025);
    // Ensure lastActivity is after loginTime by adding a random offset (1-480 minutes)
    const loginDate = new Date(loginTime);
    const offsetMinutes = Math.floor(rand() * 480) + 1;
    const lastActivityDate = new Date(loginDate.getTime() + offsetMinutes * 60000);
    const lastActivity = lastActivityDate.toISOString().replace(/\.\d{3}Z$/, '').replace(/:\d{2}$/, ':00');
    userSessions.push({
      id: `sess-${String(i + 1).padStart(3, '0')}`,
      userId: `user-${String(i + 1).padStart(3, '0')}`,
      userName: pick(USERS, rand),
      role: pick(ROLES, rand),
      loginTime,
      lastActivity,
      ipAddress: generateIpAddress(rand),
      userAgent: pick(USER_AGENTS, rand),
      status: pick(SESSION_STATUSES, rand),
    });
  }

  // (d) Change History - 35 entries
  const changeHistory = [];
  for (let i = 0; i < 35; i++) {
    const entityType = pick(ENTITY_TYPES, rand);
    const changeCount = Math.floor(rand() * 3) + 1;
    const changes = [];
    for (let c = 0; c < changeCount; c++) {
      const change = pick(FIELD_CHANGES, rand);
      changes.push({
        field: change.field,
        oldValue: change.oldValue,
        newValue: change.newValue,
      });
    }
    changeHistory.push({
      id: `ch-${String(i + 1).padStart(3, '0')}`,
      entityType,
      entityId: `${entityType.substring(0, 3)}-${String(Math.floor(rand() * 900) + 100).padStart(4, '0')}`,
      entityName: pick(ENTITY_NAMES, rand),
      timestamp: generateTimestamp(rand, 2025, 2025),
      user: pick(USERS, rand),
      changes,
      changeType: pick(CHANGE_TYPES, rand),
    });
  }

  return {
    activityFeed,
    auditLog,
    userSessions,
    changeHistory,
  };
}
