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

const RULE_NAMES = [
  'Auto-assign new nurses to onboarding cohort',
  'Send compliance reminder when document expires in 30 days',
  'Escalate unresponsive placement requests after 48 hours',
  'Notify manager when nurse completes all certifications',
  'Create follow-up task for failed placement interviews',
  'Add high-priority nurses to fast-track cohort',
  'Trigger alert when facility capacity drops below 20%',
  'Send welcome email to newly registered nurses',
];

const RULE_DESCRIPTIONS = [
  'Automatically assigns nurses who register through the portal to the current onboarding cohort',
  'Sends an email reminder to nurses whose documents are expiring within 30 days',
  'Escalates placement requests that have not received a response within 48 hours to the team lead',
  'Notifies the assigned manager when a nurse completes all required certifications',
  'Creates a follow-up task when a placement interview is marked as failed',
  'Moves nurses with priority score above 85 into the fast-track cohort automatically',
  'Triggers an alert to operations team when facility capacity drops below threshold',
  'Sends a personalized welcome email with onboarding instructions to newly registered nurses',
];

const CONDITION_FIELDS = [
  'nurse.status',
  'nurse.priority_score',
  'document.expiry_date',
  'placement.response_time',
  'nurse.certifications_complete',
  'facility.capacity_percentage',
  'nurse.registration_date',
  'placement.interview_result',
];

const CONDITION_OPERATORS = ['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'within_days'];

const ACTION_TYPES = ['send_email', 'update_status', 'create_task', 'add_to_cohort', 'trigger_alert'];

const TEMPLATE_CATEGORIES = ['onboarding', 'compliance', 'recruitment', 'operations', 'communications'];

const TEMPLATE_NAMES = [
  'New Nurse Onboarding Workflow',
  'Document Expiry Compliance Check',
  'Placement Matching Pipeline',
  'Facility Capacity Alert System',
  'Nurse Engagement Follow-up',
  'Weekly Compliance Report Generator',
];

const TEMPLATE_DESCRIPTIONS = [
  'Complete onboarding automation including welcome emails, document requests, and cohort assignment',
  'Monitors document expiry dates and triggers appropriate compliance actions at configured intervals',
  'Automatically matches qualified nurses to available placements based on skills and preferences',
  'Monitors facility capacity and triggers alerts when thresholds are breached',
  'Engages with nurses who have not interacted with the platform in a configurable period',
  'Generates and distributes weekly compliance reports to configured recipients',
];

const TRIGGER_EVENTS = [
  'nurse.registered',
  'document.expiry_approaching',
  'placement.request_timeout',
  'nurse.certifications_updated',
  'placement.interview_completed',
  'nurse.priority_updated',
  'facility.capacity_changed',
  'cohort.milestone_reached',
];

const ERROR_DETAILS = [
  'Email delivery failed: recipient address bounced',
  'Failed to update status: record locked by another process',
  'Task creation failed: required field missing',
  'Cohort assignment failed: cohort at maximum capacity',
  'Alert delivery timeout: notification service unavailable',
];

const CRON_EXPRESSIONS = [
  '0 9 * * 1-5',
  '0 8 * * *',
  '0 */4 * * *',
  '30 17 * * 5',
  '0 6 * * 1',
  '0 0 1 * *',
  '0 12 * * 3',
  '0 7 * * *',
];

const CRON_DESCRIPTIONS = [
  'Every weekday at 9:00 AM',
  'Daily at 8:00 AM',
  'Every 4 hours',
  'Every Friday at 5:30 PM',
  'Every Monday at 6:00 AM',
  'First day of every month at midnight',
  'Every Wednesday at noon',
  'Daily at 7:00 AM',
];

const TIMEZONES = ['Europe/London', 'America/New_York', 'Europe/Dublin', 'Asia/Kolkata'];

export function seedAutomations() {
  const rand = seededRandom(7777);

  // (a) Automation Rules - 8 rules
  const automationRules = [];
  for (let i = 0; i < 8; i++) {
    const conditionCount = Math.floor(rand() * 2) + 1;
    const conditions = [];
    for (let c = 0; c < conditionCount; c++) {
      const conditionsInGroup = Math.floor(rand() * 2) + 1;
      const groupConditions = [];
      for (let g = 0; g < conditionsInGroup; g++) {
        groupConditions.push({
          field: pick(CONDITION_FIELDS, rand),
          operator: pick(CONDITION_OPERATORS, rand),
          value: String(Math.floor(rand() * 100)),
        });
      }
      conditions.push({
        logic: c === 0 ? 'AND' : pick(['AND', 'OR'], rand),
        conditions: groupConditions,
      });
    }

    const actionCount = Math.floor(rand() * 2) + 1;
    const actions = [];
    for (let a = 0; a < actionCount; a++) {
      const actionType = pick(ACTION_TYPES, rand);
      const params = {};
      if (actionType === 'send_email') {
        params.template = `template-${Math.floor(rand() * 10) + 1}`;
        params.recipient = 'nurse.email';
      } else if (actionType === 'update_status') {
        params.newStatus = pick(['active', 'pending_review', 'escalated', 'completed'], rand);
      } else if (actionType === 'create_task') {
        params.title = pick(['Follow up with nurse', 'Review compliance documents', 'Schedule interview', 'Update records'], rand);
        params.assignee = pick(['team_lead', 'recruiter', 'compliance_officer'], rand);
      } else if (actionType === 'add_to_cohort') {
        params.cohortId = `cohort-${Math.floor(rand() * 5) + 1}`;
      } else if (actionType === 'trigger_alert') {
        params.channel = pick(['email', 'sms', 'in_app'], rand);
        params.severity = pick(['low', 'medium', 'high', 'critical'], rand);
      }
      actions.push({ type: actionType, params });
    }

    const triggerCount = Math.floor(rand() * 500) + 10;
    const successRate = rand() * 0.3 + 0.7;
    const successCount = Math.floor(triggerCount * successRate);

    automationRules.push({
      id: `rule-${String(i + 1).padStart(3, '0')}`,
      name: RULE_NAMES[i],
      description: RULE_DESCRIPTIONS[i],
      enabled: rand() > 0.25,
      priority: Math.floor(rand() * 5) + 1,
      conditions,
      actions,
      createdAt: generateTimestamp(rand, 2024, 2024),
      updatedAt: generateTimestamp(rand, 2025, 2025),
      triggerCount,
      successCount,
      failureCount: triggerCount - successCount,
    });
  }

  // (b) Automation Templates - 6 templates
  const automationTemplates = [];
  for (let i = 0; i < 6; i++) {
    const conditionCount = Math.floor(rand() * 2) + 1;
    const conditions = [];
    for (let c = 0; c < conditionCount; c++) {
      conditions.push({
        field: pick(CONDITION_FIELDS, rand),
        operator: pick(CONDITION_OPERATORS, rand),
        value: `{{parameter_${c + 1}}}`,
      });
    }

    const actionCount = Math.floor(rand() * 2) + 1;
    const actions = [];
    for (let a = 0; a < actionCount; a++) {
      actions.push({
        type: pick(ACTION_TYPES, rand),
        params: { configurable: true },
      });
    }

    const paramCount = Math.floor(rand() * 3) + 1;
    const parameters = [];
    for (let p = 0; p < paramCount; p++) {
      parameters.push({
        name: `parameter_${p + 1}`,
        label: pick(['Threshold Value', 'Days Before Expiry', 'Target Cohort', 'Email Template', 'Alert Severity'], rand),
        type: pick(['number', 'string', 'select', 'boolean'], rand),
        required: rand() > 0.3,
        defaultValue: null,
      });
    }

    automationTemplates.push({
      id: `tmpl-${String(i + 1).padStart(3, '0')}`,
      name: TEMPLATE_NAMES[i],
      description: TEMPLATE_DESCRIPTIONS[i],
      category: pick(TEMPLATE_CATEGORIES, rand),
      conditions,
      actions,
      isActive: rand() > 0.3,
      parameters,
    });
  }

  // (c) Execution Log - 18 entries
  const executionLog = [];
  for (let i = 0; i < 18; i++) {
    const status = pick(['success', 'success', 'success', 'failure', 'skipped'], rand);
    const triggeredAt = generateTimestamp(rand, 2025, 2025);
    const triggeredDate = new Date(triggeredAt);
    const completedDate = new Date(triggeredDate.getTime() + Math.floor(rand() * 30000) + 500);
    const completedAt = completedDate.toISOString().replace(/\.\d{3}Z$/, '').replace(/:\d{2}$/, ':00');

    const ruleIndex = Math.floor(rand() * automationRules.length);
    const actionsExecutedCount = Math.floor(rand() * 3) + 1;
    const actionsExecuted = [];
    for (let a = 0; a < actionsExecutedCount; a++) {
      actionsExecuted.push({
        type: pick(ACTION_TYPES, rand),
        status: status === 'failure' && a === actionsExecutedCount - 1 ? 'failed' : 'completed',
      });
    }

    executionLog.push({
      id: `exec-${String(i + 1).padStart(3, '0')}`,
      ruleId: automationRules[ruleIndex].id,
      ruleName: automationRules[ruleIndex].name,
      triggeredAt,
      completedAt,
      status,
      triggerEvent: pick(TRIGGER_EVENTS, rand),
      actionsExecuted,
      errorDetails: status === 'failure' ? pick(ERROR_DETAILS, rand) : null,
      canRetry: status === 'failure' ? rand() > 0.3 : false,
    });
  }

  // (d) Scheduled Actions - 8 entries
  const scheduledActions = [];
  for (let i = 0; i < 8; i++) {
    const ruleIndex = Math.floor(rand() * automationRules.length);
    scheduledActions.push({
      id: `sched-${String(i + 1).padStart(3, '0')}`,
      ruleId: automationRules[ruleIndex].id,
      ruleName: automationRules[ruleIndex].name,
      cronExpression: CRON_EXPRESSIONS[i],
      nextRunAt: generateTimestamp(rand, 2025, 2025),
      lastRunAt: generateTimestamp(rand, 2025, 2025),
      timezone: pick(TIMEZONES, rand),
      enabled: rand() > 0.2,
      batchSize: Math.floor(rand() * 50) + 10,
      description: CRON_DESCRIPTIONS[i],
    });
  }

  return {
    automationRules,
    automationTemplates,
    executionLog,
    scheduledActions,
  };
}
