import { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Target, Plus, ChevronDown } from 'lucide-react';

// Facility data for UK/Ireland matching
const DESTINATION_FACILITIES = [
  { id: 'uk-001', name: 'Royal London Hospital', country: 'UK', specialties: ['Emergency', 'ICU', 'Medical/Surgical'], languages: ['English'], requirements: ['NMC Registration', 'Band 5+'] },
  { id: 'uk-002', name: 'St Thomas Hospital', country: 'UK', specialties: ['Medical/Surgical', 'Oncology', 'Theatre'], languages: ['English'], requirements: ['NMC Registration', 'Band 5+'] },
  { id: 'uk-003', name: 'Manchester Royal Infirmary', country: 'UK', specialties: ['ICU', 'Emergency', 'Paediatrics'], languages: ['English'], requirements: ['NMC Registration', 'Band 5+'] },
  { id: 'uk-004', name: 'Leeds General Infirmary', country: 'UK', specialties: ['Medical/Surgical', 'Midwifery', 'Mental Health'], languages: ['English'], requirements: ['NMC Registration'] },
  { id: 'uk-005', name: 'Queen Elizabeth Hospital Birmingham', country: 'UK', specialties: ['Theatre', 'Oncology', 'Renal'], languages: ['English'], requirements: ['NMC Registration', 'Band 5+'] },
  { id: 'uk-006', name: 'Addenbrookes Hospital Cambridge', country: 'UK', specialties: ['Paediatrics', 'ICU', 'PHC-Community'], languages: ['English'], requirements: ['NMC Registration'] },
  { id: 'uk-007', name: 'Royal Edinburgh Hospital', country: 'UK', specialties: ['Mental Health', 'PHC-Community', 'Medical/Surgical'], languages: ['English'], requirements: ['NMC Registration'] },
  { id: 'uk-008', name: 'University Hospital Wales', country: 'UK', specialties: ['Emergency', 'Midwifery', 'Theatre'], languages: ['English', 'Welsh'], requirements: ['NMC Registration'] },
  { id: 'ie-001', name: 'Mater Misericordiae Dublin', country: 'Ireland', specialties: ['Medical/Surgical', 'ICU', 'Emergency'], languages: ['English'], requirements: ['NMBI Registration'] },
  { id: 'ie-002', name: 'St James Hospital Dublin', country: 'Ireland', specialties: ['Oncology', 'Medical/Surgical', 'Renal'], languages: ['English'], requirements: ['NMBI Registration'] },
  { id: 'ie-003', name: 'Cork University Hospital', country: 'Ireland', specialties: ['Paediatrics', 'Midwifery', 'Theatre'], languages: ['English'], requirements: ['NMBI Registration'] },
  { id: 'ie-004', name: 'University Hospital Galway', country: 'Ireland', specialties: ['Emergency', 'Mental Health', 'ICU'], languages: ['English', 'Irish'], requirements: ['NMBI Registration'] },
  { id: 'ie-005', name: 'Beaumont Hospital Dublin', country: 'Ireland', specialties: ['Medical/Surgical', 'Renal', 'Oncology'], languages: ['English'], requirements: ['NMBI Registration'] },
  { id: 'ie-006', name: 'Tallaght University Hospital', country: 'Ireland', specialties: ['Paediatrics', 'PHC-Community', 'Emergency'], languages: ['English'], requirements: ['NMBI Registration'] },
];

function calculateMatchScore(nurse, facility) {
  let score = 0;

  // Specialty match (40% weight)
  const nurseSpecialty = nurse.primaryClinicalSpecialty || nurse.specialty || '';
  if (facility.specialties.includes(nurseSpecialty)) {
    score += 40;
  } else {
    // Partial match for related specialties
    score += 10;
  }

  // Location preference (20% weight) - UK/Ireland preference
  const preferredCountry = nurse.targetCountry || (Math.random() > 0.5 ? 'UK' : 'Ireland');
  if (facility.country === preferredCountry) {
    score += 20;
  } else {
    score += 8;
  }

  // Language (25% weight) - OET passed = English proficiency
  const hasEnglish = nurse.oetStatus === 'Passed' || nurse.efSetLevel === 'C1' || nurse.efSetLevel === 'B2';
  if (hasEnglish) {
    score += 25;
  } else if (nurse.efSetLevel === 'B1') {
    score += 15;
  } else {
    score += 5;
  }

  // Requirements (15% weight)
  const hasQualification = nurse.highestQualification && nurse.highestQualification !== 'Diploma';
  const hasExperience = nurse.yearsOfClinicalExperience !== 'Less than 1 year';
  if (hasQualification && hasExperience) {
    score += 15;
  } else if (hasQualification || hasExperience) {
    score += 8;
  } else {
    score += 3;
  }

  return Math.min(score, 100);
}

export default function FacilityMatchingEngine() {
  const { nurses, placements, updatePlacements } = useAppContext();
  const [overrides, setOverrides] = useState({});
  const [createdMessage, setCreatedMessage] = useState('');

  // Filter nurses that are at Placement Ready or OET Passed
  const eligibleNurses = useMemo(() => {
    return nurses.filter(
      (n) => n.pipelineStage === 'Placement Ready' || n.pipelineStage === 'OET Passed'
    );
  }, [nurses]);

  // Calculate matches for each eligible nurse
  const nurseMatches = useMemo(() => {
    return eligibleNurses.map((nurse) => {
      const matches = DESTINATION_FACILITIES.map((facility) => ({
        facility,
        score: calculateMatchScore(nurse, facility),
      }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      return { nurse, matches };
    });
  }, [eligibleNurses]);

  function handleOverride(nurseId, facilityId) {
    setOverrides((prev) => ({ ...prev, [nurseId]: facilityId }));
  }

  function handleCreatePlacement(nurse, facilityId) {
    const facility = DESTINATION_FACILITIES.find((f) => f.id === facilityId);
    if (!facility) return;

    const matchScore = calculateMatchScore(nurse, facility);

    const newPlacement = {
      id: `placement-${String(placements.length + 1).padStart(3, '0')}`,
      nurseId: nurse.id,
      nurseName: nurse.fullName,
      targetCountry: facility.country,
      facilityId: facility.id,
      facilityName: facility.name,
      currentStage: 'Ready for Placement',
      daysInStage: 0,
      matchScore,
      specialty: nurse.primaryClinicalSpecialty || 'Medical/Surgical',
      visaStatus: 'Not Started',
      contractDetails: {
        startDate: '',
        salaryBand: 'Band 5 (GBP 28,407-34,581)',
        role: `${nurse.primaryClinicalSpecialty || 'General'} Nurse`,
      },
      relocationChecklist: [
        { item: 'Accommodation arranged', checked: false },
        { item: 'Bank account opened', checked: false },
        { item: 'NMC registration submitted', checked: false },
        { item: 'Right to work confirmed', checked: false },
        { item: 'Airport pickup scheduled', checked: false },
        { item: 'Orientation date set', checked: false },
        { item: 'Uniform ordered', checked: false },
        { item: 'IT access requested', checked: false },
      ],
      stageHistory: [
        { stage: 'Ready for Placement', enteredAt: new Date().toISOString().split('T')[0] },
      ],
    };

    updatePlacements([...placements, newPlacement]);
    setCreatedMessage(`Placement created for ${nurse.fullName} at ${facility.name}`);
    setTimeout(() => setCreatedMessage(''), 3000);
  }

  function getInitials(name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{eligibleNurses.length}</span> nurses ready for matching
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Scoring: Specialty 40% | Location 20% | Language 25% | Requirements 15%
          </p>
        </div>
      </div>

      {/* Success message */}
      {createdMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {createdMessage}
        </div>
      )}

      {/* Nurse Match Cards */}
      {nurseMatches.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Target size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No nurses currently eligible for placement matching</p>
          <p className="text-xs text-gray-400 mt-1">
            Nurses at &quot;Placement Ready&quot; or &quot;OET Passed&quot; stage will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {nurseMatches.map(({ nurse, matches }) => {
            const selectedFacility = overrides[nurse.id] || matches[0]?.facility.id;

            return (
              <div
                key={nurse.id}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                {/* Nurse Info */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#5B2D8E]/10 text-[#5B2D8E] flex items-center justify-center text-sm font-bold">
                    {getInitials(nurse.fullName)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{nurse.fullName}</p>
                    <p className="text-xs text-gray-500">
                      {nurse.primaryClinicalSpecialty} | {nurse.pipelineStage}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCreatePlacement(nurse, selectedFacility)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#5B2D8E] text-white text-xs font-medium rounded-lg hover:bg-[#4a2475] transition-colors"
                  >
                    <Plus size={14} />
                    Create Placement
                  </button>
                </div>

                {/* Top 3 Matches */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {matches.map(({ facility, score }, idx) => (
                    <div
                      key={facility.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedFacility === facility.id
                          ? 'border-[#5B2D8E] bg-[#5B2D8E]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleOverride(nurse.id, facility.id)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-500">#{idx + 1}</span>
                        <span className={`text-xs font-bold ${
                          score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {score}%
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate">{facility.name}</p>
                      <p className="text-xs text-gray-500">{facility.country}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {facility.specialties.slice(0, 2).map((s) => (
                          <span key={s} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Manual Override */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Override:</span>
                  <div className="relative">
                    <select
                      value={selectedFacility}
                      onChange={(e) => handleOverride(nurse.id, e.target.value)}
                      className="text-xs border border-gray-200 rounded px-2 py-1 pr-6 appearance-none bg-white"
                    >
                      {DESTINATION_FACILITIES.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({f.country})
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
