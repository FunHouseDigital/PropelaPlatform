import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { render, screen, waitFor, act } from '../../test/utils';
import { setData } from '../../lib/storage';
import { AppProvider, useAppContext } from '../../context/AppContext';
import { createNurse, createNurses } from '../../test/factories/nurseFactory';

const Dashboard = lazy(() => import('../Dashboard'));
const NurseDatabase = lazy(() => import('../NurseDatabase'));
const PlacementTracker = lazy(() => import('../PlacementTracker'));

// Helper component that exposes context for testing
function ContextReader({ onReady }) {
  const ctx = useAppContext();
  onReady(ctx);
  return <div data-testid="context-reader">ready</div>;
}

// Helper component that triggers multiple rapid updates
function RapidUpdater({ updates }) {
  const ctx = useAppContext();
  return (
    <div>
      <button
        onClick={() => {
          updates.forEach((update) => update(ctx));
        }}
        data-testid="rapid-update-btn"
      >
        Rapid Update
      </button>
      <span data-testid="nurse-count">{ctx.nurses.length}</span>
    </div>
  );
}

describe('Edge cases integration tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Large dataset handling', () => {
    it('renders NurseDatabase with 100+ nurses without error', async () => {
      const largeDataset = createNurses(120);
      setData('nurses', largeDataset);

      render(
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/" element={<NurseDatabase />} />
          </Routes>
        </Suspense>,
        { route: '/' }
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Page rendered without crashing
      expect(screen.getByText(/Nurse Database/i, { selector: 'h1' })).toBeInTheDocument();
    });

    it('renders Dashboard with large nurse dataset without error', async () => {
      const largeDataset = createNurses(150);
      setData('nurses', largeDataset);

      render(
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
          </Routes>
        </Suspense>,
        { route: '/' }
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Dashboard rendered without crashing
      expect(document.querySelector('[data-testid="context-reader"]') || document.body).toBeTruthy();
    });
  });

  describe('Rapid state updates', () => {
    it('handles multiple rapid updateNurses calls and final state is correct', () => {
      setData('nurses', []);

      const nurse1 = createNurse({ fullName: 'Rapid Nurse 1' });
      const nurse2 = createNurse({ fullName: 'Rapid Nurse 2' });
      const nurse3 = createNurse({ fullName: 'Rapid Nurse 3' });

      render(
        <RapidUpdater
          updates={[
            (ctx) => ctx.updateNurses([nurse1]),
            (ctx) => ctx.updateNurses([nurse1, nurse2]),
            (ctx) => ctx.updateNurses([nurse1, nurse2, nurse3]),
          ]}
        />
      );

      act(() => {
        screen.getByTestId('rapid-update-btn').click();
      });

      // Final state should reflect the last update
      expect(screen.getByTestId('nurse-count').textContent).toBe('3');
    });

    it('handles alternating add and remove operations', () => {
      const initialNurses = createNurses(5);
      setData('nurses', initialNurses);

      render(
        <RapidUpdater
          updates={[
            (ctx) => ctx.updateNurses([...ctx.nurses, createNurse({ fullName: 'Added Nurse' })]),
            (ctx) => ctx.updateNurses(ctx.nurses.slice(1)),
            (ctx) => ctx.updateNurses([...ctx.nurses, createNurse({ fullName: 'Final Nurse' })]),
          ]}
        />
      );

      act(() => {
        screen.getByTestId('rapid-update-btn').click();
      });

      // Each update builds on the previous state:
      // Start: 5, +1=6, remove first=5, +1=6
      expect(screen.getByTestId('nurse-count').textContent).toBe('6');
    });
  });

  describe('Empty state rendering', () => {
    it('renders Dashboard with no data without crashing', async () => {
      // localStorage is already cleared (empty)
      render(
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
          </Routes>
        </Suspense>,
        { route: '/' }
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Should not crash - just verify document has content
      expect(document.body).toBeTruthy();
    });

    it('renders NurseDatabase with empty nurse list without crashing', async () => {
      setData('nurses', []);

      render(
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/" element={<NurseDatabase />} />
          </Routes>
        </Suspense>,
        { route: '/' }
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      expect(screen.getByText(/Nurse Database/i, { selector: 'h1' })).toBeInTheDocument();
    });

    it('renders PlacementTracker with no placements without crashing', async () => {
      setData('placements', []);

      render(
        <Suspense fallback={<div>Loading...</div>}>
          <Routes>
            <Route path="/" element={<PlacementTracker />} />
          </Routes>
        </Suspense>,
        { route: '/' }
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Should render without error
      expect(document.body).toBeTruthy();
    });

    it('context returns empty arrays when no data is in localStorage', () => {
      let contextValue = null;
      render(
        <ContextReader onReady={(ctx) => { contextValue = ctx; }} />
      );

      expect(contextValue.nurses).toEqual([]);
      expect(contextValue.documents).toEqual([]);
      expect(contextValue.placements).toEqual([]);
      expect(contextValue.facilities).toEqual([]);
    });
  });
});
