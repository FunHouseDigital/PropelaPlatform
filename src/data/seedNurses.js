import { calculateCVScore, calculateFinalScore, calculateTier, calculateReadinessStatus } from '../lib/calculations';

// South African names pool
const FIRST_NAMES_FEMALE = [
  'Lilian', 'Nomsa', 'Thandi', 'Zanele', 'Precious', 'Noluthando', 'Busisiwe',
  'Lindiwe', 'Nokwanda', 'Siphosethu', 'Ayanda', 'Mbali', 'Nonhlanhla', 'Palesa',
  'Lerato', 'Thandeka', 'Nompumelelo', 'Zintle', 'Anele', 'Nosipho', 'Emily',
  'Grace', 'Nokuthula', 'Zinhle', 'Bongiwe', 'Kholeka', 'Ntombi', 'Fundiswa',
  'Ncumisa', 'Sindi', 'Amahle', 'Nozipho', 'Thandiwe', 'Buhle', 'Zandile',
  'Phindile', 'Hlengiwe', 'Nokukhanya', 'Simphiwe', 'Zodwa', 'Xoliswa',
  'Nolwazi', 'Nomvula', 'Asanda', 'Unathi',
];

const FIRST_NAMES_MALE = [
  'Webson', 'Sipho', 'Thabo', 'Bongani', 'Lungelo', 'Mandla', 'Sibusiso',
  'Tshepo', 'Kagiso', 'Mpho', 'Lwazi', 'Andile', 'Siyabonga', 'Dumisani',
  'Nkosinathi', 'Sandile', 'Bhekithemba', 'Mthunzi', 'Luyanda', 'Vuyo',
];

const LAST_NAMES = [
  'Majola', 'Madawo', 'Cloete', 'Mosiah', 'Shekaba', 'Plaatjies', 'Dlamini',
  'Nkosi', 'Mthembu', 'Ngcobo', 'Zulu', 'Ndlovu', 'Khumalo', 'Mokoena',
  'Molefe', 'Van der Merwe', 'September', 'Botha', 'Pillay', 'Naidoo',
  'Govender', 'Mkhize', 'Sithole', 'Radebe', 'Mahlangu', 'Tshabalala',
  'Maseko', 'Mabuza', 'Mabaso', 'Zwane', 'Ngubane', 'Mdlalose', 'Cele',
  'Shabangu', 'Mthethwa', 'Khoza', 'Hlongwane', 'Buthelezi', 'Mazibuko',
  'Kubheka', 'Gumede', 'Mchunu', 'Ntuli', 'Phakathi', 'Zondi', 'Mbatha',
  'Vilakazi', 'Langa', 'Magwaza', 'Jiyane', 'Nxumalo', 'Shange', 'Mkhwanazi',
  'Peters', 'Williams', 'Jacobs', 'Fortuin', 'Adams', 'Davids', 'Petersen',
];

const CITIES_BY_PROVINCE = {
  'Gauteng': ['Johannesburg', 'Pretoria', 'Soweto', 'Sandton', 'Centurion', 'Midrand'],
  'Western Cape': ['Cape Town', 'Stellenbosch', 'Paarl', 'George', 'Worcester'],
  'KwaZulu-Natal': ['Durban', 'Pietermaritzburg', 'Richards Bay', 'Newcastle', 'Ladysmith'],
  'Eastern Cape': ['Port Elizabeth', 'East London', 'Mthatha', 'Grahamstown', 'Bhisho'],
  'Free State': ['Bloemfontein', 'Welkom', 'Kroonstad', 'Bethlehem'],
  'Limpopo': ['Polokwane', 'Tzaneen', 'Mokopane', 'Thohoyandou'],
  'Mpumalanga': ['Nelspruit', 'Witbank', 'Secunda', 'Standerton'],
  'North West': ['Rustenburg', 'Mahikeng', 'Potchefstroom', 'Klerksdorp'],
  'Northern Cape': ['Kimberley', 'Upington', 'Springbok'],
};

const SPECIALTIES = [
  'Medical/Surgical', 'ICU', 'Theatre', 'Paediatrics', 'Midwifery',
  'Mental Health', 'Emergency', 'Oncology', 'PHC-Community', 'Maternity', 'Renal',
];

const QUALIFICATIONS = ['Diploma', "Bachelor's Degree", 'Postgraduate', "Bachelor's + Postgrad"];
const YEARS_EXP = ['Less than 1 year', '1-2 years', '3-5 years', '5+ years'];
const EFSET_LEVELS = ['A2', 'B1', 'B2', 'C1', 'C2'];
const OET_STATUSES = ['Not Started', 'Studying', 'Registered', 'Sat', 'Passed', 'Failed'];
const COMMITMENT_FEE = ['Not Due', 'Invoiced', 'Paid', 'Overdue', 'Waived'];
const SOURCES = ['Direct application', 'Organisation referral', 'Community channel', 'Referral from placed nurse', 'Event', 'LinkedIn', 'WhatsApp', 'Word of mouth'];

const NEXT_ACTIONS_BY_STAGE = {
  'Applied': ['Needs: Chase CV, then scoring', 'Needs: Chase EF SET, then shortlist email'],
  'CV Submitted': ['Needs: Chase EF SET, then shortlist email'],
  'CV + English Submitted': ['Needs: Review', 'Needs: Shortlist email (writing task)'],
  'Under Review': ['Needs: Review'],
  'Shortlisted - Yes': ['Needs: Send agreement', 'No action required'],
  'Shortlisted - Maybe': ['Needs: Review', 'No action required'],
  'Not Selected': ['Needs: Non-selection email', 'No action required'],
  "Didn't Qualify": ['Needs: Non-selection email (English pathway)', 'No action required'],
  'Selected for Cohort': ['Needs: Send agreement', 'Needs: Chase commitment fee'],
  'Reserve': ['No action required'],
  'Cohort Confirmed': ['Needs: OET registration', 'No action required'],
  'Training Active': ['Needs: OET registration', 'Needs: Chase OET results'],
  'OET Registered': ['Needs: Chase OET results'],
  'OET Passed': ['Needs: Placement outreach'],
  'OET Failed': ['Needs: OET registration', 'Needs: Review'],
  'Placement Ready': ['Needs: Placement outreach'],
  'Placed': ['No action required'],
  'Deferred': ['No action required'],
  'Dropped Out': ['No action required'],
  'Recommended Pathway': ['No action required'],
};

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

function pickProvince(rand) {
  const provinces = Object.keys(CITIES_BY_PROVINCE);
  // Weight Gauteng, Western Cape, KZN higher
  const weighted = [
    ...provinces.slice(0, 3), ...provinces.slice(0, 3), ...provinces.slice(0, 3),
    ...provinces.slice(3),
  ];
  return pick(weighted, rand);
}

function generateEmail(firstName, lastName) {
  const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, '');
  const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, '');
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return `${cleanFirst}.${cleanLast}@${domain}`;
}

function generatePhone(rand) {
  const prefixes = ['061', '062', '063', '064', '065', '071', '072', '073', '074', '076', '078', '079', '081', '082', '083', '084'];
  const prefix = pick(prefixes, rand);
  const num = Math.floor(rand() * 9000000 + 1000000);
  return `+27${prefix.slice(1)}${num}`;
}

function generateSANCNumber(rand) {
  const year = Math.floor(rand() * 20 + 2000);
  const num = Math.floor(rand() * 900000 + 100000);
  return `${num}`;
}

function generateDate(rand, yearStart, yearEnd) {
  const year = Math.floor(rand() * (yearEnd - yearStart + 1)) + yearStart;
  const month = Math.floor(rand() * 12) + 1;
  const day = Math.floor(rand() * 28) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const COMM_CHANNELS = ['WhatsApp', 'Email', 'Phone', 'In-person'];
const COMM_SUMMARIES = [
  'Discussed application progress and next steps',
  'Sent follow-up regarding outstanding documents',
  'Confirmed receipt of CV and English scores',
  'Checked in on OET preparation progress',
  'Discussed commitment fee payment',
  'Sent cohort information pack',
  'Follow-up on agreement signing',
  'Reminder about upcoming OET registration deadline',
  'Discussed placement preferences and availability',
  'Confirmed training schedule and expectations',
  'Sent welcome email with orientation details',
  'Checked passport validity status',
];

function generateNextActionDueDate(rand, stage) {
  if (stage === 'Placed' || stage === 'Deferred' || stage === 'Dropped Out' || stage === 'Recommended Pathway') {
    return '';
  }
  // Generate dates around today: some past (overdue), some today, some future
  const now = new Date();
  const offset = Math.floor(rand() * 14) - 5; // -5 to +8 days from today
  const date = new Date(now);
  date.setDate(date.getDate() + offset);
  return date.toISOString().split('T')[0];
}

function generateRecentDate(rand) {
  const now = new Date();
  const daysAgo = Math.floor(rand() * 21); // 0-20 days ago
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

function generateCommunicationLog(rand, firstName, lastName) {
  const count = Math.floor(rand() * 4); // 0-3 entries
  if (count === 0) return [];
  const log = [];
  for (let i = 0; i < count; i++) {
    const now = new Date();
    const daysAgo = Math.floor(rand() * 30) + i * 7;
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    log.push({
      date: date.toISOString().split('T')[0],
      channel: pick(COMM_CHANNELS, rand),
      summary: pick(COMM_SUMMARIES, rand),
      nextActionSet: rand() > 0.5 ? 'Yes' : 'No',
    });
  }
  // Sort newest first
  log.sort((a, b) => b.date.localeCompare(a.date));
  return log;
}

export function seedNurses() {
  const rand = seededRandom(42);
  const nurses = [];

  // Pipeline stage distribution (67 nurses total)
  const stageDistribution = [
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

  let nurseIndex = 0;

  for (const { stage, count } of stageDistribution) {
    for (let i = 0; i < count; i++) {
      const isFemale = rand() > 0.2; // 80% female
      const firstName = isFemale ? pick(FIRST_NAMES_FEMALE, rand) : pick(FIRST_NAMES_MALE, rand);
      const lastName = pick(LAST_NAMES, rand);
      const province = pickProvince(rand);
      const city = pick(CITIES_BY_PROVINCE[province], rand);
      const specialty = pick(SPECIALTIES, rand);
      const qualification = pick(QUALIFICATIONS, rand);
      const yearsExp = pick(YEARS_EXP, rand);
      const efsetScore = Math.floor(rand() * 50 + 40); // 40-89
      const efsetLevel = efsetScore >= 71 ? 'C1' : efsetScore >= 61 ? 'B2' : efsetScore >= 51 ? 'B1' : efsetScore >= 41 ? 'A2' : 'A1';
      const englishPts = efsetScore >= 71 ? 3 : efsetScore >= 61 ? 2 : efsetScore >= 51 ? 1 : 0;

      // Scorecard values (1-5)
      const hospitalExp = Math.floor(rand() * 5) + 1;
      const sancStatus = Math.floor(rand() * 3) + 3; // 3-5, most should be valid
      const qualScore = Math.floor(rand() * 5) + 1;
      const specScore = Math.floor(rand() * 5) + 1;
      const financialReadiness = Math.floor(rand() * 5) + 1;
      const motivation = Math.floor(rand() * 5) + 1;
      const passportScore = Math.floor(rand() * 5) + 1;

      const scorecardFields = {
        hospitalExp,
        sancStatus,
        qualifications: qualScore,
        specialisation: specScore,
        financialReadiness,
        motivation,
        passport: passportScore,
      };

      const nurse = {
        id: `nurse-${String(nurseIndex + 1).padStart(3, '0')}`,
        fullName: `${firstName} ${lastName}`,
        preferredName: firstName,
        pipelineStage: stage,
        nextAction: pick(NEXT_ACTIONS_BY_STAGE[stage] || ['No action required'], rand),
        readinessStatus: calculateReadinessStatus(stage),
        flags: Math.floor(rand() * 10) < 2 ? 1 : 0, // 20% have a flag
        email: generateEmail(firstName, lastName),
        contactNumber: generatePhone(rand),
        gender: isFemale ? 'Female' : 'Male',
        ageGroup: pick(['25-29', '30-35', '35-40', '40+'], rand),
        province,
        city,
        registeredWithSANC: rand() > 0.1 ? 'Yes' : 'No',
        registeredNurseInSA: rand() > 0.15 ? 'Yes' : 'No',
        sancNumber: generateSANCNumber(rand),
        sancAPCExpiry: generateDate(rand, 2025, 2027),
        sancAPCStatus: rand() > 0.2 ? 'Active' : (rand() > 0.5 ? 'Lapsed' : 'Unverified'),
        highestQualification: qualification,
        qualificationInstitution: pick([
          'University of Cape Town', 'University of the Witwatersrand',
          'University of KwaZulu-Natal', 'Stellenbosch University',
          'University of Pretoria', 'University of the Free State',
          'Nelson Mandela University', 'University of Johannesburg',
          'Tshwane University of Technology', 'Durban University of Technology',
          'Cape Peninsula University of Technology', 'Walter Sisulu University',
          'University of Limpopo', 'Sefako Makgatho Health Sciences University',
        ], rand),
        yearsOfClinicalExperience: yearsExp,
        primaryClinicalSpecialty: specialty,
        additionalCertifications: rand() > 0.5
          ? [pick(['ACLS', 'PALS', 'BLS', 'Trauma Nursing', 'Wound Care', 'IV Therapy'], rand)]
          : [],
        employmentStatus: pick(['Employed', 'Employed', 'Employed', 'Unemployed', 'Freelancing'], rand),
        currentEmployer: rand() > 0.3
          ? pick([
              'Life Healthcare', 'Mediclinic', 'Netcare', 'Chris Hani Baragwanath',
              'Groote Schuur Hospital', 'Tygerberg Hospital', 'Inkosi Albert Luthuli',
              'Steve Biko Academic Hospital', 'Charlotte Maxeke',
            ], rand)
          : '',
        validPassport: rand() > 0.3 ? 'Yes' : 'No',
        passportExpiryDate: generateDate(rand, 2025, 2030),
        efSetScore: efsetScore,
        efSetLevel: efsetLevel,
        englishPts,
        oetStatus: stage === 'OET Passed' || stage === 'Placement Ready' || stage === 'Placed'
          ? 'Passed'
          : stage === 'OET Registered' || stage === 'Training Active'
            ? pick(['Registered', 'Studying'], rand)
            : stage === 'OET Failed'
              ? 'Failed'
              : pick(['Not Started', 'Not Started', 'Studying'], rand),
        scorecardFields,
        cvScore: 0, // calculated below
        finalScore: 0, // calculated below
        tier: '', // calculated below
        shortlistDecision: stage === 'Shortlisted - Yes' ? 'YES'
          : stage === 'Shortlisted - Maybe' ? 'MAYBE'
          : stage === 'Not Selected' ? 'NO'
          : '',
        cohortAssigned: ['Selected for Cohort', 'Reserve', 'Cohort Confirmed', 'Training Active', 'OET Registered', 'OET Passed', 'OET Failed', 'Placement Ready', 'Placed'].includes(stage)
          ? 'Cohort 1'
          : '',
        agreementSigned: ['Cohort Confirmed', 'Training Active', 'OET Registered', 'OET Passed', 'Placement Ready', 'Placed'].includes(stage),
        commitmentFeeStatus: ['Cohort Confirmed', 'Training Active', 'OET Registered', 'OET Passed', 'Placement Ready', 'Placed'].includes(stage)
          ? pick(['Paid', 'Paid', 'Paid', 'Invoiced'], rand)
          : 'Not Due',
        source: pick(SOURCES, rand),
        motivations: pick([
          'I want to gain international experience and provide better healthcare.',
          'Looking for career growth and exposure to world-class healthcare systems.',
          'I dream of working in the UK to develop my nursing skills further.',
          'Want to support my family while advancing my career abroad.',
          'Passionate about nursing and eager to experience different healthcare environments.',
          'Seeking better working conditions and professional development opportunities.',
          'Want to specialise further and the UK/Ireland offers excellent training.',
        ], rand),
        questions: rand() > 0.5 ? pick([
          'What is the timeline from application to placement?',
          'How long does the OET preparation take?',
          'Are there opportunities in Ireland as well?',
          'What support is provided during the visa process?',
          'Can I bring my family once placed?',
        ], rand) : '',
        notesFlags: rand() > 0.8
          ? pick([
              '[FLAG] Needs urgent follow-up - no response for 2 weeks',
              '[FLAG] Document verification pending',
              'Strong candidate - fast track where possible',
              'Referred by Lilian from Cohort 1',
            ], rand)
          : '',
        communicationLog: generateCommunicationLog(rand, firstName, lastName),
        photoURL: '',
        submittedAt: generateDate(rand, 2025, 2026),
        nextActionDueDate: generateNextActionDueDate(rand, stage),
        lastContacted: generateRecentDate(rand),
      };

      // Calculate scores
      nurse.cvScore = calculateCVScore(nurse);
      nurse.finalScore = calculateFinalScore(nurse);
      nurse.tier = calculateTier(nurse.finalScore);

      nurses.push(nurse);
      nurseIndex++;
    }
  }

  return nurses;
}
