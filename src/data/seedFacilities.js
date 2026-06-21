// Real South African hospital/facility names distributed across provinces and healthcare groups

const LIFE_HEALTHCARE_FACILITIES = [
  { name: 'Life Fourways Hospital', province: 'Gauteng', city: 'Fourways' },
  { name: 'Life Eugene Marais Hospital', province: 'Gauteng', city: 'Pretoria' },
  { name: 'Life Wilgeheuwel Hospital', province: 'Gauteng', city: 'Roodepoort' },
  { name: 'Life Vincent Pallotti Hospital', province: 'Western Cape', city: 'Cape Town' },
  { name: 'Life Kingsbury Hospital', province: 'Western Cape', city: 'Cape Town' },
  { name: 'Life Entabeni Hospital', province: 'KwaZulu-Natal', city: 'Durban' },
  { name: 'Life St Dominics Hospital', province: 'Eastern Cape', city: 'East London' },
  { name: 'Life Hilton Private Hospital', province: 'KwaZulu-Natal', city: 'Hilton' },
  { name: 'Life Anncron Hospital', province: 'Free State', city: 'Klerksdorp' },
  { name: 'Life Robinson Private Hospital', province: 'North West', city: 'Randfontein' },
  { name: 'Life Cosmos Hospital', province: 'Mpumalanga', city: 'Witbank' },
  { name: 'Life Bedford Gardens Hospital', province: 'Gauteng', city: 'Bedfordview' },
];

const MEDICLINIC_FACILITIES = [
  { name: 'Mediclinic Sandton', province: 'Gauteng', city: 'Sandton' },
  { name: 'Mediclinic Morningside', province: 'Gauteng', city: 'Sandton' },
  { name: 'Mediclinic Pretoria Heart', province: 'Gauteng', city: 'Pretoria' },
  { name: 'Mediclinic Cape Town', province: 'Western Cape', city: 'Cape Town' },
  { name: 'Mediclinic Constantiaberg', province: 'Western Cape', city: 'Cape Town' },
  { name: 'Mediclinic Stellenbosch', province: 'Western Cape', city: 'Stellenbosch' },
  { name: 'Mediclinic Pietermaritzburg', province: 'KwaZulu-Natal', city: 'Pietermaritzburg' },
  { name: 'Mediclinic Durbanville', province: 'Western Cape', city: 'Durbanville' },
  { name: 'Mediclinic Kimberley', province: 'Northern Cape', city: 'Kimberley' },
  { name: 'Mediclinic Bloemfontein', province: 'Free State', city: 'Bloemfontein' },
  { name: 'Mediclinic Limpopo', province: 'Limpopo', city: 'Polokwane' },
  { name: 'Mediclinic Nelspruit', province: 'Mpumalanga', city: 'Nelspruit' },
  { name: 'Mediclinic Hoogland', province: 'Free State', city: 'Bethlehem' },
  { name: 'Mediclinic Victoria', province: 'Western Cape', city: 'Cape Town' },
];

const NETCARE_FACILITIES = [
  { name: 'Netcare Milpark Hospital', province: 'Gauteng', city: 'Johannesburg' },
  { name: 'Netcare Garden City Hospital', province: 'Gauteng', city: 'Johannesburg' },
  { name: 'Netcare Sunninghill Hospital', province: 'Gauteng', city: 'Sunninghill' },
  { name: 'Netcare Christiaan Barnard Memorial Hospital', province: 'Western Cape', city: 'Cape Town' },
  { name: 'Netcare N1 City Hospital', province: 'Western Cape', city: 'Cape Town' },
  { name: 'Netcare St Augustine Hospital', province: 'KwaZulu-Natal', city: 'Durban' },
  { name: 'Netcare Kingsway Hospital', province: 'KwaZulu-Natal', city: 'Durban' },
  { name: 'Netcare Greenacres Hospital', province: 'Eastern Cape', city: 'Port Elizabeth' },
  { name: 'Netcare Blaauwberg Hospital', province: 'Western Cape', city: 'Cape Town' },
  { name: 'Netcare Pretoria East Hospital', province: 'Gauteng', city: 'Pretoria' },
  { name: 'Netcare Waterfall City Hospital', province: 'Gauteng', city: 'Midrand' },
  { name: 'Netcare Pholoso Hospital', province: 'Limpopo', city: 'Polokwane' },
  { name: 'Netcare Ferncrest Hospital', province: 'Mpumalanga', city: 'Nelspruit' },
  { name: 'Netcare Universitas Hospital', province: 'Free State', city: 'Bloemfontein' },
];

const PUBLIC_FACILITIES = [
  { name: 'Chris Hani Baragwanath Academic Hospital', province: 'Gauteng', city: 'Soweto' },
  { name: 'Charlotte Maxeke Johannesburg Academic Hospital', province: 'Gauteng', city: 'Johannesburg' },
  { name: 'Steve Biko Academic Hospital', province: 'Gauteng', city: 'Pretoria' },
  { name: 'Groote Schuur Hospital', province: 'Western Cape', city: 'Cape Town' },
  { name: 'Tygerberg Hospital', province: 'Western Cape', city: 'Cape Town' },
  { name: 'Red Cross War Memorial Children\'s Hospital', province: 'Western Cape', city: 'Cape Town' },
  { name: 'Inkosi Albert Luthuli Central Hospital', province: 'KwaZulu-Natal', city: 'Durban' },
  { name: 'King Edward VIII Hospital', province: 'KwaZulu-Natal', city: 'Durban' },
  { name: 'Grey\'s Hospital', province: 'KwaZulu-Natal', city: 'Pietermaritzburg' },
  { name: 'Nelson Mandela Academic Hospital', province: 'Eastern Cape', city: 'Mthatha' },
  { name: 'Dora Nginza Hospital', province: 'Eastern Cape', city: 'Port Elizabeth' },
  { name: 'Frere Hospital', province: 'Eastern Cape', city: 'East London' },
  { name: 'Pelonomi Tertiary Hospital', province: 'Free State', city: 'Bloemfontein' },
  { name: 'Universitas Academic Hospital', province: 'Free State', city: 'Bloemfontein' },
  { name: 'Pietersburg Provincial Hospital', province: 'Limpopo', city: 'Polokwane' },
  { name: 'Mankweng Hospital', province: 'Limpopo', city: 'Mankweng' },
  { name: 'Rob Ferreira Hospital', province: 'Mpumalanga', city: 'Nelspruit' },
  { name: 'Witbank Hospital', province: 'Mpumalanga', city: 'Witbank' },
  { name: 'Klerksdorp Tshepong Hospital Complex', province: 'North West', city: 'Klerksdorp' },
  { name: 'Mafikeng Provincial Hospital', province: 'North West', city: 'Mahikeng' },
  { name: 'Kimberley Hospital Complex', province: 'Northern Cape', city: 'Kimberley' },
  { name: 'Robert Sobukwe Hospital', province: 'Northern Cape', city: 'Kimberley' },
  { name: 'Dr George Mukhari Academic Hospital', province: 'Gauteng', city: 'Ga-Rankuwa' },
  { name: 'Kalafong Provincial Tertiary Hospital', province: 'Gauteng', city: 'Pretoria' },
  { name: 'Tembisa Hospital', province: 'Gauteng', city: 'Tembisa' },
  { name: 'Rahima Moosa Mother and Child Hospital', province: 'Gauteng', city: 'Johannesburg' },
  { name: 'Helen Joseph Hospital', province: 'Gauteng', city: 'Johannesburg' },
  { name: 'Leratong Hospital', province: 'Gauteng', city: 'Krugersdorp' },
  { name: 'Addington Hospital', province: 'KwaZulu-Natal', city: 'Durban' },
  { name: 'Edendale Hospital', province: 'KwaZulu-Natal', city: 'Pietermaritzburg' },
  { name: 'Ngwelezana Hospital', province: 'KwaZulu-Natal', city: 'Empangeni' },
  { name: 'Cecilia Makiwane Hospital', province: 'Eastern Cape', city: 'East London' },
  { name: 'Livingstone Hospital', province: 'Eastern Cape', city: 'Port Elizabeth' },
  { name: 'Victoria Hospital', province: 'Western Cape', city: 'Wynberg' },
  { name: 'Karl Bremer Hospital', province: 'Western Cape', city: 'Bellville' },
  { name: 'Mthatha General Hospital', province: 'Eastern Cape', city: 'Mthatha' },
  { name: 'Mokopane Hospital', province: 'Limpopo', city: 'Mokopane' },
  { name: 'Letaba Hospital', province: 'Limpopo', city: 'Tzaneen' },
];

const INDEPENDENT_FACILITIES = [
  { name: 'Busamed Hillcrest Private Hospital', province: 'KwaZulu-Natal', city: 'Hillcrest' },
  { name: 'Busamed Gateway Private Hospital', province: 'KwaZulu-Natal', city: 'Umhlanga' },
  { name: 'Lenmed Ethekwini Hospital', province: 'KwaZulu-Natal', city: 'Durban' },
  { name: 'Lenmed Ahmed Kathrada Private Hospital', province: 'Gauteng', city: 'Lenasia' },
  { name: 'Melomed Bellville Private Hospital', province: 'Western Cape', city: 'Bellville' },
  { name: 'Melomed Gatesville Private Hospital', province: 'Western Cape', city: 'Athlone' },
  { name: 'Wits Donald Gordon Medical Centre', province: 'Gauteng', city: 'Johannesburg' },
  { name: 'Intercare Medforum Hospital', province: 'Gauteng', city: 'Pretoria' },
  { name: 'Cure Day Clinics Fourways', province: 'Gauteng', city: 'Fourways' },
  { name: 'Akeso Clinic Randburg', province: 'Gauteng', city: 'Randburg' },
  { name: 'Umhlanga Hospital', province: 'KwaZulu-Natal', city: 'Umhlanga' },
  { name: 'Hibiscus Hospital', province: 'KwaZulu-Natal', city: 'Port Shepstone' },
  { name: 'Medicross Midrand', province: 'Gauteng', city: 'Midrand' },
  { name: 'National Renal Care Johannesburg', province: 'Gauteng', city: 'Johannesburg' },
  { name: 'Arwyp Medical Centre', province: 'Gauteng', city: 'Kempton Park' },
  { name: 'Westville Hospital', province: 'KwaZulu-Natal', city: 'Westville' },
  { name: 'Mooimed Private Hospital', province: 'Free State', city: 'Bloemfontein' },
  { name: 'Louis Pasteur Private Hospital', province: 'Free State', city: 'Bloemfontein' },
  { name: 'Sunward Park Hospital', province: 'Gauteng', city: 'Boksburg' },
  { name: 'Flora Clinic', province: 'Gauteng', city: 'Roodepoort' },
];

// Deterministic pseudo-random using seed
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

const CONTACT_FIRST_NAMES = [
  'Sarah', 'James', 'Nomsa', 'David', 'Fatima', 'Michael', 'Thandi', 'Johan',
  'Priya', 'Samuel', 'Elizabeth', 'Peter', 'Grace', 'Daniel', 'Lindiwe', 'Andrew',
  'Martha', 'William', 'Helen', 'Richard', 'Zanele', 'Thomas', 'Mary', 'Charles',
];

const CONTACT_LAST_NAMES = [
  'Van Zyl', 'Nkosi', 'Pillay', 'Smith', 'Molefe', 'Pretorius', 'Govender',
  'Dlamini', 'Botha', 'Mkhize', 'Williams', 'Ndlovu', 'Du Plessis', 'Naidoo',
  'Khumalo', 'Meyer', 'Sithole', 'Jacobs', 'Zulu', 'De Villiers',
];

const OUTREACH_STAGES = [
  'Identified', 'Outreach Sent', 'Follow-Up Pending', 'Responded',
  'Engaged / Meeting Set', 'Active', 'Dormant', 'Closed',
];

const OUTREACH_APPROACHES = [
  'Info Session Partnership', 'Job Fair Presence', 'Nurse Referral Agreement', 'Other',
];

const PREFERRED_CHANNELS = ['Email', 'LinkedIn', 'Phone', 'WhatsApp', 'In-person'];

export function seedFacilities() {
  const rand = seededRandom(123);
  const facilities = [];

  // Combine all facilities with their healthcare group
  const allFacilityData = [
    ...LIFE_HEALTHCARE_FACILITIES.map(f => ({ ...f, healthcareGroup: 'Life Healthcare', facilityType: 'Private' })),
    ...MEDICLINIC_FACILITIES.map(f => ({ ...f, healthcareGroup: 'Mediclinic', facilityType: 'Private' })),
    ...NETCARE_FACILITIES.map(f => ({ ...f, healthcareGroup: 'Netcare', facilityType: 'Private' })),
    ...PUBLIC_FACILITIES.map(f => ({ ...f, healthcareGroup: 'Public', facilityType: 'Public' })),
    ...INDEPENDENT_FACILITIES.map(f => ({ ...f, healthcareGroup: 'Independent', facilityType: 'Private' })),
  ];

  // Take exactly 108
  const selectedFacilities = allFacilityData.slice(0, 108);

  for (let i = 0; i < selectedFacilities.length; i++) {
    const fData = selectedFacilities[i];
    const contactFirst = pick(CONTACT_FIRST_NAMES, rand);
    const contactLast = pick(CONTACT_LAST_NAMES, rand);
    const contactName = `${contactFirst} ${contactLast}`;
    const cleanFirst = contactFirst.toLowerCase().replace(/[^a-z]/g, '');
    const cleanLast = contactLast.toLowerCase().replace(/[^a-z]/g, '');
    const orgNameClean = fData.name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 15);

    // Weighted stage distribution - most should be in early stages
    const stageWeights = [
      'Identified', 'Identified', 'Identified',
      'Outreach Sent', 'Outreach Sent',
      'Follow-Up Pending', 'Follow-Up Pending',
      'Responded',
      'Engaged / Meeting Set',
      'Active', 'Active',
      'Dormant',
    ];

    const stage = pick(stageWeights, rand);
    const hasInfoSession = stage === 'Active' || (stage === 'Engaged / Meeting Set' && rand() > 0.5);
    const nursesSourced = hasInfoSession ? Math.floor(rand() * 8) : 0;
    const nursesConverted = nursesSourced > 0 ? Math.floor(rand() * nursesSourced) : 0;

    facilities.push({
      id: `facility-${String(i + 1).padStart(3, '0')}`,
      organisationName: fData.name,
      organisationType: 'Health Facility',
      province: fData.province,
      city: fData.city,
      physicalAddress: `${Math.floor(rand() * 200 + 1)} ${pick(['Main', 'Hospital', 'Medical', 'Health', 'Park', 'Church', 'Voortrekker', 'Rivonia', 'Oxford', 'Jan Smuts'], rand)} ${pick(['Road', 'Street', 'Drive', 'Avenue', 'Boulevard'], rand)}, ${fData.city}`,
      primaryContactName: contactName,
      contactEmail: `${cleanFirst}.${cleanLast}@${orgNameClean}.co.za`,
      contactPhone: `+27${Math.floor(rand() * 9 + 1)}${Math.floor(rand() * 10000000 + 10000000)}`,
      website: `https://www.${orgNameClean}.co.za`,
      currentStage: stage,
      lastContactDate: stage !== 'Identified' ? generateDate(rand, 2025, 2026) : '',
      nextFollowUpDate: ['Follow-Up Pending', 'Outreach Sent', 'Responded', 'Active'].includes(stage)
        ? generateDate(rand, 2026, 2026)
        : '',
      preferredChannel: pick(PREFERRED_CHANNELS, rand),
      nursesSourcedCount: nursesSourced,
      internalRating: Math.floor(rand() * 5) + 1,
      notes: rand() > 0.6 ? pick([
        'Very responsive contact. Interested in partnership.',
        'Large facility with many nurses. High potential.',
        'Matron is enthusiastic about international opportunities for staff.',
        'Initial meeting went well. Follow up with info session proposal.',
        'Contact via nursing manager preferred over HR.',
        'Previously hosted a career development talk. Open to info sessions.',
        'Small facility but engaged team. Worth maintaining relationship.',
        'Key decision maker is on leave until next month.',
      ], rand) : '',
      healthcareGroup: fData.healthcareGroup,
      facilityType: fData.facilityType,
      overview: pick([
        'Major tertiary hospital with comprehensive nursing staff.',
        'Community hospital serving the local population.',
        'Private hospital with specialised units including ICU and Theatre.',
        'Academic hospital affiliated with nearby university.',
        'District hospital with general and emergency services.',
        'Specialist facility with highly trained nursing teams.',
        'Multi-disciplinary private hospital.',
      ], rand),
      outreachApproach: pick(OUTREACH_APPROACHES, rand),
      infoSessionHeld: hasInfoSession,
      infoSessionDate: hasInfoSession ? generateDate(rand, 2025, 2026) : '',
      nursesAttendingInfoSession: hasInfoSession ? Math.floor(rand() * 20 + 5) : 0,
      nursesConvertedToApplicants: nursesConverted,
    });
  }

  return facilities;
}
