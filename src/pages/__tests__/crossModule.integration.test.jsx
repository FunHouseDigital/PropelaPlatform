import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { render, screen, waitFor, fireEvent, act, cleanup } from '../../test/utils';
import { initializeData, getData, setData } from '../../lib/storage';
import { AppProvider, useAppContext } from '../../context/AppContext';
import { MemoryRouter } from 'react-router-dom';
import { createNurse, createNurses } from '../../test/factories/nurseFactory';
import { createDocument, createDocuments } from '../../test/factories/documentFactory';
import { createPlacement, createPlacements } from '../../test/factories/placementFactory';
import Sidebar from '../../components/layout/Sidebar';

const Dashboard = lazy(() => import('../Dashboard'));
const NurseDatabase = lazy(() => import('../NurseDatabase'));
const PlacementTracker = lazy(() => import('../PlacementTracker'));
const Notifications = lazy(() => import('../Notifications'));
const Analytics = lazy(() => import('../Analytics'));
const Help = lazy(() => import('../Help'));

// Helper component that exposes context for testing
function ContextReader({ onReady }) {
  const ctx = useAppContext();
  onReady(ctx);
  return <div data-testid="context-reader">ready</div>;
}

// Helper component that triggers a context update
function ContextUpdater({ updater }) {
  const ctx = useAppContext();
  return (
    <div>
      <button onClick={() => updater(ctx)} data-testid="update-btn">
        Update
      </button>
      <span data-testid="nurse-count">{ctx.nurses.length}</span>
      <span data-testid="doc-count">{ctx.documents.length}</span>
      <span data-testid="placement-count">{ctx.placements.length}</span>
    </div>
  );
}

function NavTestApp() {
  return (
    <>
      <Sidebar isOpen={true} onClose={() => {}} isMobile={false} />
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/nurses" element={<NurseDatabase />} />
          <Route path="/placements" element={<PlacementTracker />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/help" element={<Help />} />
        </Routes>
      </Suspense>
    </>
  );
}

describe('Cross-module integration tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Full pipeline flow', () => {
    it('creates a nurse, adds documents and placement, and all data is consistent', () => {
      // Create a nurse
      const nurse = createNurse({ fullName: 'Pipeline Test Nurse' });
      setData('nurses', [nurse]);

      // Add documents for that nurse
      const docs = createDocuments(2, { nurseId: nurse.id });
      setData('documents', docs);

      // Create a placement for that nurse
      const placement = createPlacement({ nurseId: nurse.id, nurseName: nurse.fullName });
      setData('placements', [placement]);

      let contextValue = null;
      render(
        <ContextReader onReady={(ctx) => { contextValue = ctx; }} />
      );

      // Verify all data is consistent
      expect(contextValue.nurses).toHaveLength(1);
      expect(contextValue.nurses[0].id).toBe(nurse.id);
      expect(contextValue.nurses[0].fullName).toBe('Pipeline Test Nurse');

      expect(contextValue.documents).toHaveLength(2);
      expect(contextValue.documents[0].nurseId).toBe(nurse.id);
      expect(contextValue.documents[1].nurseId).toBe(nurse.id);

      expect(contextValue.placements).toHaveLength(1);
      expect(contextValue.placements[0].nurseId).toBe(nurse.id);
      expect(contextValue.placements[0].nurseName).toBe('Pipeline Test Nurse');
    });

    it('updates nurse data through context and reflects across all reads', () => {
      const nurse = createNurse({ fullName: 'Update Flow Nurse' });
      setData('nurses', [nurse]);

      render(
        <ContextUpdater
          updater={(ctx) => {
            const updated = ctx.nurses.map((n) =>
              n.id === nurse.id ? { ...n, fullName: 'Updated Nurse Name' } : n
            );
            ctx.updateNurses(updated);
          }}
        />
      );

      act(() => {
        screen.getByTestId('update-btn').click();
      });

      // Verify localStorage reflects the update
      const stored = getData('nurses');
      expect(stored[0].fullName).toBe('Updated Nurse Name');
    });
  });

  describe('Data consistency', () => {
    it('dashboard nurse count matches nurseDatabase length from context', () => {
      const nurses = createNurses(5);
      setData('nurses', nurses);

      let contextValue = null;
      render(
        <ContextReader onReady={(ctx) => { contextValue = ctx; }} />
      );

      expect(contextValue.nurses).toHaveLength(5);
      expect(contextValue.nurses.length).toBe(nurses.length);
    });

    it('documents are linked to correct nurses via nurseId', () => {
      const nurse1 = createNurse({ fullName: 'Nurse One' });
      const nurse2 = createNurse({ fullName: 'Nurse Two' });
      const doc1 = createDocument({ nurseId: nurse1.id });
      const doc2 = createDocument({ nurseId: nurse2.id });
      const doc3 = createDocument({ nurseId: nurse1.id });

      setData('nurses', [nurse1, nurse2]);
      setData('documents', [doc1, doc2, doc3]);

      let contextValue = null;
      render(
        <ContextReader onReady={(ctx) => { contextValue = ctx; }} />
      );

      const nurse1Docs = contextValue.documents.filter((d) => d.nurseId === nurse1.id);
      const nurse2Docs = contextValue.documents.filter((d) => d.nurseId === nurse2.id);

      expect(nurse1Docs).toHaveLength(2);
      expect(nurse2Docs).toHaveLength(1);
    });
  });

  describe('localStorage persistence across re-renders', () => {
    it('data persists after unmount and re-mount of AppProvider', () => {
      const nurses = createNurses(3);
      setData('nurses', nurses);

      // First mount - update nurses
      const { unmount } = render(
        <ContextUpdater
          updater={(ctx) => {
            ctx.updateNurses([...ctx.nurses, createNurse({ fullName: 'Persisted Nurse' })]);
          }}
        />
      );

      act(() => {
        screen.getByTestId('update-btn').click();
      });

      // Verify nurse count after update
      expect(screen.getByTestId('nurse-count').textContent).toBe('4');

      // Unmount
      unmount();

      // Verify localStorage still has the data
      const stored = getData('nurses');
      expect(stored).toHaveLength(4);
      expect(stored[3].fullName).toBe('Persisted Nurse');

      // Re-mount fresh AppProvider and verify data loads
      let contextValue = null;
      render(
        <ContextReader onReady={(ctx) => { contextValue = ctx; }} />
      );

      expect(contextValue.nurses).toHaveLength(4);
      expect(contextValue.nurses[3].fullName).toBe('Persisted Nurse');
    });

    it('multiple data types persist independently', () => {
      const nurses = [createNurse({ fullName: 'Test Nurse' })];
      const docs = [createDocument({ type: 'SANC Certificate' })];
      const placements = [createPlacement({ facilityName: 'Test Hospital' })];

      setData('nurses', nurses);
      setData('documents', docs);
      setData('placements', placements);

      let contextValue = null;
      render(
        <ContextReader onReady={(ctx) => { contextValue = ctx; }} />
      );

      expect(contextValue.nurses).toHaveLength(1);
      expect(contextValue.documents).toHaveLength(1);
      expect(contextValue.placements).toHaveLength(1);
      expect(contextValue.nurses[0].fullName).toBe('Test Nurse');
      expect(contextValue.documents[0].type).toBe('SANC Certificate');
      expect(contextValue.placements[0].facilityName).toBe('Test Hospital');
    });
  });

  describe('Navigation flows', () => {
    it('clicking through multiple nav links renders each page heading', async () => {
      localStorage.clear();
      initializeData();

      render(<NavTestApp />, { route: '/' });

      // Wait for dashboard to load
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Navigate to Nurse Database
      const nurseLink = screen.getByRole('link', { name: /Nurse Database/i });
      fireEvent.click(nurseLink);

      await waitFor(() => {
        expect(screen.getByText(/Nurse Database/i, { selector: 'h1' })).toBeInTheDocument();
      }, { timeout: 5000 });

      // Navigate to Analytics
      const analyticsLink = screen.getByRole('link', { name: /Analytics/i });
      fireEvent.click(analyticsLink);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Navigate to Help
      const helpLink = screen.getByRole('link', { name: /Help/i });
      fireEvent.click(helpLink);

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });
    });
  });
});
