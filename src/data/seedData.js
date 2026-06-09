import { calculateCvScore, calculateFinalScore, calculateTier, calculateReadinessStatus } from '../utils/calculations.js'

// Helper to generate a unique ID
function genId(prefix, index) {
  return `${prefix}-${String(index).padStart(3, '0')}`
}

// Generate date within a range
function randomDate(start, end) {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  return d.toISOString().split('T')[0]
}

// Nurse name data - South African female and male names
const firstNamesFemale = [
  'Thandi', 'Nomsa', 'Lindiwe', 'Zanele', 'Naledi', 'Lerato', 'Palesa', 'Dineo',
  'Siphosethu', 'Anele', 'Nompumelelo', 'Nosipho', 'Andiswa', 'Zinhle', 'Bongiwe',
  'Mbali', 'Noluthando', 'Precious', 'Sindiswa', 'Thandiwe', 'Ayanda', 'Buhle',
  'Nokuthula', 'Sindi', 'Funeka', 'Mpho', 'Khanyi', 'Nomalanga', 'Sinazo', 'Asanda',
  'Nandi', 'Busisiwe', 'Nonhlanhla', 'Phumzile', 'Zodwa', 'Khethiwe', 'Nokuphila',
  'Thandeka', 'Ntombifuthi', 'Dumisile', 'Eunice', 'Gladys', 'Hlengiwe', 'Jabulile',
  'Khanyisile', 'Lindelwa', 'Minenhle', 'Nothando', 'Olwethu', 'Philisiwe', 'Queen',
  'Refilwe', 'Sibongile', 'Tebogo', 'Unathi', 'Vuyelwa', 'Winnie', 'Xolisile',
  'Yoliswa', 'Zama',
]

const firstNamesMale = [
  'Themba', 'Sipho', 'Mandla', 'Bongani', 'Sandile', 'Thabo', 'Nkosinathi',
]

const lastNames = [
  'Nkosi', 'Dlamini', 'Ndlovu', 'Zulu', 'Mthembu', 'Shabalala', 'Khumalo',
  'Mokoena', 'Naidoo', 'Pillay', 'Govender', 'Molefe', 'Mahlangu', 'Sithole',
  'Ngcobo', 'Buthelezi', 'Mkhize', 'Cele', 'Ntuli', 'Zwane', 'Radebe', 'Maseko',
  'Mabaso', 'Mthethwa', 'Vilakazi', 'Tshabalala', 'Langa', 'Madonsela', 'Mazibuko',
  'Ngwenya', 'Sibiya', 'Mhlongo', 'Nene', 'Gumede', 'Khoza', 'Shange', 'Jele',
  'Zungu', 'Mabuza', 'Motaung', 'Tau', 'Modise', 'Maluleke', 'Mabena', 'Ledwaba',
  'Ramphele', 'Matlala', 'Mokwena', 'Phiri', 'Tembe', 'Mabunda', 'Ndaba', 'Mnguni',
  'Magwaza', 'Hlongwane', 'Mtshali', 'Maphanga', 'Fakude', 'Bhembe', 'Kubheka',
  'Mlambo', 'Mncube', 'Masinga', 'Myeni', 'Ngubane', 'Hadebe', 'Mkhwanazi',
]

const cities = {
  'Gauteng': ['Johannesburg', 'Pretoria', 'Sandton', 'Soweto', 'Centurion'],
  'Western Cape': ['Cape Town', 'Stellenbosch', 'Paarl', 'George'],
  'KwaZulu-Natal': ['Durban', 'Pietermaritzburg', 'Richards Bay', 'Newcastle'],
  'Eastern Cape': ['Port Elizabeth', 'East London', 'Mthatha'],
  'Free State': ['Bloemfontein', 'Welkom'],
  'Mpumalanga': ['Nelspruit', 'Witbank'],
  'Limpopo': ['Polokwane', 'Tzaneen'],
  'North West': ['Rustenburg', 'Mahikeng'],
  'Northern Cape': ['Kimberley', 'Upington'],
}

const provinces = Object.keys(cities)

const specialties = [
  'Medical/Surgical', 'ICU', 'Theatre', 'Paediatrics', 'Midwifery',
  'Mental Health', 'Emergency', 'Oncology', 'PHC-Community', 'Maternity', 'Renal',
]

const qualifications = ['Diploma', "Bachelor's Degree", 'Postgraduate', "Bachelor's + Postgrad"]

const employers = [
  'Netcare Milpark Hospital', 'Netcare Sunninghill Hospital', 'Life Fourways Hospital',
  'Mediclinic Sandton', 'Charlotte Maxeke Academic Hospital', 'Chris Hani Baragwanath',
  'Tygerberg Hospital', 'Groote Schuur Hospital', 'King Edward VIII Hospital',
  'Inkosi Albert Luthuli Central', 'Universitas Hospital', 'Life Groenkloof Hospital',
  'Netcare Garden City', 'Steve Biko Academic Hospital', 'Rob Ferreira Hospital',
  'Mediclinic Pietermaritzburg', 'Grey\'s Hospital', 'Helen Joseph Hospital',
  'Rahima Moosa Hospital', 'Tembisa Hospital',
]

const sources = [
  'Direct application', 'Organisation referral', 'Community channel',
  'Referral from placed nurse', 'LinkedIn', 'WhatsApp', 'Word of mouth',
]

const nextActions = [
  'Needs: Chase CV, then scoring',
  'Needs: Chase EF SET, then shortlist email',
  'Needs: Shortlist email (writing task)',
  'Needs: Non-selection email',
  'Needs: Review',
  'Needs: Send agreement',
  'Needs: Chase commitment fee',
  'Needs: OET registration',
  'No action required',
]

const certifications = [
  'Advanced Cardiac Life Support (ACLS)', 'Basic Life Support (BLS)',
  'Trauma Nursing Core Course (TNCC)', 'Paediatric Advanced Life Support (PALS)',
  'Critical Care Nursing Certificate', 'Midwifery Advanced Diploma',
  'IV Therapy Certificate', 'Wound Care Specialist',
  'Infection Prevention and Control', 'Neonatal ICU Certificate',
]

// Distribution of stages: ~15 Applied, ~10 CV Submitted, ~8 CV+English, ~5 Under Review,
// ~8 Shortlisted Yes, ~4 Shortlisted Maybe, ~7 Not Selected, ~3 Didn't Qualify,
// ~4 Selected/Confirmed, ~3 Training Active
const stageDistribution = [
  ...Array(15).fill('Applied'),
  ...Array(10).fill('CV Submitted'),
  ...Array(8).fill('CV + English Submitted'),
  ...Array(5).fill('Under Review'),
  ...Array(8).fill('Shortlisted - Yes'),
  ...Array(4).fill('Shortlisted - Maybe'),
  ...Array(7).fill('Not Selected'),
  ...Array(3).fill("Didn't Qualify"),
  ...Array(4).fill('Selected for Cohort'),
  ...Array(3).fill('Training Active'),
]

function generateNurse(index) {
  const isMale = index % 10 === 3 || index % 10 === 7 // ~20% male
  const firstName = isMale
    ? firstNamesMale[index % firstNamesMale.length]
    : firstNamesFemale[index % firstNamesFemale.length]
  const lastName = lastNames[index % lastNames.length]
  const fullName = `${firstName} ${lastName}`
  const preferredName = firstName

  const province = provinces[index % provinces.length]
  const cityList = cities[province]
  const city = cityList[index % cityList.length]

  const pipelineStage = stageDistribution[index % stageDistribution.length]
  const specialty = specialties[index % specialties.length]
  const qualification = qualifications[index % qualifications.length]
  const experience = ['1-2 years', '3-5 years', '5+ years'][index % 3]
  const gender = isMale ? 'Male' : 'Female'
  const ageGroup = ['25-29', '30-35', '35-40', '40+'][index % 4]

  const sancActive = index % 5 !== 4
  const sancNumber = `SN${String(100000 + index * 137).slice(0, 6)}`
  const sancApcExpiry = sancActive
    ? randomDate(new Date('2026-01-01'), new Date('2027-12-31'))
    : randomDate(new Date('2024-01-01'), new Date('2025-06-30'))
  const sancApcStatus = sancActive ? 'Active' : (index % 3 === 0 ? 'Lapsed' : 'Unverified')

  const hasPassport = index % 4 !== 3
  const passportExpiry = hasPassport
    ? randomDate(new Date('2027-01-01'), new Date('2031-12-31'))
    : null

  const efSetScore = 40 + Math.floor((index * 7 + 13) % 61) // 40 to 100
  const efSetLevel = efSetScore >= 71 ? 'C1' : efSetScore >= 60 ? 'B2' : efSetScore >= 51 ? 'B1' : 'A2'
  const englishPts = efSetScore >= 71 ? 5 : efSetScore >= 60 ? 4 : efSetScore >= 51 ? 3 : 2

  // OET data - only for nurses further in pipeline
  const hasOet = ['Shortlisted - Yes', 'Selected for Cohort', 'Training Active'].includes(pipelineStage)
  const oetStatus = hasOet ? 'Registered' : 'Not Started'
  const oetExamDate = hasOet ? randomDate(new Date('2026-04-01'), new Date('2026-09-30')) : null

  // Scorecard values (1-5 scale)
  const hospitalExpScore = experience === '5+ years' ? 5 : experience === '3-5 years' ? 4 : 3
  const sancStatusScore = sancActive ? 5 : 2
  const englishProfScore = englishPts
  const qualScore = qualification === "Bachelor's + Postgrad" ? 5 : qualification === 'Postgraduate' ? 4 : qualification === "Bachelor's Degree" ? 3 : 2
  const specScore = ['ICU', 'Theatre', 'Emergency'].includes(specialty) ? 5 : ['Medical/Surgical', 'Midwifery'].includes(specialty) ? 4 : 3
  const passportScore = hasPassport ? 5 : 1
  const financialScore = index % 3 === 0 ? 5 : index % 3 === 1 ? 4 : 3
  const motivationScore = 3 + (index % 3)

  const scorecard = {
    hospitalExp: hospitalExpScore,
    sancStatus: sancStatusScore,
    englishProficiency: englishProfScore,
    qualifications: qualScore,
    specialisation: specScore,
    validPassport: passportScore,
    financialReadiness: financialScore,
    motivation: motivationScore,
  }

  const cvScore = calculateCvScore(scorecard)
  const finalScore = calculateFinalScore(scorecard)
  const tier = calculateTier(finalScore)
  const readinessStatus = calculateReadinessStatus(pipelineStage)

  // Shortlist decision based on stage
  let shortlistDecision = null
  if (pipelineStage === 'Shortlisted - Yes' || pipelineStage === 'Selected for Cohort' || pipelineStage === 'Training Active') {
    shortlistDecision = 'YES'
  } else if (pipelineStage === 'Shortlisted - Maybe') {
    shortlistDecision = 'MAYBE'
  } else if (pipelineStage === 'Not Selected') {
    shortlistDecision = 'NO'
  }

  // Notes with flags for specific nurses (indices 5, 12, 18, 29, 37, 48, 55)
  const flagIndices = [5, 12, 18, 29, 37, 48, 55]
  let notes = ''
  if (flagIndices.includes(index)) {
    const flagReasons = [
      '[FLAG] Conflicting employment dates on CV - needs verification call',
      '[FLAG] SANC number could not be verified online - follow up required',
      '[FLAG] Candidate mentioned visa issues during screening call',
      '[FLAG] Inconsistency between qualification certificate and claimed institution',
      '[FLAG] Previous employer gave unfavorable reference - needs discussion',
      '[FLAG] Financial concerns raised about commitment fee ability',
      '[FLAG] Candidate has pending disciplinary matter - verify resolution',
    ]
    notes = flagReasons[flagIndices.indexOf(index)]
  } else if (index % 5 === 0) {
    notes = 'Initial screening complete. Strong candidate profile.'
  } else if (index % 7 === 0) {
    notes = 'Referred by previous cohort nurse. Very motivated.'
  }

  const commitmentFeeStatus = pipelineStage === 'Training Active' ? 'Paid'
    : pipelineStage === 'Selected for Cohort' ? 'Invoiced'
    : 'Not Due'

  const employer = employers[index % employers.length]

  const submittedAt = randomDate(new Date('2025-09-01'), new Date('2025-12-15'))
  const lastContacted = randomDate(new Date('2025-12-01'), new Date('2026-01-31'))

  const nextAction = nextActions[index % nextActions.length]

  const additionalCerts = []
  if (index % 3 === 0) additionalCerts.push(certifications[index % certifications.length])
  if (index % 5 === 0) additionalCerts.push(certifications[(index + 3) % certifications.length])

  return {
    id: genId('nurse', index + 1),
    fullName,
    preferredName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.co.za`,
    contactNumber: `+27 ${String(60 + (index % 20)).padStart(2, '0')} ${String(100 + index * 3).slice(0, 3)} ${String(1000 + index * 7).slice(0, 4)}`,
    gender,
    ageGroup,
    province,
    city,
    registeredWithSANC: true,
    registeredNurseInSA: true,
    sancNumber,
    sancApcExpiry,
    sancApcStatus,
    highestQualification: qualification,
    qualificationInstitution: ['University of KwaZulu-Natal', 'University of Cape Town', 'Wits University', 'University of Pretoria', 'Stellenbosch University', 'University of Johannesburg', 'Nelson Mandela University'][index % 7],
    yearsOfClinicalExperience: experience,
    primaryClinicalSpecialty: specialty,
    additionalCertifications: additionalCerts,
    employmentStatus: index % 6 === 0 ? 'Unemployed' : 'Employed',
    currentEmployer: index % 6 === 0 ? null : employer,
    validPassport: hasPassport,
    passportExpiry,
    previouslyTakenEnglishTest: efSetScore > 0,
    efSetScore,
    efSetLevel,
    englishPts,
    englishProficiencyLevel: efSetLevel,
    oetStatus,
    oetExamDate,
    oetWritingScore: hasOet ? 280 + (index % 100) : null,
    oetSpeakingScore: hasOet ? 290 + (index % 80) : null,
    oetListeningScore: hasOet ? 300 + (index % 90) : null,
    oetReadingScore: hasOet ? 270 + (index % 110) : null,
    oetOverallResult: hasOet ? 'Pending' : null,
    retakeRequired: false,
    retakeComponents: [],
    scorecard,
    cvScore,
    finalScore,
    tier,
    pipelineStage,
    shortlistDecision,
    firstInterviewDate: shortlistDecision === 'YES' ? randomDate(new Date('2026-01-15'), new Date('2026-02-28')) : null,
    nonSelectionReason: pipelineStage === 'Not Selected' ? 'Does not meet minimum English proficiency requirement' : pipelineStage === "Didn't Qualify" ? 'Not registered with SANC as a Registered Nurse' : null,
    recommendedPathway: pipelineStage === 'Not Selected' ? 'Self-funded English training, reapply at B2+' : pipelineStage === "Didn't Qualify" ? 'Obtain RN qualification, reapply' : null,
    cohortAssigned: ['Selected for Cohort', 'Training Active'].includes(pipelineStage) ? 'Cohort 1' : null,
    agreementSent: ['Selected for Cohort', 'Training Active'].includes(pipelineStage),
    agreementSigned: pipelineStage === 'Training Active',
    commitmentFeeStatus,
    commitmentFeeDate: commitmentFeeStatus === 'Paid' ? randomDate(new Date('2026-01-15'), new Date('2026-02-15')) : null,
    placementStatus: 'Not Ready',
    destinationCountry: 'UK',
    photoUrl: null,
    nextAction,
    readinessStatus,
    flags: flagIndices.includes(index) ? 1 : 0,
    motivations: ['Career growth', 'Better salary', 'International experience', 'Family future'][index % 4],
    questions: index % 8 === 0 ? 'Asked about accommodation support in UK' : null,
    notes,
    source: sources[index % sources.length],
    communicationLog: [
      {
        date: submittedAt,
        type: 'Application',
        content: 'Application received via online form',
      },
    ],
    submittedAt,
    lastContacted,
  }
}

// Generate 67 nurses
export const seedNurses = Array.from({ length: 67 }, (_, i) => generateNurse(i))
