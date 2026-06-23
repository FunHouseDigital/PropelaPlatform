import { useState } from 'react';
import { BookOpen, Sparkles, Map, Rocket } from 'lucide-react';
import KnowledgeBase from '../components/help/KnowledgeBase';
import TourLauncher from '../components/help/TourLauncher';
import { useAppContext } from '../context/AppContext';

const TABS = [
  { id: 'knowledge-base', label: 'Knowledge Base', icon: BookOpen },
  { id: 'onboarding', label: 'Onboarding', icon: Sparkles },
  { id: 'feature-tours', label: 'Feature Tours', icon: Map },
  { id: 'getting-started', label: 'Getting Started', icon: Rocket },
];

const TOUR_CONFIGS = {
  dashboard: {
    id: 'dashboard',
    label: 'Dashboard Tour',
    description: 'Learn about the main dashboard and its widgets.',
    steps: [
      { id: 'dash-1', title: 'Pipeline Overview', content: 'See how many nurses are in each pipeline stage at a glance.' },
      { id: 'dash-2', title: 'Compliance Score', content: 'Monitor overall document compliance across all nurses.' },
      { id: 'dash-3', title: 'Activity Feed', content: 'Track the latest actions and updates from your team.' },
      { id: 'dash-4', title: 'Quick Actions', content: 'Access common tasks quickly from the dashboard.' },
    ],
  },
  nurses: {
    id: 'nurses',
    label: 'Nurse Database Tour',
    description: 'Explore the nurse management features.',
    steps: [
      { id: 'nurse-1', title: 'Nurse List', content: 'View and search all nurses in your database with filtering options.' },
      { id: 'nurse-2', title: 'Add Nurse', content: 'Click here to add a new nurse to your pipeline.' },
      { id: 'nurse-3', title: 'Pipeline Stages', content: 'Each nurse is assigned a pipeline stage that you can update as they progress.' },
    ],
  },
  documents: {
    id: 'documents',
    label: 'Document Management Tour',
    description: 'Learn how to manage and track documents.',
    steps: [
      { id: 'doc-1', title: 'Document List', content: 'See all documents with their current status and expiry dates.' },
      { id: 'doc-2', title: 'Upload Documents', content: 'Upload new documents and assign them to nurses.' },
      { id: 'doc-3', title: 'Verification Queue', content: 'Review and verify submitted documents awaiting approval.' },
    ],
  },
  placements: {
    id: 'placements',
    label: 'Placement Tracker Tour',
    description: 'Discover the placement matching and tracking system.',
    steps: [
      { id: 'place-1', title: 'Active Placements', content: 'View all current placements with status and timeline.' },
      { id: 'place-2', title: 'Create Placement', content: 'Match nurses to facilities and create new placements.' },
      { id: 'place-3', title: 'Calendar View', content: 'See upcoming start dates and milestones on the calendar.' },
    ],
  },
  reports: {
    id: 'reports',
    label: 'Reports & Analytics Tour',
    description: 'Generate insights and export data.',
    steps: [
      { id: 'rep-1', title: 'Report Templates', content: 'Choose from pre-built report templates or create your own.' },
      { id: 'rep-2', title: 'Export Options', content: 'Export reports as CSV, PDF, or schedule automatic delivery.' },
      { id: 'rep-3', title: 'Dashboard Builder', content: 'Create custom dashboard layouts with drag-and-drop widgets.' },
    ],
  },
};

export default function Help() {
  const [activeTab, setActiveTab] = useState('knowledge-base');
  const { onboardingState, updateOnboardingState } = useAppContext();

  const handleRestartOnboarding = () => {
    updateOnboardingState({
      currentStep: 0,
      completedSteps: [],
      isComplete: false,
      skipped: false,
      role: '',
      preferences: {
        emailNotifications: true,
        desktopNotifications: false,
        weeklyDigest: true,
        compactLayout: false,
      },
    });
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Help & Onboarding</h1>
        <p className="text-sm text-gray-500 mt-1">
          Access help articles, guided tours, and onboarding resources
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-150
                ${isActive
                  ? 'bg-white text-[#5B2D8E] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'knowledge-base' && <KnowledgeBase />}

      {activeTab === 'onboarding' && (
        <div className="max-w-lg">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Onboarding Status</h2>
            {onboardingState?.isComplete ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm text-gray-600">
                    {onboardingState.skipped ? 'Onboarding skipped' : 'Onboarding completed'}
                  </span>
                </div>
                {onboardingState.role && (
                  <p className="text-sm text-gray-500 mb-4">Role: {onboardingState.role}</p>
                )}
                {onboardingState.completedAt && (
                  <p className="text-xs text-gray-400 mb-4">
                    Completed: {new Date(onboardingState.completedAt).toLocaleDateString()}
                  </p>
                )}
                <button
                  onClick={handleRestartOnboarding}
                  className="px-4 py-2 text-sm font-medium text-[#5B2D8E] bg-[#5B2D8E]/10 rounded-lg hover:bg-[#5B2D8E]/20 transition-colors"
                >
                  Restart Onboarding
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-sm text-gray-600">Onboarding in progress</span>
                </div>
                <p className="text-sm text-gray-500 mb-2">
                  Step {(onboardingState?.currentStep || 0) + 1} of 5
                </p>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#5B2D8E] rounded-full transition-all"
                    style={{ width: `${(((onboardingState?.currentStep || 0) + 1) / 5) * 100}%` }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'feature-tours' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Take a guided tour of each major module to learn how it works.
          </p>
          <div className="grid gap-3">
            {Object.values(TOUR_CONFIGS).map((tour) => (
              <div
                key={tour.id}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg"
              >
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{tour.label}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{tour.description}</p>
                </div>
                <TourLauncher tourId={tour.id} steps={tour.steps} label="Start" />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'getting-started' && (
        <div className="max-w-2xl space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Start Guide</h2>
            <div className="space-y-4">
              {[
                { step: 1, title: 'Set up your profile', description: 'Go to Settings to configure your name, role, and notification preferences.' },
                { step: 2, title: 'Add nurses to the database', description: 'Navigate to Nurse Database and add your first candidates to the pipeline.' },
                { step: 3, title: 'Upload documents', description: 'Use the Documents module to upload and track required certifications.' },
                { step: 4, title: 'Create placements', description: 'Match nurses to facilities using the Placement Tracker.' },
                { step: 5, title: 'Monitor with analytics', description: 'Check the Dashboard and Analytics for real-time insights into your pipeline.' },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#5B2D8E] text-white flex items-center justify-center text-sm font-bold shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">{item.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#5B2D8E]/5 border border-[#5B2D8E]/20 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-[#5B2D8E] mb-2">Need more help?</h3>
            <p className="text-sm text-gray-600">
              Visit the Knowledge Base tab for detailed articles on every feature, or start
              a Feature Tour for an interactive guided walkthrough of any module.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
