import { useState, useCallback } from 'react';
import { Map, RotateCcw, CheckCircle2 } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import FeatureTour from './FeatureTour';

export default function TourLauncher({ tourId, steps = [], label = 'Start Tour' }) {
  const { tourState, updateTourState } = useAppContext();
  const [showTour, setShowTour] = useState(false);

  const isCompleted = tourState?.completedTours?.includes(tourId);

  const handleStart = useCallback(() => {
    // Reset the tour state for this tour to allow restart
    if (isCompleted) {
      const completedTours = (tourState?.completedTours || []).filter((t) => t !== tourId);
      updateTourState({
        ...tourState,
        completedTours,
        currentTourId: tourId,
        currentTourStep: 0,
      });
    }
    // Use explicit active prop so FeatureTour does not need to derive
    // visibility from context (avoids race with batched state updates)
    setShowTour(true);
  }, [isCompleted, tourState, tourId, updateTourState]);

  const handleComplete = useCallback(() => {
    setShowTour(false);
  }, []);

  return (
    <>
      <button
        onClick={handleStart}
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isCompleted
            ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
            : 'bg-[#5B2D8E]/10 text-[#5B2D8E] hover:bg-[#5B2D8E]/20 border border-[#5B2D8E]/20'
        }`}
      >
        {isCompleted ? (
          <>
            <CheckCircle2 size={16} />
            <span>Completed</span>
            <RotateCcw size={14} className="ml-1 opacity-60" />
          </>
        ) : (
          <>
            <Map size={16} />
            <span>{label}</span>
          </>
        )}
      </button>

      {showTour && (
        <FeatureTour
          tourId={tourId}
          steps={steps}
          active={showTour}
          onComplete={handleComplete}
        />
      )}
    </>
  );
}
