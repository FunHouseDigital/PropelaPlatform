// 108 Health Facility organisations for Acquisition Hub Track 1
// Distributed across all 9 SA provinces

function genOrgId(index) {
  return `org-${String(index).padStart(3, '0')}`
}

function randomDate(start, end) {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
  return d.toISOString().split('T')[0]
}

const provinces = [
  'Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Free State',
  'Mpumalanga', 'Limpopo', 'North West', 'Northern Cape',
]

const stages = [
  'Identified', 'Outreach Sent', 'Follow-Up Pending', 'Responded',
  'Engaged / Meeting Set', 'Active', 'Dormant', 'Closed',
]

const channels = ['Email', 'Phone', 'LinkedIn', 'In-person', 'WhatsApp']

const facilityTypes = [
  'Private Hospital', 'Public Hospital', 'Clinic', 'Day Hospital',
  'Rehabilitation Centre', 'Specialised Unit', 'Community Health Centre',
]

const healthcareGroups = ['Netcare', 'Life Healthcare', 'Mediclinic', 'Public', 'Independent']

// Generate detailed facility data
const facilitiesData = [
  // Netcare facilities (24)
  { name: 'Netcare Milpark Hospital', group: 'Netcare', province: 'Gauteng', city: 'Johannesburg', type: 'Private Hospital' },
  { name: 'Netcare Sunninghill Hospital', group: 'Netcare', province: 'Gauteng', city: 'Sandton', type: 'Private Hospital' },
  { name: 'Netcare Garden City Hospital', group: 'Netcare', province: 'Gauteng', city: 'Johannesburg', type: 'Private Hospital' },
  { name: 'Netcare Olivedale Hospital', group: 'Netcare', province: 'Gauteng', city: 'Randburg', type: 'Private Hospital' },
  { name: 'Netcare Linksfield Hospital', group: 'Netcare', province: 'Gauteng', city: 'Johannesburg', type: 'Private Hospital' },
  { name: 'Netcare Waterfall City Hospital', group: 'Netcare', province: 'Gauteng', city: 'Midrand', type: 'Private Hospital' },
  { name: 'Netcare Pretoria East Hospital', group: 'Netcare', province: 'Gauteng', city: 'Pretoria', type: 'Private Hospital' },
  { name: 'Netcare Unitas Hospital', group: 'Netcare', province: 'Gauteng', city: 'Centurion', type: 'Private Hospital' },
  { name: 'Netcare N1 City Hospital', group: 'Netcare', province: 'Western Cape', city: 'Cape Town', type: 'Private Hospital' },
  { name: 'Netcare Christiaan Barnard Hospital', group: 'Netcare', province: 'Western Cape', city: 'Cape Town', type: 'Private Hospital' },
  { name: 'Netcare Blaauwberg Hospital', group: 'Netcare', province: 'Western Cape', city: 'Cape Town', type: 'Private Hospital' },
  { name: 'Netcare Kuilsriver Hospital', group: 'Netcare', province: 'Western Cape', city: 'Cape Town', type: 'Private Hospital' },
  { name: 'Netcare St Augustine Hospital', group: 'Netcare', province: 'KwaZulu-Natal', city: 'Durban', type: 'Private Hospital' },
  { name: 'Netcare Umhlanga Hospital', group: 'Netcare', province: 'KwaZulu-Natal', city: 'Durban', type: 'Private Hospital' },
  { name: 'Netcare The Bay Hospital', group: 'Netcare', province: 'KwaZulu-Natal', city: 'Richards Bay', type: 'Private Hospital' },
  { name: 'Netcare Greenacres Hospital', group: 'Netcare', province: 'Eastern Cape', city: 'Port Elizabeth', type: 'Private Hospital' },
  { name: 'Netcare Cuyler Hospital', group: 'Netcare', province: 'Eastern Cape', city: 'Uitenhage', type: 'Private Hospital' },
  { name: 'Netcare Universitas Hospital', group: 'Netcare', province: 'Free State', city: 'Bloemfontein', type: 'Private Hospital' },
  { name: 'Netcare Pholoso Hospital', group: 'Netcare', province: 'Limpopo', city: 'Polokwane', type: 'Private Hospital' },
  { name: 'Netcare Ferncrest Hospital', group: 'Netcare', province: 'Mpumalanga', city: 'Nelspruit', type: 'Private Hospital' },
  { name: 'Netcare Jakaranda Hospital', group: 'Netcare', province: 'Gauteng', city: 'Pretoria', type: 'Private Hospital' },
  { name: 'Netcare Montana Hospital', group: 'Netcare', province: 'Gauteng', city: 'Pretoria', type: 'Private Hospital' },
  { name: 'Netcare Rand Hospital', group: 'Netcare', province: 'Gauteng', city: 'Johannesburg', type: 'Private Hospital' },
  { name: 'Netcare Krugersdorp Hospital', group: 'Netcare', province: 'Gauteng', city: 'Krugersdorp', type: 'Private Hospital' },

  // Life Healthcare facilities (22)
  { name: 'Life Fourways Hospital', group: 'Life Healthcare', province: 'Gauteng', city: 'Johannesburg', type: 'Private Hospital' },
  { name: 'Life Flora Hospital', group: 'Life Healthcare', province: 'Gauteng', city: 'Johannesburg', type: 'Private Hospital' },
  { name: 'Life Groenkloof Hospital', group: 'Life Healthcare', province: 'Gauteng', city: 'Pretoria', type: 'Private Hospital' },
  { name: 'Life Eugene Marais Hospital', group: 'Life Healthcare', province: 'Gauteng', city: 'Pretoria', type: 'Private Hospital' },
  { name: 'Life Wilgeheuwel Hospital', group: 'Life Healthcare', province: 'Gauteng', city: 'Roodepoort', type: 'Private Hospital' },
  { name: 'Life Bedford Gardens Hospital', group: 'Life Healthcare', province: 'Gauteng', city: 'Johannesburg', type: 'Private Hospital' },
  { name: 'Life Vincent Pallotti Hospital', group: 'Life Healthcare', province: 'Western Cape', city: 'Cape Town', type: 'Private Hospital' },
  { name: 'Life Kingsbury Hospital', group: 'Life Healthcare', province: 'Western Cape', city: 'Cape Town', type: 'Private Hospital' },
  { name: 'Life Entabeni Hospital', group: 'Life Healthcare', province: 'KwaZulu-Natal', city: 'Durban', type: 'Private Hospital' },
  { name: 'Life Westville Hospital', group: 'Life Healthcare', province: 'KwaZulu-Natal', city: 'Durban', type: 'Private Hospital' },
  { name: 'Life Mount Edgecombe Hospital', group: 'Life Healthcare', province: 'KwaZulu-Natal', city: 'Durban', type: 'Private Hospital' },
  { name: 'Life Hilton Private Hospital', group: 'Life Healthcare', province: 'KwaZulu-Natal', city: 'Pietermaritzburg', type: 'Private Hospital' },
  { name: 'Life St Dominics Hospital', group: 'Life Healthcare', province: 'Eastern Cape', city: 'East London', type: 'Private Hospital' },
  { name: 'Life Beacon Bay Hospital', group: 'Life Healthcare', province: 'Eastern Cape', city: 'East London', type: 'Private Hospital' },
  { name: 'Life Rosepark Hospital', group: 'Life Healthcare', province: 'Free State', city: 'Bloemfontein', type: 'Private Hospital' },
  { name: 'Life Cosmos Hospital', group: 'Life Healthcare', province: 'Mpumalanga', city: 'Witbank', type: 'Private Hospital' },
  { name: 'Life Anncron Hospital', group: 'Life Healthcare', province: 'North West', city: 'Klerksdorp', type: 'Private Hospital' },
  { name: 'Life Robinson Hospital', group: 'Life Healthcare', province: 'North West', city: 'Randfontein', type: 'Private Hospital' },
  { name: 'Life Carstenhof Hospital', group: 'Life Healthcare', province: 'Gauteng', city: 'Midrand', type: 'Private Hospital' },
  { name: 'Life The Glynnwood Hospital', group: 'Life Healthcare', province: 'Gauteng', city: 'Benoni', type: 'Private Hospital' },
  { name: 'Life New Kensington Hospital', group: 'Life Healthcare', province: 'Gauteng', city: 'Johannesburg', type: 'Private Hospital' },
  { name: 'Life Brenthurst Hospital', group: 'Life Healthcare', province: 'Gauteng', city: 'Johannesburg', type: 'Private Hospital' },

  // Mediclinic facilities (22)
  { name: 'Mediclinic Sandton', group: 'Mediclinic', province: 'Gauteng', city: 'Sandton', type: 'Private Hospital' },
  { name: 'Mediclinic Morningside', group: 'Mediclinic', province: 'Gauteng', city: 'Johannesburg', type: 'Private Hospital' },
  { name: 'Mediclinic Midstream', group: 'Mediclinic', province: 'Gauteng', city: 'Centurion', type: 'Private Hospital' },
  { name: 'Mediclinic Heart Hospital', group: 'Mediclinic', province: 'Gauteng', city: 'Pretoria', type: 'Private Hospital' },
  { name: 'Mediclinic Medforum', group: 'Mediclinic', province: 'Gauteng', city: 'Pretoria', type: 'Private Hospital' },
  { name: 'Mediclinic Emfuleni', group: 'Mediclinic', province: 'Gauteng', city: 'Vanderbijlpark', type: 'Private Hospital' },
  { name: 'Mediclinic Constantiaberg', group: 'Mediclinic', province: 'Western Cape', city: 'Cape Town', type: 'Private Hospital' },
  { name: 'Mediclinic Durbanville', group: 'Mediclinic', province: 'Western Cape', city: 'Cape Town', type: 'Private Hospital' },
  { name: 'Mediclinic Stellenbosch', group: 'Mediclinic', province: 'Western Cape', city: 'Stellenbosch', type: 'Private Hospital' },
  { name: 'Mediclinic Worcester', group: 'Mediclinic', province: 'Western Cape', city: 'Worcester', type: 'Private Hospital' },
  { name: 'Mediclinic Pietermaritzburg', group: 'Mediclinic', province: 'KwaZulu-Natal', city: 'Pietermaritzburg', type: 'Private Hospital' },
  { name: 'Mediclinic Newcastle', group: 'Mediclinic', province: 'KwaZulu-Natal', city: 'Newcastle', type: 'Private Hospital' },
  { name: 'Mediclinic Victoria', group: 'Mediclinic', province: 'Free State', city: 'Welkom', type: 'Private Hospital' },
  { name: 'Mediclinic Bloemfontein', group: 'Mediclinic', province: 'Free State', city: 'Bloemfontein', type: 'Private Hospital' },
  { name: 'Mediclinic Hoogland', group: 'Mediclinic', province: 'Free State', city: 'Bethlehem', type: 'Private Hospital' },
  { name: 'Mediclinic Nelspruit', group: 'Mediclinic', province: 'Mpumalanga', city: 'Nelspruit', type: 'Private Hospital' },
  { name: 'Mediclinic Limpopo', group: 'Mediclinic', province: 'Limpopo', city: 'Polokwane', type: 'Private Hospital' },
  { name: 'Mediclinic Tzaneen', group: 'Mediclinic', province: 'Limpopo', city: 'Tzaneen', type: 'Private Hospital' },
  { name: 'Mediclinic Potchefstroom', group: 'Mediclinic', province: 'North West', city: 'Potchefstroom', type: 'Private Hospital' },
  { name: 'Mediclinic Kimberley', group: 'Mediclinic', province: 'Northern Cape', city: 'Kimberley', type: 'Private Hospital' },
  { name: 'Mediclinic Upington', group: 'Mediclinic', province: 'Northern Cape', city: 'Upington', type: 'Private Hospital' },
  { name: 'Mediclinic Ermelo', group: 'Mediclinic', province: 'Mpumalanga', city: 'Ermelo', type: 'Private Hospital' },

  // Public facilities (20)
  { name: 'Charlotte Maxeke Academic Hospital', group: 'Public', province: 'Gauteng', city: 'Johannesburg', type: 'Public Hospital' },
  { name: 'Chris Hani Baragwanath Hospital', group: 'Public', province: 'Gauteng', city: 'Soweto', type: 'Public Hospital' },
  { name: 'Steve Biko Academic Hospital', group: 'Public', province: 'Gauteng', city: 'Pretoria', type: 'Public Hospital' },
  { name: 'Helen Joseph Hospital', group: 'Public', province: 'Gauteng', city: 'Johannesburg', type: 'Public Hospital' },
  { name: 'Tembisa Provincial Tertiary Hospital', group: 'Public', province: 'Gauteng', city: 'Tembisa', type: 'Public Hospital' },
  { name: 'Rahima Moosa Mother and Child Hospital', group: 'Public', province: 'Gauteng', city: 'Johannesburg', type: 'Public Hospital' },
  { name: 'Groote Schuur Hospital', group: 'Public', province: 'Western Cape', city: 'Cape Town', type: 'Public Hospital' },
  { name: 'Tygerberg Hospital', group: 'Public', province: 'Western Cape', city: 'Cape Town', type: 'Public Hospital' },
  { name: 'Red Cross War Memorial Children\'s Hospital', group: 'Public', province: 'Western Cape', city: 'Cape Town', type: 'Public Hospital' },
  { name: 'King Edward VIII Hospital', group: 'Public', province: 'KwaZulu-Natal', city: 'Durban', type: 'Public Hospital' },
  { name: 'Inkosi Albert Luthuli Central Hospital', group: 'Public', province: 'KwaZulu-Natal', city: 'Durban', type: 'Public Hospital' },
  { name: 'Grey\'s Hospital', group: 'Public', province: 'KwaZulu-Natal', city: 'Pietermaritzburg', type: 'Public Hospital' },
  { name: 'Frere Hospital', group: 'Public', province: 'Eastern Cape', city: 'East London', type: 'Public Hospital' },
  { name: 'Dora Nginza Hospital', group: 'Public', province: 'Eastern Cape', city: 'Port Elizabeth', type: 'Public Hospital' },
  { name: 'Universitas Academic Hospital', group: 'Public', province: 'Free State', city: 'Bloemfontein', type: 'Public Hospital' },
  { name: 'Rob Ferreira Hospital', group: 'Public', province: 'Mpumalanga', city: 'Nelspruit', type: 'Public Hospital' },
  { name: 'Pietersburg Hospital', group: 'Public', province: 'Limpopo', city: 'Polokwane', type: 'Public Hospital' },
  { name: 'Mankweng Hospital', group: 'Public', province: 'Limpopo', city: 'Polokwane', type: 'Public Hospital' },
  { name: 'Klerksdorp Hospital', group: 'Public', province: 'North West', city: 'Klerksdorp', type: 'Public Hospital' },
  { name: 'Kimberley Hospital Complex', group: 'Public', province: 'Northern Cape', city: 'Kimberley', type: 'Public Hospital' },

  // Independent facilities (20)
  { name: 'Busamed Hillcrest Private Hospital', group: 'Independent', province: 'KwaZulu-Natal', city: 'Durban', type: 'Private Hospital' },
  { name: 'Busamed Gateway Private Hospital', group: 'Independent', province: 'KwaZulu-Natal', city: 'Durban', type: 'Private Hospital' },
  { name: 'Busamed Modderfontein Private Hospital', group: 'Independent', province: 'Gauteng', city: 'Johannesburg', type: 'Private Hospital' },
  { name: 'Lenmed Royal Hospital', group: 'Independent', province: 'Gauteng', city: 'Johannesburg', type: 'Private Hospital' },
  { name: 'Lenmed Ethekwini Hospital', group: 'Independent', province: 'KwaZulu-Natal', city: 'Durban', type: 'Private Hospital' },
  { name: 'Ahmed Al-Kadi Private Hospital', group: 'Independent', province: 'KwaZulu-Natal', city: 'Durban', type: 'Private Hospital' },
  { name: 'Melomed Bellville Hospital', group: 'Independent', province: 'Western Cape', city: 'Cape Town', type: 'Private Hospital' },
  { name: 'Melomed Gatesville Hospital', group: 'Independent', province: 'Western Cape', city: 'Cape Town', type: 'Private Hospital' },
  { name: 'Melomed Tokai Hospital', group: 'Independent', province: 'Western Cape', city: 'Cape Town', type: 'Private Hospital' },
  { name: 'Intercare Medfem Hospital', group: 'Independent', province: 'Gauteng', city: 'Sandton', type: 'Specialised Unit' },
  { name: 'Wits Donald Gordon Medical Centre', group: 'Independent', province: 'Gauteng', city: 'Johannesburg', type: 'Private Hospital' },
  { name: 'Zamokuhle Private Hospital', group: 'Independent', province: 'Gauteng', city: 'Tembisa', type: 'Private Hospital' },
  { name: 'Arwyp Medical Centre', group: 'Independent', province: 'Gauteng', city: 'Kempton Park', type: 'Private Hospital' },
  { name: 'Westdene Clinic', group: 'Independent', province: 'Free State', city: 'Bloemfontein', type: 'Clinic' },
  { name: 'Hibiscus Hospital', group: 'Independent', province: 'KwaZulu-Natal', city: 'Port Shepstone', type: 'Private Hospital' },
  { name: 'Lowveld Private Hospital', group: 'Independent', province: 'Mpumalanga', city: 'Nelspruit', type: 'Private Hospital' },
  { name: 'Witbank Private Hospital', group: 'Independent', province: 'Mpumalanga', city: 'Witbank', type: 'Private Hospital' },
  { name: 'Zululand Private Hospital', group: 'Independent', province: 'KwaZulu-Natal', city: 'Richards Bay', type: 'Private Hospital' },
  { name: 'N17 Medical Centre', group: 'Independent', province: 'Gauteng', city: 'Springs', type: 'Clinic' },
  { name: 'Paarl Private Hospital', group: 'Independent', province: 'Western Cape', city: 'Paarl', type: 'Private Hospital' },
]

const contactFirstNames = [
  'Sarah', 'Michael', 'Janet', 'David', 'Lisa', 'Peter', 'Amanda', 'John',
  'Catherine', 'Robert', 'Angela', 'James', 'Patricia', 'William', 'Linda',
  'Richard', 'Barbara', 'Thomas', 'Susan', 'Mark', 'Karen', 'Steven',
  'Betty', 'Paul', 'Dorothy', 'Andrew', 'Sandra', 'Joshua', 'Ashley', 'Daniel',
]

const contactLastNames = [
  'van der Merwe', 'Botha', 'Pretorius', 'du Plessis', 'Venter', 'Joubert',
  'Swanepoel', 'Coetzee', 'Steyn', 'van Wyk', 'Kruger', 'Naicker', 'Singh',
  'Moodley', 'Padayachee', 'Maharaj', 'Reddy', 'Nkosi', 'Mthembu', 'Molefe',
  'Williams', 'Adams', 'Smith', 'Johnson', 'Brown', 'Taylor', 'Anderson',
  'Roberts', 'Thompson', 'Martin',
]

const outreachApproaches = [
  'Email introduction with company overview',
  'LinkedIn outreach to nursing director',
  'Phone call to HR department',
  'Referral from existing partner facility',
  'Conference networking follow-up',
  'Cold email to CEO with case study',
  'WhatsApp message to known contact',
  'Industry event introduction',
]

const tags = [
  'High Priority', 'Quick Win', 'Long-term Partner', 'Bulk Sourcing',
  'Training Partner', 'Premium Facility', 'Public Sector', 'Rural Focus',
]

function generateOrganisation(index) {
  const facility = facilitiesData[index]
  const stage = stages[index % stages.length]
  const contactFirst = contactFirstNames[index % contactFirstNames.length]
  const contactLast = contactLastNames[index % contactLastNames.length]

  const nursesSourced = stage === 'Active' ? 2 + (index % 8) : stage === 'Engaged / Meeting Set' ? 1 + (index % 3) : 0
  const internalRating = stage === 'Active' ? 4 + (index % 2) : stage === 'Engaged / Meeting Set' ? 3 + (index % 2) : index % 5 + 1

  const infoSessionHeld = stage === 'Active' || (stage === 'Engaged / Meeting Set' && index % 2 === 0)
  const infoSessionDate = infoSessionHeld ? randomDate(new Date('2025-10-01'), new Date('2026-01-15')) : null
  const nursesAttending = infoSessionHeld ? 5 + (index % 20) : 0
  const nursesConverted = infoSessionHeld ? Math.floor(nursesAttending * (0.2 + (index % 3) * 0.1)) : 0

  return {
    id: genOrgId(index + 1),
    organisationName: facility.name,
    organisationType: 'Health Facility',
    province: facility.province,
    city: facility.city,
    physicalAddress: `${100 + index} ${['Main', 'Hospital', 'Medical', 'Health', 'Park'][index % 5]} Road, ${facility.city}`,
    primaryContactName: `${contactFirst} ${contactLast}`,
    contactEmail: `${contactFirst.toLowerCase()}.${contactLast.toLowerCase().replace(/ /g, '')}@${facility.name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 12)}.co.za`,
    contactPhone: `+27 ${String(11 + (index % 9)).padStart(2, '0')} ${String(200 + index * 3).slice(0, 3)} ${String(4000 + index * 11).slice(0, 4)}`,
    linkedinWebsite: `https://www.${facility.name.toLowerCase().replace(/[^a-z]/g, '').slice(0, 15)}.co.za`,
    currentStage: stage,
    lastContactDate: randomDate(new Date('2025-11-01'), new Date('2026-01-31')),
    nextFollowUpDate: randomDate(new Date('2026-02-01'), new Date('2026-03-31')),
    preferredChannel: channels[index % channels.length],
    nursesSourced,
    internalRating,
    notes: index % 4 === 0 ? 'Very responsive, strong interest in partnership' : index % 4 === 1 ? 'Initial outreach sent, awaiting response' : index % 4 === 2 ? 'Met at SANC conference, good rapport' : 'Follow-up needed after holiday period',
    tags: [tags[index % tags.length], ...(index % 3 === 0 ? [tags[(index + 2) % tags.length]] : [])],
    healthcareGroup: facility.group,
    facilityType: facility.type,
    overviewDescription: `${facility.name} is a ${facility.type.toLowerCase()} in ${facility.city}, ${facility.province}. Part of the ${facility.group} group.`,
    outreachApproach: outreachApproaches[index % outreachApproaches.length],
    infoSessionHeld,
    infoSessionDate,
    nursesAttendingInfoSession: nursesAttending,
    nursesConvertedToApplicants: nursesConverted,
  }
}

// Generate 108 organisations
export const seedOrganisations = Array.from({ length: 108 }, (_, i) => generateOrganisation(i))
