import { useState } from 'react';
import {
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Users,
  Shield,
  Briefcase,
  Eye,
  LayoutDashboard,
  FileText,
  BarChart3,
  Bell,
  Sparkles,
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const ROLE_OPTIONS = [
  { id: 'Recruiter', icon: Users, description: 'Manage nurse recruitment pipeline' },
  { id: 'Admin', icon: Shield, description: 'Full system access and configuration' },
  { id: 'Manager', icon: Briefcase, description: 'Team oversight and reporting' },
  { id: 'Viewer', icon: Eye, description: 'Read-only access to dashboards' },
];

const FEATURE_HIGHLIGHTS = [
  { icon: LayoutDashboard, title: 'Dashboard', description: 'Real-time metrics and pipeline overview' },
  { icon: Users, title: 'Nurse Database', description: 'Comprehensive candidate management' },
  { icon: FileText, title: 'Documents', description: 'Track certifications and compliance' },
  { icon: Briefcase, title: 'Placements', description: 'Match nurses to facilities' },
  { icon: BarChart3, title: 'Analytics', description: 'Insights and performance metrics' },
  { icon: Bell, title: 'Notifications', description: 'Stay informed of important updates' },
];

export default function OnboardingWizard() {
  const { onboardingState, updateOnboardingState } = useAppContext();
  const [currentStep, setCurrentStep] = useState(() => onboardingState?.currentStep || 0);
  const [selectedRole, setSelectedRole] = useState(() => onboardingState?.role || '');
  const [preferences, setPreferences] = useState(
    () => onboardingState?.preferences || {
      emailNotifications: true,
      desktopNotifications: false,
      weeklyDigest: true,
      compactLayout: false,
    }
  );

  const steps = ['welcome', 'role-selection', 'feature-tour', 'preferences', 'completion'];

  const saveProgress = (step, additionalData = {}) => {
    const state = {
      ...onboardingState,
      currentStep: step,
      role: selectedRole,
      preferences,
      completedSteps: steps.slice(0, step),
      ...additionalData,
    };
    updateOnboardingState(state);
  };

  const handleNext = () => {
    const nextStep = currentStep + 1;
    if (nextStep >= steps.length) {
      // Complete onboarding
      const finalState = {
        currentStep: steps.length - 1,
        role: selectedRole,
        preferences,
        completedSteps: steps,
        isComplete: true,
        skipped: false,
        completedAt: new Date().toISOString(),
      };
      updateOnboardingState(finalState);
      return;
    }
    setCurrentStep(nextStep);
    saveProgress(nextStep);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      saveProgress(prevStep);
    }
  };

  const handleSkip = () => {
    const finalState = {
      ...onboardingState,
      currentStep: steps.length - 1,
      isComplete: true,
      skipped: true,
      completedAt: new Date().toISOString(),
    };
    updateOnboardingState(finalState);
  };

  // If onboarding is already complete, do not render
  if (onboardingState?.isComplete) return null;

  const renderStepContent = () => {
    switch (steps[currentStep]) {
      case 'welcome':
        return (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-[#5B2D8E]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles size={40} className="text-[#5B2D8E]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Welcome to Propela Ops</h2>
            <p className="text-gray-600 max-w-md mx-auto">
              Your all-in-one platform for managing international nurse recruitment.
              Let us help you get set up in just a few quick steps.
            </p>
          </div>
        );

      case 'role-selection':
        return (
          <div className="py-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Select Your Role</h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              This helps us personalize your experience
            </p>
            <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
              {ROLE_OPTIONS.map((role) => {
                const Icon = role.icon;
                const isSelected = selectedRole === role.id;
                return (
                  <button
                    key={role.id}
                    onClick={() => setSelectedRole(role.id)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-[#5B2D8E] bg-[#5B2D8E]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon size={24} className={isSelected ? 'text-[#5B2D8E]' : 'text-gray-400'} />
                    <span className={`text-sm font-medium ${isSelected ? 'text-[#5B2D8E]' : 'text-gray-700'}`}>
                      {role.id}
                    </span>
                    <span className="text-xs text-gray-500 text-center">{role.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'feature-tour':
        return (
          <div className="py-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Feature Highlights</h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              Here are the key features you will use most often
            </p>
            <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
              {FEATURE_HIGHLIGHTS.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#5B2D8E]/10 flex items-center justify-center shrink-0">
                      <Icon size={16} className="text-[#5B2D8E]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{feature.title}</h4>
                      <p className="text-xs text-gray-500">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case 'preferences':
        return (
          <div className="py-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2 text-center">Set Your Preferences</h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              Customize notifications and display settings
            </p>
            <div className="max-w-md mx-auto space-y-3">
              {[
                { key: 'emailNotifications', label: 'Email Notifications', desc: 'Receive important updates via email' },
                { key: 'desktopNotifications', label: 'Desktop Notifications', desc: 'Get browser push notifications' },
                { key: 'weeklyDigest', label: 'Weekly Digest', desc: 'Receive a weekly summary report' },
                { key: 'compactLayout', label: 'Compact Layout', desc: 'Use a more condensed interface' },
              ].map((pref) => (
                <label
                  key={pref.key}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{pref.label}</p>
                    <p className="text-xs text-gray-500">{pref.desc}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences[pref.key]}
                    onChange={(e) => setPreferences({ ...preferences, [pref.key]: e.target.checked })}
                    className="w-4 h-4 text-[#5B2D8E] rounded border-gray-300 focus:ring-[#5B2D8E]"
                  />
                </label>
              ))}
            </div>
          </div>
        );

      case 'completion':
        return (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">You Are All Set!</h2>
            <p className="text-gray-600 max-w-md mx-auto mb-2">
              Your account is configured and ready to go.
            </p>
            {selectedRole && (
              <p className="text-sm text-[#5B2D8E] font-medium">
                Role: {selectedRole}
              </p>
            )}
            <div className="mt-6 flex justify-center gap-1">
              {[...Array(12)].map((_, i) => (
                <span
                  key={i}
                  className="inline-block w-2 h-2 rounded-full bg-[#5B2D8E] animate-pulse"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden">
        {/* Progress Bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-[#5B2D8E] transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Skip Button */}
        <div className="flex justify-end px-4 pt-3">
          <button
            onClick={handleSkip}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
            <X size={14} />
            Skip
          </button>
        </div>

        {/* Content */}
        <div className="px-8 pb-6">
          {renderStepContent()}

          {/* Step Indicator Dots */}
          <div className="flex justify-center gap-2 mt-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentStep ? 'bg-[#5B2D8E]' : i < currentStep ? 'bg-[#5B2D8E]/40' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className={`flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentStep === 0
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-6 py-2 rounded-lg text-sm font-medium bg-[#5B2D8E] text-white hover:bg-[#4a2475] transition-colors"
            >
              {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
              {currentStep < steps.length - 1 && <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
