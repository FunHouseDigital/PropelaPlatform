import { seedNurses } from './seedNurses';

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

const DOCUMENT_TYPES = [
  'Passport',
  'Nursing Qualification',
  'OET Certificate',
  'IELTS Certificate',
  'CBT Certificate',
  'NMC Decision Letter',
  'Visa Documents',
  'References',
];

// Status values are used inline in the generation logic below

// Pipeline stages in progression order for determining document count
const PIPELINE_STAGES_ORDERED = [
  'Applied',
  'CV Submitted',
  'CV + English Submitted',
  'Under Review',
  'Shortlisted - Yes',
  'Shortlisted - Maybe',
  'Not Selected',
  "Didn't Qualify",
  'Selected for Cohort',
  'Reserve',
  'Cohort Confirmed',
  'Training Active',
  'OET Registered',
  'OET Passed',
  'OET Failed',
  'Placement Ready',
  'Placed',
  'Deferred',
  'Dropped Out',
  'Recommended Pathway',
];

// Stage distribution matching seedNurses.js (67 nurses total)
const STAGE_DISTRIBUTION = [
  { stage: 'Applied', count: 8 },
  { stage: 'CV Submitted', count: 6 },
  { stage: 'CV + English Submitted', count: 7 },
  { stage: 'Under Review', count: 4 },
  { stage: 'Shortlisted - Yes', count: 5 },
  { stage: 'Shortlisted - Maybe', count: 3 },
  { stage: 'Not Selected', count: 5 },
  { stage: "Didn't Qualify", count: 2 },
  { stage: 'Selected for Cohort', count: 3 },
  { stage: 'Reserve', count: 2 },
  { stage: 'Cohort Confirmed', count: 4 },
  { stage: 'Training Active', count: 5 },
  { stage: 'OET Registered', count: 3 },
  { stage: 'OET Passed', count: 2 },
  { stage: 'OET Failed', count: 1 },
  { stage: 'Placement Ready', count: 2 },
  { stage: 'Placed', count: 2 },
  { stage: 'Deferred', count: 1 },
  { stage: 'Dropped Out', count: 1 },
  { stage: 'Recommended Pathway', count: 1 },
];

const VERIFIER_NAMES = [
  'Sarah Thompson',
  'James Anderson',
  'Maria Garcia',
  'David Chen',
  'Rachel Mthembu',
];

function getDocCountForStage(stage, rand) {
  const idx = PIPELINE_STAGES_ORDERED.indexOf(stage);
  // Early stages (0-7): 1-3 documents
  if (idx <= 7) {
    return Math.floor(rand() * 3) + 1;
  }
  // Mid stages (8-12): 3-5 documents
  if (idx <= 12) {
    return Math.floor(rand() * 3) + 3;
  }
  // Late stages (13+: OET Passed, Placement Ready, Placed, etc.): 5-8 documents
  return Math.floor(rand() * 4) + 5;
}

function getDocTypesForStage(stage, rand, count) {
  const idx = PIPELINE_STAGES_ORDERED.indexOf(stage);
  // Always start with passport for everyone
  const available = [...DOCUMENT_TYPES];
  const selected = ['Passport'];

  // Add nursing qualification for anyone past Applied
  if (idx >= 1 && count > 1) {
    selected.push('Nursing Qualification');
  }

  // Add OET/IELTS for mid+ stages
  if (idx >= 8 && count > 2) {
    selected.push(rand() > 0.5 ? 'OET Certificate' : 'IELTS Certificate');
  }

  // Add CBT for later stages
  if (idx >= 13 && count > 3) {
    selected.push('CBT Certificate');
  }

  // Add NMC Decision Letter for placement-ready and placed
  if (idx >= 15 && count > 4) {
    selected.push('NMC Decision Letter');
  }

  // Add visa documents for placed nurses
  if (idx >= 16 && count > 5) {
    selected.push('Visa Documents');
  }

  // Fill remaining with random picks from available types not yet selected
  while (selected.length < count) {
    const remaining = available.filter((t) => !selected.includes(t));
    if (remaining.length === 0) break;
    selected.push(pick(remaining, rand));
  }

  return selected.slice(0, count);
}

function generateVerificationHistory(rand, status) {
  const history = [];
  if (status === 'Verified') {
    history.push({
      action: 'Approved',
      performedBy: pick(VERIFIER_NAMES, rand),
      date: generateDate(rand, 2024, 2025),
      notes: 'Document verified successfully',
    });
  } else if (status === 'Rejected') {
    history.push({
      action: 'Rejected',
      performedBy: pick(VERIFIER_NAMES, rand),
      date: generateDate(rand, 2024, 2025),
      notes: pick([
        'Document unclear or illegible',
        'Expired document submitted',
        'Information mismatch detected',
        'Missing required fields',
      ], rand),
    });
  }
  return history;
}

export function seedDocuments() {
  const rand = seededRandom(99);
  const documents = [];
  const verificationQueue = [];
  let docIndex = 0;

  // Canonical nurse list — documents (and verification queue entries) must
  // reference EXISTING nurses so the documents.nurse_id → nurses(id) FK is
  // satisfied on Supabase migration.
  const nurseIds = seedNurses().map((n) => n.id);

  let nurseIndex = 0;

  for (const { stage, count: nurseCount } of STAGE_DISTRIBUTION) {
    for (let n = 0; n < nurseCount; n++) {
      const nurseId = nurseIds[nurseIndex % nurseIds.length];
      const docCount = getDocCountForStage(stage, rand);
      const docTypes = getDocTypesForStage(stage, rand, docCount);

      for (const docType of docTypes) {
        docIndex++;
        const docId = `doc-${String(docIndex).padStart(4, '0')}`;

        // Determine status based on stage progression
        let status;
        const stageIdx = PIPELINE_STAGES_ORDERED.indexOf(stage);
        if (stageIdx >= 13) {
          // Late stages: mostly verified
          status = rand() > 0.15 ? 'Verified' : pick(['Pending', 'Expired'], rand);
        } else if (stageIdx >= 8) {
          // Mid stages: mix
          status = pick(['Pending', 'Verified', 'Verified', 'Pending'], rand);
        } else {
          // Early stages: mostly pending
          status = rand() > 0.7 ? 'Verified' : 'Pending';
        }

        const uploadDate = generateDate(rand, 2024, 2025);

        // Generate expiry date for certain document types
        let expiryDate = null;
        if (['Passport', 'Visa Documents', 'OET Certificate', 'IELTS Certificate'].includes(docType)) {
          expiryDate = generateDate(rand, 2025, 2028);
          // Some may be expired
          if (status === 'Expired') {
            expiryDate = generateDate(rand, 2023, 2024);
          }
        }

        const verificationHistory = generateVerificationHistory(rand, status);

        const doc = {
          id: docId,
          nurseId,
          type: docType,
          status,
          uploadDate,
          expiryDate,
          fileName: `${docType.toLowerCase().replace(/\s+/g, '_')}_${nurseId}.pdf`,
          fileSize: Math.floor(rand() * 4000) + 500, // 500KB - 4500KB
          verificationHistory,
          notes: '',
        };

        documents.push(doc);

        // Add pending documents to verification queue
        if (status === 'Pending') {
          verificationQueue.push({
            id: `vq-${String(verificationQueue.length + 1).padStart(4, '0')}`,
            documentId: docId,
            nurseId,
            documentType: docType,
            uploadDate,
            priority: stageIdx >= 13 ? 'High' : stageIdx >= 8 ? 'Medium' : 'Low',
            assignedTo: rand() > 0.4 ? pick(VERIFIER_NAMES, rand) : null,
          });
        }
      }

      nurseIndex++;
    }
  }

  // Document templates
  const templates = [
    {
      id: 'template-001',
      name: 'Standard Offer Letter',
      type: 'Offer Letter',
      category: 'Employment',
      content: 'Dear [NURSE_NAME],\n\nWe are pleased to offer you the position of [ROLE] at [FACILITY_NAME]. Your start date will be [START_DATE] with a salary of [SALARY_BAND].\n\nPlease review the attached terms and conditions and return a signed copy within 14 days.\n\nKind regards,\nPropela Recruitment Team',
      createdAt: '2024-06-15',
      updatedAt: '2025-01-10',
    },
    {
      id: 'template-002',
      name: 'Professional Reference Request',
      type: 'Reference Request Form',
      category: 'Compliance',
      content: 'Dear [REFEREE_NAME],\n\nWe are writing to request a professional reference for [NURSE_NAME] who has applied for an international nursing position through Propela.\n\nPlease complete the attached reference form and return it to compliance@propela.co.za within 10 working days.\n\nThank you for your assistance.\n\nPropela Compliance Team',
      createdAt: '2024-07-01',
      updatedAt: '2025-02-05',
    },
    {
      id: 'template-003',
      name: 'Compliance Certificate',
      type: 'Compliance Certificate',
      category: 'Compliance',
      content: 'CERTIFICATE OF COMPLIANCE\n\nThis certifies that [NURSE_NAME] (ID: [NURSE_ID]) has completed all required document verification and compliance checks as of [DATE].\n\nDocuments verified:\n- [DOCUMENT_LIST]\n\nStatus: COMPLIANT\n\nIssued by: Propela Compliance Department\nDate: [DATE]\nReference: [REF_NUMBER]',
      createdAt: '2024-08-01',
      updatedAt: '2025-03-12',
    },
    {
      id: 'template-004',
      name: 'Conditional Offer Letter',
      type: 'Offer Letter',
      category: 'Employment',
      content: 'Dear [NURSE_NAME],\n\nWe are pleased to extend a conditional offer for the position of [ROLE] at [FACILITY_NAME].\n\nThis offer is subject to:\n- Successful completion of NMC registration\n- Valid visa approval\n- Satisfactory reference checks\n\nPlease acknowledge receipt and confirm your acceptance within 7 days.\n\nKind regards,\nPropela Recruitment Team',
      createdAt: '2024-09-10',
      updatedAt: '2025-01-20',
    },
    {
      id: 'template-005',
      name: 'Character Reference Request',
      type: 'Reference Request Form',
      category: 'Compliance',
      content: 'Dear [REFEREE_NAME],\n\nWe are requesting a character reference for [NURSE_NAME] as part of their international placement application.\n\nPlease provide information regarding their professional conduct, reliability, and suitability for an overseas nursing role.\n\nKindly return the completed form within 14 working days.\n\nThank you,\nPropela Compliance Team',
      createdAt: '2024-10-01',
      updatedAt: '2025-02-28',
    },
  ];

  return { documents, templates, verificationQueue };
}
