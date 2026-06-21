import { useState, useMemo } from 'react';
import { GraduationCap, Users, Calendar, DollarSign, Plus } from 'lucide-react';
import { getCohorts, saveCohorts, getNurses } from '../lib/storage';
import CohortCard from '../components/cohorts/CohortCard';

function getStatusColor(status) {
  switch (status) {
    case 'Planning': return 'bg-gray-100 text-gray-700';
    case 'Recruiting': return 'bg-blue-100 text-blue-700';
    case 'Training': return 'bg-amber-100 text-amber-700';
    case 'OET Prep': return 'bg-purple-100 text-purple-700';
    case 'Exam Window': return 'bg-orange-100 text-orange-700';
    case 'Placement': return 'bg-green-100 text-green-700';
    case 'Closed': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function formatCurrency(amount) {
  if (!amount && amount !== 0) return '-';
  return 'R ' + Number(amount).toLocaleString('en-ZA');
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function CohortManager() {
  const [cohorts, setCohorts] = useState(() => getCohorts());
  const [selectedCohort, setSelectedCohort] = useState(null);
  const allNurses = useMemo(() => getNurses(), []);

  function getEnrolledCount(cohortName) {
    return allNurses.filter(
      (n) => n.cohortAssigned === cohortName &&
        !['Reserve', 'Not Selected', "Didn't Qualify", 'Dropped Out'].includes(n.pipelineStage)
    ).length;
  }

  function getReserveCount(cohortName) {
    return allNurses.filter(
      (n) => n.cohortAssigned === cohortName && n.pipelineStage === 'Reserve'
    ).length;
  }

  function handleAddCohort() {
    const newCohort = {
      id: `cohort-${Date.now()}`,
      name: `New Cohort ${cohorts.length + 1}`,
      status: 'Planning',
      sourceCountries: ['South Africa'],
      targetNurses: 10,
      recruitmentOpen: '',
      recruitmentClose: '',
      trainingStart: '',
      trainingEnd: '',
      oetExamDateTarget: '',
      oetResultsExpected: '',
      targetFirstPlacementDate: '',
      trainingProvider: {
        name: '',
        contact: '',
        format: '',
        costPerNurse: 0,
        lessonsPlanned: 0,
        formalAssessment: false,
        prePostProficiencyTracking: false,
        perCandidateProgressReports: false,
        examReadinessCriteriaDefined: false,
        providerNotes: '',
      },
      budget: {
        totalBudget: 0,
        propelaContribution: 0,
        trainingCostActual: 0,
        oetExamCostActual: 0,
        otherCosts: 0,
      },
      outcomes: {
        oetPassRateTarget: 80,
        placementRateTarget: 70,
        totalPlacementFees: 0,
        cohortLearnings: '',
      },
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    const updated = [...cohorts, newCohort];
    setCohorts(updated);
    saveCohorts(updated);
    setSelectedCohort(newCohort);
  }

  function handleCohortUpdate(updatedCohort) {
    setCohorts((prev) =>
      prev.map((c) => (c.id === updatedCohort.id ? updatedCohort : c))
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <GraduationCap size={24} className="text-propela-purple" />
          <h1 className="text-2xl font-semibold text-gray-900">Cohort Manager</h1>
        </div>
        <button
          onClick={handleAddCohort}
          className="flex items-center gap-2 px-4 py-2 bg-propela-purple text-white text-sm font-medium rounded-lg hover:bg-propela-purple/90 transition-colors"
        >
          <Plus size={16} />
          Add Cohort
        </button>
      </div>
      <p className="text-gray-500 text-sm mb-8">
        Track each cohort as a discrete delivery project, from planning through to final placement outcomes and documented learnings.
      </p>

      {/* Cohort Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {cohorts.map((cohort) => {
          const enrolled = getEnrolledCount(cohort.name);
          const reserve = getReserveCount(cohort.name);
          const totalSpent = (cohort.budget?.trainingCostActual || 0) +
            (cohort.budget?.oetExamCostActual || 0) +
            (cohort.budget?.otherCosts || 0);
          const budgetRemaining = (cohort.budget?.totalBudget || 0) - totalSpent;

          return (
            <div
              key={cohort.id}
              onClick={() => setSelectedCohort(cohort)}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 cursor-pointer hover:shadow-md hover:border-propela-purple/20 transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-sm">{cohort.name}</h3>
                <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getStatusColor(cohort.status)}`}>
                  {cohort.status}
                </span>
              </div>

              {/* Enrolled */}
              <div className="flex items-center gap-2 mb-2">
                <Users size={14} className="text-gray-400" />
                <span className="text-sm text-gray-600">
                  <span className="font-medium text-gray-900">{enrolled}</span>/{cohort.targetNurses} enrolled
                  {reserve > 0 && <span className="text-gray-400"> + {reserve} reserve</span>}
                </span>
              </div>

              {/* Timeline */}
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={14} className="text-gray-400" />
                <span className="text-xs text-gray-500">
                  {cohort.trainingStart ? formatDate(cohort.trainingStart) : 'TBD'} - {cohort.trainingEnd ? formatDate(cohort.trainingEnd) : 'TBD'}
                </span>
              </div>

              {/* Budget Summary */}
              <div className="flex items-center gap-2">
                <DollarSign size={14} className="text-gray-400" />
                <span className="text-xs text-gray-500">
                  Budget: {formatCurrency(cohort.budget?.totalBudget)} |{' '}
                  <span className={budgetRemaining >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {formatCurrency(budgetRemaining)} remaining
                  </span>
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-propela-purple rounded-full transition-all"
                    style={{ width: `${cohort.targetNurses > 0 ? Math.min((enrolled / cohort.targetNurses) * 100, 100) : 0}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {cohorts.length === 0 && (
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
          <GraduationCap size={48} className="text-propela-purple/30 mx-auto mb-4" />
          <p className="text-gray-400 text-sm mb-4">No cohorts yet. Create your first cohort to get started.</p>
          <button
            onClick={handleAddCohort}
            className="px-4 py-2 bg-propela-purple text-white text-sm font-medium rounded-lg hover:bg-propela-purple/90"
          >
            Create First Cohort
          </button>
        </div>
      )}

      {/* Cohort Detail Slide-out */}
      {selectedCohort && (
        <CohortCard
          cohort={selectedCohort}
          onClose={() => setSelectedCohort(null)}
          onUpdate={handleCohortUpdate}
        />
      )}
    </div>
  );
}
