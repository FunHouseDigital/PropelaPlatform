import { useState, useCallback, useRef, useSyncExternalStore } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

/**
 * A resize/scroll "store" that triggers re-render when layout changes.
 * We use useSyncExternalStore to avoid the lint issue with setState in effects.
 */
let layoutVersion = 0;
const layoutListeners = new Set();

function subscribeToLayout(callback) {
  layoutListeners.add(callback);
  const handleLayout = () => {
    layoutVersion++;
    layoutListeners.forEach((l) => l());
  };
  // Only add DOM listeners once (first subscriber)
  if (layoutListeners.size === 1) {
    window.addEventListener('resize', handleLayout);
    window.addEventListener('scroll', handleLayout, true);
  }
  return () => {
    layoutListeners.delete(callback);
    if (layoutListeners.size === 0) {
      window.removeEventListener('resize', handleLayout);
      window.removeEventListener('scroll', handleLayout, true);
    }
  };
}

function getLayoutSnapshot() {
  return layoutVersion;
}

function computePosition(step) {
  if (!step) return { tooltipStyle: null, spotlightStyle: null };

  const target = step.target ? document.querySelector(step.target) : null;

  if (target) {
    const rect = target.getBoundingClientRect();
    const padding = 8;

    const spotlightStyle = {
      position: 'fixed',
      top: `${rect.top - padding}px`,
      left: `${rect.left - padding}px`,
      width: `${rect.width + padding * 2}px`,
      height: `${rect.height + padding * 2}px`,
      borderRadius: '8px',
      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
      zIndex: 9998,
      pointerEvents: 'none',
    };

    // Position tooltip below or above the element depending on available space
    const tooltipHeight = 220;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placeBelow = spaceBelow > tooltipHeight + 20;

    const tooltipLeft = Math.max(
      16,
      Math.min(rect.left + rect.width / 2 - 160, window.innerWidth - 336)
    );

    const tooltipStyle = placeBelow
      ? { position: 'fixed', top: `${rect.bottom + padding + 12}px`, left: `${tooltipLeft}px`, zIndex: 9999 }
      : { position: 'fixed', bottom: `${window.innerHeight - rect.top + padding + 12}px`, left: `${tooltipLeft}px`, zIndex: 9999 };

    return { tooltipStyle, spotlightStyle };
  }

  // Fallback: viewport center when target element is not found
  return {
    tooltipStyle: { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 9999 },
    spotlightStyle: null,
  };
}

export default function FeatureTour({ tourId, steps = [], onComplete, active = true }) {
  const { tourState, updateTourState } = useAppContext();
  const [currentStep, setCurrentStep] = useState(0);
  const tooltipRef = useRef(null);

  const [dismissed, setDismissed] = useState(false);
  const isVisible = active && !dismissed && steps.length > 0;

  // Subscribe to layout changes to re-compute position on resize/scroll
  useSyncExternalStore(subscribeToLayout, getLayoutSnapshot);

  // Compute position from current step (re-runs on render triggered by layout changes)
  const step = isVisible && currentStep < steps.length ? steps[currentStep] : null;
  const { tooltipStyle, spotlightStyle } = isVisible ? computePosition(step) : { tooltipStyle: null, spotlightStyle: null };

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

  const saveTourProgress = useCallback((stepIdx) => {
    const state = {
      ...tourState,
      currentTourId: tourId,
      currentTourStep: stepIdx,
    };
    updateTourState(state);
  }, [tourState, tourId, updateTourState]);

  const completeTour = useCallback(() => {
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
  }, [tourState, tourId, updateTourState, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9998]">
      {/* Dark overlay - only shown when no spotlight target is found */}
      {!spotlightStyle && (
        <div className="absolute inset-0 bg-black/60" onClick={handleSkip} />
      )}

      {/* Spotlight cutout around target element */}
      {spotlightStyle && (
        <>
          {/* Click-to-dismiss background (behind spotlight) */}
          <div className="absolute inset-0" onClick={handleSkip} />
          <div style={spotlightStyle} />
        </>
      )}

      {/* Tour tooltip */}
      <div ref={tooltipRef} style={tooltipStyle || {}}>
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
