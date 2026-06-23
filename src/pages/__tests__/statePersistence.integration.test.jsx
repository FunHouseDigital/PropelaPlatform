import { render, screen, act } from '../../test/utils';
import { initializeData, getData, setData } from '../../lib/storage';
import { AppProvider, useAppContext } from '../../context/AppContext';
import { createNurse } from '../../test/factories/nurseFactory';

// Helper component that exposes context for testing
function StateReader({ onReady }) {
  const ctx = useAppContext();
  onReady(ctx);
  return <div data-testid="state-reader">ready</div>;
}

// Helper component that triggers an update
function StateWriter({ updater }) {
  const ctx = useAppContext();
  return (
    <div>
      <button onClick={() => updater(ctx)} data-testid="update-btn">
        Update
      </button>
      <span data-testid="nurse-count">{ctx.nurses.length}</span>
    </div>
  );
}

describe('State persistence integration tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('AppContext reads initial data from localStorage', () => {
    it('reads nurses from localStorage on mount', () => {
      const testNurses = [createNurse({ fullName: 'Zara Test' })];
      setData('nurses', testNurses);

      let contextValue = null;
      render(
        <StateReader onReady={(ctx) => { contextValue = ctx; }} />
      );

      expect(contextValue.nurses).toHaveLength(1);
      expect(contextValue.nurses[0].fullName).toBe('Zara Test');
    });

    it('reads documents from localStorage on mount', () => {
      const testDocs = [{ id: 'doc-1', type: 'Passport', status: 'Pending' }];
      setData('documents', testDocs);

      let contextValue = null;
      render(
        <StateReader onReady={(ctx) => { contextValue = ctx; }} />
      );

      expect(contextValue.documents).toHaveLength(1);
      expect(contextValue.documents[0].type).toBe('Passport');
    });

    it('reads placements from localStorage on mount', () => {
      const testPlacements = [{ id: 'place-1', facilityName: 'Test Hospital' }];
      setData('placements', testPlacements);

      let contextValue = null;
      render(
        <StateReader onReady={(ctx) => { contextValue = ctx; }} />
      );

      expect(contextValue.placements).toHaveLength(1);
      expect(contextValue.placements[0].facilityName).toBe('Test Hospital');
    });

    it('returns empty arrays when localStorage has no data', () => {
      let contextValue = null;
      render(
        <StateReader onReady={(ctx) => { contextValue = ctx; }} />
      );

      expect(contextValue.nurses).toEqual([]);
      expect(contextValue.documents).toEqual([]);
      expect(contextValue.placements).toEqual([]);
    });
  });

  describe('State changes write back to localStorage', () => {
    it('updateNurses persists changes to localStorage', () => {
      const initialNurses = [createNurse({ fullName: 'Initial Nurse' })];
      setData('nurses', initialNurses);

      render(
        <StateWriter
          updater={(ctx) => {
            ctx.updateNurses([
              ...ctx.nurses,
              createNurse({ fullName: 'New Nurse' }),
            ]);
          }}
        />
      );

      // Trigger the update
      act(() => {
        screen.getByTestId('update-btn').click();
      });

      // Check that localStorage was updated
      const stored = getData('nurses');
      expect(stored).toHaveLength(2);
      expect(stored[1].fullName).toBe('New Nurse');
    });

    it('updateDocuments persists changes to localStorage', () => {
      setData('documents', []);

      render(
        <StateWriter
          updater={(ctx) => {
            ctx.updateDocuments([{ id: 'doc-new', type: 'SANC', status: 'Pending' }]);
          }}
        />
      );

      act(() => {
        screen.getByTestId('update-btn').click();
      });

      const stored = getData('documents');
      expect(stored).toHaveLength(1);
      expect(stored[0].type).toBe('SANC');
    });

    it('updateSettings persists changes to localStorage', () => {
      setData('settings', { theme: 'light' });

      render(
        <StateWriter
          updater={(ctx) => {
            ctx.updateSettings({ theme: 'dark', notifications: true });
          }}
        />
      );

      act(() => {
        screen.getByTestId('update-btn').click();
      });

      const stored = getData('settings');
      expect(stored.theme).toBe('dark');
      expect(stored.notifications).toBe(true);
    });
  });

  describe('initializeData seeds localStorage when empty', () => {
    it('seeds nurses when localStorage is empty', () => {
      expect(getData('nurses')).toBeNull();

      initializeData();

      const nurses = getData('nurses');
      expect(nurses).not.toBeNull();
      expect(nurses.length).toBeGreaterThan(0);
    });

    it('seeds facilities when localStorage is empty', () => {
      expect(getData('facilities')).toBeNull();

      initializeData();

      const facilities = getData('facilities');
      expect(facilities).not.toBeNull();
      expect(facilities.length).toBeGreaterThan(0);
    });

    it('seeds cohorts when localStorage is empty', () => {
      expect(getData('cohorts')).toBeNull();

      initializeData();

      const cohorts = getData('cohorts');
      expect(cohorts).not.toBeNull();
      expect(cohorts.length).toBeGreaterThan(0);
    });

    it('does not overwrite existing data', () => {
      const existingNurses = [createNurse({ fullName: 'Existing Nurse' })];
      setData('nurses', existingNurses);

      initializeData();

      const nurses = getData('nurses');
      expect(nurses).toHaveLength(1);
      expect(nurses[0].fullName).toBe('Existing Nurse');
    });

    it('seeds documents and verification queue together', () => {
      initializeData();

      const documents = getData('documents');
      const verificationQueue = getData('verificationQueue');
      expect(documents).not.toBeNull();
      expect(verificationQueue).not.toBeNull();
    });

    it('seeds automation rules when localStorage is empty', () => {
      initializeData();

      const automationRules = getData('automationRules');
      expect(automationRules).not.toBeNull();
      expect(automationRules.length).toBeGreaterThan(0);
    });
  });
});
