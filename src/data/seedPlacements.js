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

const PLACEMENT_STAGES = [
  'Ready for Placement',
  'CV Sent',
  'Interview Scheduled',
  'Offer Received',
  'Visa Processing',
  'Placed',
  'Settled',
];

const NURSE_NAMES = [
  'Lilian Majola', 'Nomsa Dlamini', 'Thandi Nkosi', 'Zanele Mthembu',
  'Precious Ngcobo', 'Busisiwe Zulu', 'Lindiwe Ndlovu', 'Sipho Khumalo',
  'Ayanda Mokoena', 'Mbali Molefe', 'Nonhlanhla Pillay', 'Lerato Naidoo',
  'Thandeka Govender', 'Webson Mkhize', 'Nokwanda Sithole',
];

const SPECIALTIES = [
  'Medical/Surgical', 'ICU', 'Theatre', 'Paediatrics', 'Midwifery',
  'Mental Health', 'Emergency', 'Oncology', 'PHC-Community',
];

const UK_FACILITIES = [
  { id: 'uk-001', name: 'Royal London Hospital' },
  { id: 'uk-002', name: 'St Thomas Hospital' },
  { id: 'uk-003', name: 'Manchester Royal Infirmary' },
  { id: 'uk-004', name: 'Leeds General Infirmary' },
  { id: 'uk-005', name: 'Queen Elizabeth Hospital Birmingham' },
  { id: 'uk-006', name: 'Addenbrookes Hospital Cambridge' },
  { id: 'uk-007', name: 'Royal Edinburgh Hospital' },
  { id: 'uk-008', name: 'University Hospital Wales' },
];

const IRELAND_FACILITIES = [
  { id: 'ie-001', name: 'Mater Misericordiae Dublin' },
  { id: 'ie-002', name: 'St James Hospital Dublin' },
  { id: 'ie-003', name: 'Cork University Hospital' },
  { id: 'ie-004', name: 'University Hospital Galway' },
  { id: 'ie-005', name: 'Beaumont Hospital Dublin' },
  { id: 'ie-006', name: 'Tallaght University Hospital' },
];

const VISA_STATUSES = [
  'Not Started', 'Application Submitted', 'Documents Requested',
  'Biometrics Scheduled', 'Processing', 'Approved', 'Rejected',
];

const SALARY_BANDS = [
  'Band 5 (GBP 28,407-34,581)',
  'Band 6 (GBP 35,392-42,618)',
  'Band 7 (GBP 43,742-50,056)',
];

const RELOCATION_ITEMS = [
  'Accommodation arranged',
  'Bank account opened',
  'NMC registration submitted',
  'Right to work confirmed',
  'Airport pickup scheduled',
  'Orientation date set',
  'Uniform ordered',
  'IT access requested',
];

export function seedPlacements() {
  const rand = seededRandom(77);
  const placements = [];

  // Distribute across stages
  const stageDistribution = [
    { stage: 'Ready for Placement', count: 3 },
    { stage: 'CV Sent', count: 3 },
    { stage: 'Interview Scheduled', count: 2 },
    { stage: 'Offer Received', count: 2 },
    { stage: 'Visa Processing', count: 2 },
    { stage: 'Placed', count: 2 },
    { stage: 'Settled', count: 1 },
  ];

  let placementIndex = 0;

  for (const { stage, count } of stageDistribution) {
    for (let i = 0; i < count; i++) {
      const nurseName = NURSE_NAMES[placementIndex % NURSE_NAMES.length];
      const targetCountry = rand() > 0.4 ? 'UK' : 'Ireland';
      const facilities = targetCountry === 'UK' ? UK_FACILITIES : IRELAND_FACILITIES;
      const facility = pick(facilities, rand);
      const specialty = pick(SPECIALTIES, rand);
      const stageIdx = PLACEMENT_STAGES.indexOf(stage);

      // Determine visa status based on placement stage
      let visaStatus;
      if (stageIdx <= 2) {
        visaStatus = pick(VISA_STATUSES.slice(0, 3), rand);
      } else if (stageIdx <= 4) {
        visaStatus = pick(VISA_STATUSES.slice(2, 5), rand);
      } else {
        visaStatus = 'Approved';
      }

      // Generate days in stage
      const daysInStage = Math.floor(rand() * 20) + 1;

      // Match score (60-99)
      const matchScore = Math.floor(rand() * 40) + 60;

      // Contract details
      const contractDetails = {
        startDate: generateDate(rand, 2025, 2026),
        salaryBand: pick(SALARY_BANDS, rand),
        role: `${specialty} Nurse`,
      };

      // Relocation checklist - more items checked for later stages
      const checkThreshold = stageIdx / PLACEMENT_STAGES.length;
      const relocationChecklist = RELOCATION_ITEMS.map((item) => ({
        item,
        checked: rand() < checkThreshold,
      }));

      // Stage history
      const stageHistory = [];
      for (let s = 0; s <= stageIdx; s++) {
        const daysBack = (stageIdx - s) * Math.floor(rand() * 10 + 5);
        const enteredDate = new Date();
        enteredDate.setDate(enteredDate.getDate() - daysBack);
        stageHistory.push({
          stage: PLACEMENT_STAGES[s],
          enteredAt: enteredDate.toISOString().split('T')[0],
        });
      }

      placements.push({
        id: `placement-${String(placementIndex + 1).padStart(3, '0')}`,
        nurseId: `nurse-${String(placementIndex + 1).padStart(3, '0')}`,
        nurseName,
        targetCountry,
        facilityId: facility.id,
        facilityName: facility.name,
        currentStage: stage,
        daysInStage,
        matchScore,
        specialty,
        visaStatus,
        contractDetails,
        relocationChecklist,
        stageHistory,
      });

      placementIndex++;
    }
  }

  return placements;
}
