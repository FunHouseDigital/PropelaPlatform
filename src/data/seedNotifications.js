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

const CATEGORIES = ['system_alert', 'task_update', 'document_expiry', 'placement_match', 'compliance_warning'];

const SEVERITY_LEVELS = ['info', 'warning', 'critical'];

const CATEGORY_LABELS = {
  system_alert: 'System Alert',
  task_update: 'Task Update',
  document_expiry: 'Document Expiry',
  placement_match: 'Placement Match',
  compliance_warning: 'Compliance Warning',
};

const NOTIFICATION_TITLES = {
  system_alert: [
    'System maintenance scheduled for tonight',
    'New feature: Bulk document upload now available',
    'Database backup completed successfully',
    'API rate limit threshold reached',
    'Server performance degraded - investigating',
    'System update applied successfully',
  ],
  task_update: [
    'Interview task assigned to you',
    'Document review pending your approval',
    'Cohort orientation task completed',
    'Follow-up call overdue by 2 days',
    'Training assessment due this week',
    'Reference check task reassigned',
  ],
  document_expiry: [
    'Passport for Maria Santos expires in 14 days',
    'OET Certificate for James Okonkwo expires tomorrow',
    'Visa document renewal required - Grace Adeyemi',
    'IELTS Certificate expired - Priya Sharma',
    'NMC Decision Letter renewal due in 7 days',
    'DBS Check expiring next month - 3 nurses affected',
  ],
  placement_match: [
    'New placement match: Royal London Hospital',
    'Placement confirmed at Leeds General Infirmary',
    'Interview scheduled - Birmingham NHS Trust',
    'Placement offer pending response from nurse',
    'Start date confirmed for Manchester placement',
    'Multiple matches found for current cohort',
  ],
  compliance_warning: [
    'Compliance score dropped below 75% - Cohort 2024-B',
    '5 nurses missing required vaccinations',
    'Background check renewal overdue - 2 nurses',
    'Training completion rate below threshold',
    'Mandatory training deadline approaching',
    'Compliance audit findings require attention',
  ],
};

const NOTIFICATION_MESSAGES = {
  system_alert: [
    'Scheduled maintenance window: 2:00 AM - 4:00 AM GMT. Some features may be temporarily unavailable.',
    'You can now upload multiple documents at once. Check the Documents section for the new bulk upload button.',
    'Nightly database backup completed without errors. All data is secure.',
    'API usage has reached 80% of the hourly limit. Consider spreading requests over time.',
    'We are investigating reports of slow page loads. Updates will be posted here.',
    'Version 2.4.1 has been deployed. See release notes for details on improvements.',
  ],
  task_update: [
    'You have been assigned to conduct an interview with a candidate. Please review their profile and schedule accordingly.',
    'A document has been submitted and requires your review. Please approve or request changes.',
    'The cohort orientation session has been marked as complete by the coordinator.',
    'A follow-up call was due 2 days ago. Please complete it or reassign to another team member.',
    'Training assessments for 3 nurses in your cohort are due by end of this week.',
    'A reference check task has been reassigned to you due to team capacity changes.',
  ],
  document_expiry: [
    'The passport will expire soon. Please contact the nurse to submit a renewed copy before the deadline.',
    'Certificate expires tomorrow. Immediate action required to maintain compliance status.',
    'Visa documents need renewal. The nurse has been notified but has not yet responded.',
    'The certificate has expired. The nurse cannot proceed to the next stage until this is resolved.',
    'Decision letter renewal is due within 7 days. Automated reminder has been sent to the nurse.',
    'DBS checks for multiple nurses are approaching expiry. Review the compliance dashboard for details.',
  ],
  placement_match: [
    'A new placement opportunity has been matched based on skills, location preferences, and availability.',
    'The placement has been formally confirmed. Contract documents are being prepared.',
    'An interview has been scheduled with the facility. Preparation materials have been shared with the nurse.',
    'The nurse has received a placement offer but has not yet responded. Follow up recommended.',
    'The start date has been confirmed by the facility. Onboarding preparation should begin.',
    'The matching algorithm has identified multiple suitable placements for nurses in the current cohort.',
  ],
  compliance_warning: [
    'Overall compliance percentage has fallen below the configured threshold of 75%. Review required.',
    'Vaccination records are missing or expired for 5 nurses. This may affect placement eligibility.',
    'Background check renewals are overdue. These must be completed before nurses can continue placements.',
    'Training completion rate is below the 90% threshold. Follow up with incomplete nurses.',
    'Mandatory training modules must be completed within 5 days. 8 nurses have not started.',
    'Recent compliance audit identified 3 areas requiring immediate corrective action.',
  ],
};

const DELIVERY_CHANNELS = ['in_app', 'email', 'sms'];

function generateRelativeTimestamp(rand, group) {
  const now = new Date();
  let date;

  switch (group) {
    case 'today': {
      const hoursAgo = Math.floor(rand() * 12) + 1;
      date = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
      break;
    }
    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(Math.floor(rand() * 24), Math.floor(rand() * 60), 0, 0);
      date = yesterday;
      break;
    }
    case 'this_week': {
      const daysAgo = Math.floor(rand() * 5) + 2;
      date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      date.setHours(Math.floor(rand() * 24), Math.floor(rand() * 60), 0, 0);
      break;
    }
    case 'older': {
      const daysAgo = Math.floor(rand() * 21) + 8;
      date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      date.setHours(Math.floor(rand() * 24), Math.floor(rand() * 60), 0, 0);
      break;
    }
    default:
      date = now;
  }

  return date.toISOString();
}

export function seedNotifications() {
  const rand = seededRandom(1500);
  const notificationAlerts = [];
  const notificationLog = [];

  // Generate notifications spread across time groups
  const groups = [
    { name: 'today', count: 5 },
    { name: 'yesterday', count: 6 },
    { name: 'this_week', count: 10 },
    { name: 'older', count: 14 },
  ];

  let idx = 0;
  groups.forEach((group) => {
    for (let i = 0; i < group.count; i++) {
      idx++;
      const category = pick(CATEGORIES, rand);
      const severity = pick(SEVERITY_LEVELS, rand);
      const titleIdx = Math.floor(rand() * NOTIFICATION_TITLES[category].length);
      const msgIdx = Math.floor(rand() * NOTIFICATION_MESSAGES[category].length);

      const notification = {
        id: `notif-alert-${String(idx).padStart(4, '0')}`,
        category,
        categoryLabel: CATEGORY_LABELS[category],
        severity,
        title: NOTIFICATION_TITLES[category][titleIdx],
        message: NOTIFICATION_MESSAGES[category][msgIdx],
        timestamp: generateRelativeTimestamp(rand, group.name),
        read: group.name === 'older' ? rand() > 0.3 : rand() > 0.6,
        actionUrl: rand() > 0.5 ? '/notifications' : null,
        source: pick(['system', 'automation', 'user_action', 'scheduled'], rand),
      };

      notificationAlerts.push(notification);
    }
  });

  // Sort by timestamp descending
  notificationAlerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Generate alert configuration rules
  const notifAlertConfig = {
    rules: [
      {
        id: 'config-rule-001',
        category: 'system_alert',
        label: 'System Alerts',
        enabled: true,
        severity: 'info',
        channels: ['in_app'],
        description: 'Notifications for system maintenance, updates, and performance issues',
      },
      {
        id: 'config-rule-002',
        category: 'task_update',
        label: 'Task Updates',
        enabled: true,
        severity: 'info',
        channels: ['in_app', 'email'],
        description: 'Notifications when tasks are assigned, completed, or overdue',
      },
      {
        id: 'config-rule-003',
        category: 'document_expiry',
        label: 'Document Expiry',
        enabled: true,
        severity: 'warning',
        channels: ['in_app', 'email', 'sms'],
        description: 'Alerts when documents are approaching or past their expiry dates',
      },
      {
        id: 'config-rule-004',
        category: 'placement_match',
        label: 'Placement Matches',
        enabled: true,
        severity: 'info',
        channels: ['in_app', 'email'],
        description: 'Notifications when new placement opportunities are matched',
      },
      {
        id: 'config-rule-005',
        category: 'compliance_warning',
        label: 'Compliance Warnings',
        enabled: true,
        severity: 'critical',
        channels: ['in_app', 'email', 'sms'],
        description: 'Critical alerts for compliance issues requiring immediate attention',
      },
    ],
    quietHours: {
      enabled: false,
      startTime: '22:00',
      endTime: '07:00',
      timezone: 'Europe/London',
      exceptCritical: true,
    },
  };

  // Generate notification history log (past 30 days)
  for (let i = 0; i < 60; i++) {
    const category = pick(CATEGORIES, rand);
    const severity = pick(SEVERITY_LEVELS, rand);
    const titleIdx = Math.floor(rand() * NOTIFICATION_TITLES[category].length);
    const daysAgo = Math.floor(rand() * 30);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    date.setHours(Math.floor(rand() * 24), Math.floor(rand() * 60), 0, 0);

    notificationLog.push({
      id: `notif-log-${String(i + 1).padStart(4, '0')}`,
      category,
      categoryLabel: CATEGORY_LABELS[category],
      severity,
      title: NOTIFICATION_TITLES[category][titleIdx],
      timestamp: date.toISOString(),
      channel: pick(DELIVERY_CHANNELS, rand),
      status: pick(['delivered', 'read', 'dismissed', 'actioned'], rand),
      source: pick(['system', 'automation', 'user_action', 'scheduled'], rand),
    });
  }

  // Sort log by timestamp descending
  notificationLog.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Toast preferences
  const toastPreferences = {
    enabled: true,
    duration: 5000,
    maxVisible: 3,
    position: 'top-right',
    showForCategories: ['system_alert', 'task_update', 'document_expiry', 'placement_match', 'compliance_warning'],
    playSoundOnCritical: true,
  };

  return {
    notificationAlerts,
    notifAlertConfig,
    notificationLog,
    toastPreferences,
  };
}
