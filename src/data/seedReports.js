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

const REPORT_TYPES = [
  'nurse_pipeline_summary',
  'compliance_status',
  'placement_outcomes',
  'cohort_progress',
  'communication_activity',
];

const REPORT_NAMES = {
  nurse_pipeline_summary: ['Weekly Pipeline Overview', 'Monthly Pipeline Report', 'Quarterly Pipeline Digest'],
  compliance_status: ['Compliance Status Report', 'Monthly Compliance Audit', 'Document Compliance Summary'],
  placement_outcomes: ['Placement Outcomes Report', 'Quarterly Placement Analysis', 'Placement Success Metrics'],
  cohort_progress: ['Cohort Progress Tracker', 'Monthly Cohort Report', 'Training Milestone Summary'],
  communication_activity: ['Communication Activity Log', 'Weekly Outreach Summary', 'Engagement Metrics Report'],
};

const FREQUENCIES = ['daily', 'weekly', 'bi-weekly', 'monthly', 'quarterly'];
const FORMATS = ['PDF', 'CSV', 'Excel'];
const STATUSES = ['active', 'paused', 'draft'];
const EXPORT_STATUSES = ['completed', 'completed', 'completed', 'processing', 'failed'];

const RECIPIENT_NAMES = [
  'aya@propela.io',
  'admin@propela.io',
  'compliance@propela.io',
  'placements@propela.io',
  'recruitment@propela.io',
  'training@propela.io',
];

const WIDGET_TYPES = ['bar_chart', 'line_chart', 'pie_chart', 'stat_card', 'table', 'progress_ring'];

const WIDGET_TITLES = [
  'Pipeline by Stage',
  'Weekly Applications',
  'Compliance Score Trend',
  'Placement Rate',
  'Active Cohorts',
  'Document Status',
  'Communication Volume',
  'Top Referrers',
  'Nurse Distribution',
  'Training Completion',
];

export function seedReports() {
  const rand = seededRandom(999);

  // Generate scheduled reports (7 items)
  const scheduledReports = [];
  for (let i = 0; i < 7; i++) {
    const type = pick(REPORT_TYPES, rand);
    const recipientCount = Math.floor(rand() * 3) + 1;
    const recipients = [];
    for (let r = 0; r < recipientCount; r++) {
      const recipient = pick(RECIPIENT_NAMES, rand);
      if (!recipients.includes(recipient)) {
        recipients.push(recipient);
      }
    }

    scheduledReports.push({
      id: `sched-report-${String(i + 1).padStart(3, '0')}`,
      name: pick(REPORT_NAMES[type], rand),
      type,
      frequency: pick(FREQUENCIES, rand),
      recipients,
      format: pick(FORMATS, rand),
      lastRun: generateTimestamp(rand, 2025, 2025),
      status: pick(STATUSES, rand),
      reportConfig: {
        dateRange: pick(['last_7_days', 'last_30_days', 'last_quarter', 'custom'], rand),
        includeCharts: rand() > 0.3,
        includeSummary: rand() > 0.2,
        groupBy: pick(['stage', 'cohort', 'facility', 'month'], rand),
      },
    });
  }

  // Generate export history (12 items)
  const exportHistory = [];
  for (let i = 0; i < 12; i++) {
    const type = pick(REPORT_TYPES, rand);
    exportHistory.push({
      id: `export-${String(i + 1).padStart(3, '0')}`,
      type,
      format: pick(FORMATS, rand),
      filters: {
        dateRange: pick(['last_7_days', 'last_30_days', 'last_quarter'], rand),
        status: pick(['all', 'active', 'completed'], rand),
      },
      timestamp: generateTimestamp(rand, 2025, 2025),
      fileSize: `${(rand() * 4 + 0.5).toFixed(1)} MB`,
      status: pick(EXPORT_STATUSES, rand),
    });
  }

  // Generate dashboard layouts (3 presets)
  const dashboardLayouts = [];
  const layoutNames = ['Overview Dashboard', 'Recruitment Focus', 'Compliance Monitor'];
  for (let i = 0; i < 3; i++) {
    const widgetCount = Math.floor(rand() * 3) + 4; // 4-6 widgets
    const widgets = [];
    const usedTitles = [];
    for (let w = 0; w < widgetCount; w++) {
      let title = pick(WIDGET_TITLES, rand);
      while (usedTitles.includes(title)) {
        title = pick(WIDGET_TITLES, rand);
      }
      usedTitles.push(title);
      widgets.push({
        widgetId: `widget-${i + 1}-${w + 1}`,
        type: pick(WIDGET_TYPES, rand),
        title,
        size: pick(['small', 'medium', 'large'], rand),
        position: { row: Math.floor(w / 3), col: w % 3 },
      });
    }

    dashboardLayouts.push({
      id: `layout-${String(i + 1).padStart(3, '0')}`,
      name: layoutNames[i],
      widgets,
    });
  }

  return { scheduledReports, exportHistory, dashboardLayouts };
}
