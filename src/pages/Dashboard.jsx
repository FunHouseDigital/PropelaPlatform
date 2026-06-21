import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronDown, UserPlus, Send } from 'lucide-react';
import { getNurses, getFacilities } from '../lib/storage';
import SplashScreen from '../components/dashboard/SplashScreen';
import ActionMetrics from '../components/dashboard/ActionMetrics';
import ActionsPanel from '../components/dashboard/ActionsPanel';
import CohortPulse from '../components/dashboard/CohortPulse';
import RedFlags from '../components/dashboard/RedFlags';
import RecentActivity from '../components/dashboard/RecentActivity';

const EXIT_STATES = ['Placed', 'Deferred', 'Dropped Out', 'Recommended Pathway', 'Not Selected', "Didn't Qualify"];
const COHORT_STAGES = [
  'Selected for Cohort', 'Reserve', 'Cohort Confirmed', 'Training Active',
  'OET Registered', 'OET Passed', 'OET Failed', 'Placement Ready', 'Placed',
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

function getDateStr(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split('T')[0];
}

function formatTodayDisplay() {
  return new Date().toLocaleDateString('en-ZA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function Dashboard() {
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem('propela_splash_shown');
  });
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const navigate = useNavigate();

  const handleSplashComplete = useCallback(() => {
    sessionStorage.setItem('propela_splash_shown', 'true');
    setShowSplash(false);
  }, []);

  const nurses = useMemo(() => getNurses(), []);
  const facilities = useMemo(() => getFacilities(), []);

  const today = getTodayStr();
  const threeDaysLater = getDateStr(3);

  // Actions Needed: nurses with overdue or due-today Next Action
  const actionsNeededNurses = useMemo(() => {
    return nurses.filter((n) => {
      if (!n.nextActionDueDate || n.nextAction === 'No action required') return false;
      return n.nextActionDueDate <= today;
    });
  }, [nurses, today]);

  // Active Nurses: in pipeline excluding exit states
  const activeNurses = useMemo(() => {
    return nurses.filter((n) => !EXIT_STATES.includes(n.pipelineStage));
  }, [nurses]);

  // Hub Follow-ups: facilities with nextFollowUpDate <= today
  const hubFollowUps = useMemo(() => {
    return facilities.filter((f) => f.nextFollowUpDate && f.nextFollowUpDate <= today);
  }, [facilities, today]);

  // Actions Panel groups
  const overdueNurses = useMemo(() => {
    return nurses.filter((n) => {
      if (!n.nextActionDueDate || n.nextAction === 'No action required') return false;
      return n.nextActionDueDate < today;
    });
  }, [nurses, today]);

  const dueTodayNurses = useMemo(() => {
    return nurses.filter((n) => {
      if (!n.nextActionDueDate || n.nextAction === 'No action required') return false;
      return n.nextActionDueDate === today;
    });
  }, [nurses, today]);

  const upcomingNurses = useMemo(() => {
    return nurses.filter((n) => {
      if (!n.nextActionDueDate || n.nextAction === 'No action required') return false;
      return n.nextActionDueDate > today && n.nextActionDueDate <= threeDaysLater;
    });
  }, [nurses, today, threeDaysLater]);

  // Cohort nurses
  const cohortNurses = useMemo(() => {
    return nurses.filter((n) => n.cohortAssigned === 'Cohort 1');
  }, [nurses]);

  // Red Flags: nurses with [FLAG] in notesFlags
  const flaggedNurses = useMemo(() => {
    return nurses.filter(
      (n) => n.notesFlags && n.notesFlags.includes('[FLAG]')
    );
  }, [nurses]);

  // Recent Activity: gather communication logs from all nurses
  const recentActivities = useMemo(() => {
    const entries = [];
    nurses.forEach((nurse) => {
      if (nurse.communicationLog && Array.isArray(nurse.communicationLog)) {
        nurse.communicationLog.forEach((log) => {
          entries.push({
            ...log,
            nurseName: nurse.fullName,
            nurseId: nurse.id,
          });
        });
      }
    });
    // Sort by date descending
    entries.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      return dateB.localeCompare(dateA);
    });
    return entries.slice(0, 10);
  }, [nurses]);

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {getGreeting()}, Aya
          </h1>
          <p className="text-sm text-gray-500">{formatTodayDisplay()}</p>
        </div>

        <div className="relative">
          <button
            onClick={() => setQuickAddOpen(!quickAddOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-[#5B2D8E] text-white rounded-lg hover:bg-[#3D1D5E] transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            Quick Add
            <ChevronDown size={14} className={`transition-transform ${quickAddOpen ? 'rotate-180' : ''}`} />
          </button>
          {quickAddOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 w-48">
              <button
                onClick={() => {
                  setQuickAddOpen(false);
                  navigate('/nurses', { state: { openNewNurse: true } });
                }}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
              >
                <UserPlus size={14} />
                + New Nurse
              </button>
              <button
                onClick={() => {
                  setQuickAddOpen(false);
                  navigate('/outreach');
                }}
                className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm text-gray-700"
              >
                <Send size={14} />
                + Log Outreach
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Row 1: Metric tiles */}
      <ActionMetrics
        actionsNeeded={actionsNeededNurses.length}
        activeNurses={activeNurses.length}
        cohortStatus="Training"
        hubFollowUps={hubFollowUps.length}
      />

      {/* Row 2: Actions Panel + Cohort Pulse */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mt-4">
        <div className="lg:col-span-3">
          <ActionsPanel
            overdueNurses={overdueNurses}
            dueTodayNurses={dueTodayNurses}
            upcomingNurses={upcomingNurses}
          />
        </div>
        <div className="lg:col-span-2">
          <CohortPulse cohortNurses={cohortNurses} />
        </div>
      </div>

      {/* Row 3: Red Flags + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <RedFlags flaggedNurses={flaggedNurses} />
        <RecentActivity activities={recentActivities} />
      </div>
    </div>
  );
}
