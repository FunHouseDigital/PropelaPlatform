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

function generateDate(rand, yearStart, yearEnd) {
  const year = Math.floor(rand() * (yearEnd - yearStart + 1)) + yearStart;
  const month = Math.floor(rand() * 12) + 1;
  const day = Math.floor(rand() * 28) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function generateTimestamp(rand, yearStart, yearEnd) {
  const date = generateDate(rand, yearStart, yearEnd);
  const hour = Math.floor(rand() * 24);
  const minute = Math.floor(rand() * 60);
  return `${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
}

const COMMUNICATION_CHANNELS = ['Email', 'WhatsApp', 'Phone Call', 'SMS'];

const COMMUNICATION_TYPES = [
  'Outreach',
  'Follow-up',
  'Document Request',
  'Status Update',
  'Placement Update',
  'Training Reminder',
  'Welcome Message',
  'General Inquiry',
];

const COMMUNICATION_SUBJECTS = [
  'Application status update',
  'Document submission reminder',
  'Welcome to Propela',
  'OET preparation resources',
  'Cohort placement confirmation',
  'Interview scheduling',
  'Reference request follow-up',
  'Compliance checklist reminder',
  'Training schedule notification',
  'Visa document requirements',
  'NMC registration update',
  'Placement offer details',
  'Contract review reminder',
  'Onboarding information',
  'Monthly progress check-in',
];

const COMMUNICATION_NOTES = [
  'Discussed application timeline and next steps',
  'Nurse confirmed receipt of documents',
  'Left voicemail, will try again tomorrow',
  'Sent links to preparation materials',
  'Confirmed attendance for next training session',
  'Requested additional reference from previous employer',
  'Updated nurse on visa processing timeline',
  'Nurse asked about accommodation options',
  'Provided guidance on NMC registration process',
  'Discussed placement preferences and availability',
  'Nurse confirmed document upload is pending',
  'Reminded about upcoming OET exam date',
  'Shared cohort start date details',
  'Discussed compliance requirements',
  'Nurse requested schedule change',
];

const NOTIFICATION_TYPES = ['document_expiry', 'compliance_alert', 'pipeline_change', 'placement_update'];

const NOTIFICATION_TITLES = {
  document_expiry: [
    'Passport expiring soon',
    'OET Certificate expires in 30 days',
    'Visa documents need renewal',
    'IELTS Certificate expiring',
    'NMC Decision Letter renewal due',
  ],
  compliance_alert: [
    'Compliance score dropped below 80%',
    'Missing required documents detected',
    'Verification overdue for 3 nurses',
    'Compliance audit due next week',
    'Background check renewal required',
  ],
  pipeline_change: [
    'Nurse moved to Shortlisted stage',
    'New applicant entered pipeline',
    'Nurse selected for cohort',
    'Candidate marked as Reserve',
    'Nurse completed training phase',
  ],
  placement_update: [
    'New placement offer available',
    'Placement confirmed at NHS Trust',
    'Start date updated for placement',
    'Placement interview scheduled',
    'Placement contract ready for review',
  ],
};

const NOTIFICATION_DESCRIPTIONS = {
  document_expiry: [
    'Document will expire within the next 30 days. Please request an updated copy.',
    'Expiry date approaching. Nurse has been notified to upload a new version.',
    'Document is past the renewal threshold. Immediate action required.',
    'Automatic alert triggered based on expiry date configuration.',
    'Consider sending a reminder to the nurse to update this document.',
  ],
  compliance_alert: [
    'Overall compliance percentage has fallen below the configured threshold.',
    'One or more required documents are missing from the nurse profile.',
    'Pending verifications have exceeded the expected turnaround time.',
    'Scheduled compliance review is due. Please review all pending items.',
    'Background check validity period has elapsed. Renewal process needed.',
  ],
  pipeline_change: [
    'Pipeline stage has been updated. Review the nurse profile for details.',
    'A new application has been received and added to the pipeline.',
    'Nurse has been confirmed for the upcoming cohort. Notify relevant team.',
    'Candidate placed on reserve list pending available slots.',
    'Training milestones have been completed. Ready for next assessment.',
  ],
  placement_update: [
    'A new placement opportunity has been matched to a qualified nurse.',
    'Placement has been formally confirmed. Contract generation in progress.',
    'The planned start date has been modified. Please update related parties.',
    'Interview with the facility has been scheduled. Prepare the nurse.',
    'Contract documents have been generated and are ready for nurse review.',
  ],
};

const ALERT_RULE_TYPES = [
  { trigger: 'document_expiry', label: 'Document Expiry Warning', field: 'days_before', defaultValue: 30 },
  { trigger: 'compliance_drop', label: 'Compliance Score Drop', field: 'threshold_percent', defaultValue: 80 },
  { trigger: 'verification_overdue', label: 'Verification Overdue', field: 'days_overdue', defaultValue: 7 },
  { trigger: 'pipeline_stagnant', label: 'Pipeline Stage Stagnant', field: 'days_inactive', defaultValue: 14 },
  { trigger: 'placement_pending', label: 'Placement Pending Response', field: 'days_waiting', defaultValue: 5 },
  { trigger: 'training_missed', label: 'Training Session Missed', field: 'sessions_missed', defaultValue: 2 },
];

const EMAIL_TEMPLATE_CATEGORIES = ['Welcome', 'Status Update', 'Document Request', 'Placement Confirmation'];

export function seedCommunications() {
  const rand = seededRandom(777);
  const communications = [];
  const notifications = [];
  const emailTemplates = [];
  const alertRules = [];

  // Generate communications (per-nurse history)
  const nurseCount = 67;
  let commIndex = 0;

  for (let i = 0; i < nurseCount; i++) {
    const nurseId = `nurse-${String(i + 1).padStart(3, '0')}`;
    const numComms = Math.floor(rand() * 5) + 1; // 1-5 communications per nurse

    for (let c = 0; c < numComms; c++) {
      commIndex++;
      communications.push({
        id: `comm-${String(commIndex).padStart(4, '0')}`,
        nurseId,
        channel: pick(COMMUNICATION_CHANNELS, rand),
        type: pick(COMMUNICATION_TYPES, rand),
        subject: pick(COMMUNICATION_SUBJECTS, rand),
        notes: pick(COMMUNICATION_NOTES, rand),
        date: generateTimestamp(rand, 2024, 2025),
        direction: rand() > 0.4 ? 'outbound' : 'inbound',
        status: pick(['sent', 'delivered', 'read', 'replied'], rand),
        linkedEvent: rand() > 0.7 ? `event-${String(Math.floor(rand() * 20) + 1).padStart(3, '0')}` : null,
      });
    }
  }

  // Generate notifications
  let notifIndex = 0;
  for (let i = 0; i < 40; i++) {
    notifIndex++;
    const type = pick(NOTIFICATION_TYPES, rand);
    notifications.push({
      id: `notif-${String(notifIndex).padStart(4, '0')}`,
      type,
      title: pick(NOTIFICATION_TITLES[type], rand),
      description: pick(NOTIFICATION_DESCRIPTIONS[type], rand),
      timestamp: generateTimestamp(rand, 2025, 2025),
      read: rand() > 0.4,
      nurseId: `nurse-${String(Math.floor(rand() * nurseCount) + 1).padStart(3, '0')}`,
      actionUrl: null,
      priority: pick(['low', 'medium', 'high'], rand),
    });
  }

  // Generate email templates
  const templateDefs = [
    {
      category: 'Welcome',
      name: 'Welcome to Propela',
      subject: 'Welcome to Propela, {{nurse_name}}!',
      body: 'Dear {{nurse_name}},\n\nWelcome to the Propela nursing placement programme! We are thrilled to have you join us.\n\nYour application has been received and you have been assigned to {{cohort}}. Your programme is scheduled to begin on {{start_date}}.\n\nPlease log in to your portal to complete your profile and upload required documents.\n\nIf you have any questions, do not hesitate to reach out.\n\nBest regards,\nThe Propela Team',
    },
    {
      category: 'Welcome',
      name: 'Cohort Assignment Notification',
      subject: 'You have been assigned to {{cohort}}',
      body: 'Dear {{nurse_name}},\n\nGreat news! You have been assigned to {{cohort}} starting on {{start_date}}.\n\nHere are your next steps:\n1. Complete all outstanding document uploads\n2. Review the training schedule\n3. Confirm your availability for the start date\n\nPlease contact us if you have any questions about the programme.\n\nKind regards,\nPropela Admissions Team',
    },
    {
      category: 'Status Update',
      name: 'Application Status Update',
      subject: 'Update on your application - {{nurse_name}}',
      body: 'Dear {{nurse_name}},\n\nWe wanted to update you on the progress of your application.\n\nCurrent Status: {{status}}\nLast Updated: {{update_date}}\n\n{{status_details}}\n\nIf you have any questions about your application status, please do not hesitate to contact us.\n\nBest regards,\nPropela Recruitment Team',
    },
    {
      category: 'Status Update',
      name: 'Pipeline Stage Change',
      subject: 'Your application has progressed - {{nurse_name}}',
      body: 'Dear {{nurse_name}},\n\nCongratulations! Your application has moved to the next stage.\n\nPrevious Stage: {{previous_stage}}\nNew Stage: {{new_stage}}\n\nWhat this means:\n{{stage_description}}\n\nNext steps:\n{{next_steps}}\n\nKeep up the great work!\n\nBest regards,\nPropela Team',
    },
    {
      category: 'Document Request',
      name: 'Document Upload Reminder',
      subject: 'Action Required: Please upload {{document_type}}',
      body: 'Dear {{nurse_name}},\n\nWe noticed that the following document is still pending:\n\nDocument: {{document_type}}\nDeadline: {{deadline}}\n\nPlease upload this document as soon as possible to avoid delays in your application processing.\n\nTo upload, log in to your Propela portal and navigate to the Documents section.\n\nIf you need assistance, please contact us.\n\nThank you,\nPropela Compliance Team',
    },
    {
      category: 'Document Request',
      name: 'Document Expiry Warning',
      subject: 'Document Expiring Soon - Action Required',
      body: 'Dear {{nurse_name}},\n\nThis is a reminder that the following document is expiring soon:\n\nDocument: {{document_type}}\nExpiry Date: {{expiry_date}}\nDays Remaining: {{days_remaining}}\n\nPlease upload a renewed copy before the expiry date to maintain your compliance status.\n\nThank you for your prompt attention to this matter.\n\nPropela Compliance Team',
    },
    {
      category: 'Placement Confirmation',
      name: 'Placement Offer Notification',
      subject: 'Placement Opportunity - {{facility_name}}',
      body: 'Dear {{nurse_name}},\n\nWe are pleased to inform you that a placement opportunity has been identified for you.\n\nFacility: {{facility_name}}\nLocation: {{facility_location}}\nStart Date: {{start_date}}\nRole: {{role}}\n\nPlease review the placement details and confirm your interest within 7 days.\n\nIf you have any questions about this opportunity, please contact your recruitment coordinator.\n\nBest regards,\nPropela Placements Team',
    },
    {
      category: 'Placement Confirmation',
      name: 'Placement Confirmed',
      subject: 'Congratulations! Your placement is confirmed',
      body: 'Dear {{nurse_name}},\n\nCongratulations! Your placement has been officially confirmed.\n\nDetails:\nFacility: {{facility_name}}\nLocation: {{facility_location}}\nStart Date: {{start_date}}\nContract Duration: {{contract_duration}}\n\nNext steps:\n1. Review and sign your contract (attached)\n2. Complete pre-employment checks\n3. Attend orientation on {{orientation_date}}\n\nWe are so excited for this next chapter of your career!\n\nBest regards,\nPropela Placements Team',
    },
  ];

  templateDefs.forEach((def, idx) => {
    emailTemplates.push({
      id: `email-tmpl-${String(idx + 1).padStart(3, '0')}`,
      name: def.name,
      category: def.category,
      subject: def.subject,
      body: def.body,
      variables: extractVariables(def.subject + ' ' + def.body),
      createdAt: generateDate(rand, 2024, 2025),
      updatedAt: generateDate(rand, 2025, 2025),
      usageCount: Math.floor(rand() * 50),
    });
  });

  // Generate alert rules
  ALERT_RULE_TYPES.forEach((ruleDef, idx) => {
    const rule = {
      id: `alert-rule-${String(idx + 1).padStart(3, '0')}`,
      name: ruleDef.label,
      trigger: ruleDef.trigger,
      field: ruleDef.field,
      value: ruleDef.defaultValue,
      enabled: rand() > 0.2,
      createdAt: generateDate(rand, 2024, 2025),
      lastTriggered: rand() > 0.3 ? generateTimestamp(rand, 2025, 2025) : null,
      triggerCount: Math.floor(rand() * 30),
      description: getAlertDescription(ruleDef),
    };
    alertRules.push(rule);
  });

  // Generate alert history
  const alertHistory = [];
  let alertHistIndex = 0;
  for (let i = 0; i < 25; i++) {
    alertHistIndex++;
    const ruleDef = pick(ALERT_RULE_TYPES, rand);
    alertHistory.push({
      id: `alert-hist-${String(alertHistIndex).padStart(4, '0')}`,
      ruleId: `alert-rule-${String(ALERT_RULE_TYPES.indexOf(ruleDef) + 1).padStart(3, '0')}`,
      ruleName: ruleDef.label,
      trigger: ruleDef.trigger,
      timestamp: generateTimestamp(rand, 2025, 2025),
      nurseId: `nurse-${String(Math.floor(rand() * nurseCount) + 1).padStart(3, '0')}`,
      details: getAlertHistoryDetail(ruleDef, rand),
      resolved: rand() > 0.4,
    });
  }

  return { communications, notifications, emailTemplates, alertRules, alertHistory };
}

function extractVariables(text) {
  const matches = text.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/[{}]/g, '')))];
}

function getAlertDescription(ruleDef) {
  const descriptions = {
    document_expiry: `Alert when a document is set to expire within ${ruleDef.defaultValue} days`,
    compliance_drop: `Alert when compliance score drops below ${ruleDef.defaultValue}%`,
    verification_overdue: `Alert when document verification is overdue by ${ruleDef.defaultValue} days`,
    pipeline_stagnant: `Alert when a nurse has been in the same pipeline stage for ${ruleDef.defaultValue} days`,
    placement_pending: `Alert when a placement response is pending for ${ruleDef.defaultValue} days`,
    training_missed: `Alert when a nurse has missed ${ruleDef.defaultValue} training sessions`,
  };
  return descriptions[ruleDef.trigger] || '';
}

function getAlertHistoryDetail(ruleDef, rand) {
  const details = {
    document_expiry: 'Passport expiry detected within threshold period',
    compliance_drop: `Compliance score dropped to ${Math.floor(rand() * 20) + 60}%`,
    verification_overdue: 'Pending verification exceeded configured threshold',
    pipeline_stagnant: 'No pipeline movement detected within threshold period',
    placement_pending: 'Placement response has not been received within threshold',
    training_missed: 'Training session attendance not recorded',
  };
  return details[ruleDef.trigger] || 'Alert triggered';
}
