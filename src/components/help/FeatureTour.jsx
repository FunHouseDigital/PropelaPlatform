import { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

export default function FeatureTour({ tourId, steps = [], onComplete }) {
  const { tourState, updateTourState } = useAppContext();
  const [currentStep, setCurrentStep] = useState(0);

  // Use computed value instead of effect + state
  const isCompleted = tourState?.completedTours?.includes(tourId);
  const [dismissed, setDismissed] = useState(false);
  const isActive = !isCompleted && !dismissed;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      saveTourProgress(currentStep + 1);
    } else {
      completeTour();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      saveTourProgress(currentStep - 1);
    }
  };

  const handleSkip = () => {
    completeTour();
  };

  const saveTourProgress = (step) => {
    const state = {
      ...tourState,
      currentTourId: tourId,
      currentTourStep: step,
    };
    updateTourState(state);
  };

  const completeTour = () => {
    const completedTours = [...(tourState?.completedTours || [])];
    if (!completedTours.includes(tourId)) {
      completedTours.push(tourId);
    }
    const state = {
      ...tourState,
      completedTours,
      currentTourId: null,
      currentTourStep: 0,
    };
    updateTourState(state);
    setDismissed(true);
    if (onComplete) onComplete();
  };

  if (!isActive || steps.length === 0) return null;

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[9998]">
      {/* Dark overlay with spotlight effect */}
      <div className="absolute inset-0 bg-black/60" onClick={handleSkip} />

      {/* Tour tooltip */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="bg-white rounded-xl shadow-2xl p-5 w-80">
          {/* Close button */}
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs text-[#5B2D8E] font-medium bg-[#5B2D8E]/10 px-2 py-0.5 rounded-full">
              Step {currentStep + 1} of {steps.length}
            </span>
            <button
              onClick={handleSkip}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <h3 className="text-base font-semibold text-gray-900 mb-2">{step.title}</h3>
          <p className="text-sm text-gray-600 mb-4">{step.content}</p>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 mb-4">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === currentStep ? 'bg-[#5B2D8E]' : i < currentStep ? 'bg-[#5B2D8E]/40' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={handleSkip}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Skip tour
            </button>
            <div className="flex gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md"
                >
                  <ChevronLeft size={14} />
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-[#5B2D8E] text-white rounded-md hover:bg-[#4a2475]"
              >
                {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                {currentStep < steps.length - 1 && <ChevronRight size={14} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
