import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { render, screen, waitFor, fireEvent, act } from '../../test/utils';
import { setData, getData } from '../../lib/storage';
import { createNurse } from '../../test/factories/nurseFactory';
import { createDocument } from '../../test/factories/documentFactory';
import { useAppContext } from '../../context/AppContext';

const DocumentManagement = lazy(() => import('../DocumentManagement'));
const NurseDatabase = lazy(() => import('../NurseDatabase'));

function DocumentApp() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/documents" element={<DocumentManagement />} />
      </Routes>
    </Suspense>
  );
}

function NurseApp() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/nurses" element={<NurseDatabase />} />
      </Routes>
    </Suspense>
  );
}

// Helper component to test pipeline stage updates via context
function PipelineUpdater() {
  const { nurses, updateNurses } = useAppContext();

  const handleStageChange = () => {
    if (nurses.length > 0) {
      const updated = nurses.map((n, i) =>
        i === 0 ? { ...n, pipelineStage: 'CV Submitted' } : n
      );
      updateNurses(updated);
    }
  };

  return (
    <div>
      <div data-testid="first-nurse-stage">
        {nurses.length > 0 ? nurses[0].pipelineStage : 'no nurses'}
      </div>
      <button onClick={handleStageChange} data-testid="change-stage-btn">
        Change Stage
      </button>
    </div>
  );
}

describe('Workflow integration tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Nurse pipeline progression', () => {
    it('changing pipeline stage from Applied to CV Submitted updates UI', () => {
      const nurses = [
        createNurse({ fullName: 'Test Nurse', pipelineStage: 'Applied' }),
      ];
      setData('nurses', nurses);

      render(<PipelineUpdater />);

      // Initially shows Applied
      expect(screen.getByTestId('first-nurse-stage')).toHaveTextContent('Applied');

      // Click to change stage
      act(() => {
        screen.getByTestId('change-stage-btn').click();
      });

      // Now shows CV Submitted
      expect(screen.getByTestId('first-nurse-stage')).toHaveTextContent('CV Submitted');
    });

    it('pipeline stage change persists to localStorage', () => {
      const nurses = [
        createNurse({ id: 'nurse-001', fullName: 'Test Nurse', pipelineStage: 'Applied' }),
      ];
      setData('nurses', nurses);

      render(<PipelineUpdater />);

      act(() => {
        screen.getByTestId('change-stage-btn').click();
      });

      // Verify localStorage was updated
      const stored = getData('nurses');
      expect(stored[0].pipelineStage).toBe('CV Submitted');
    });

    it('pipeline progression through multiple stages', () => {
      const nurses = [
        createNurse({ fullName: 'Multi Stage Nurse', pipelineStage: 'Applied' }),
      ];
      setData('nurses', nurses);

      // A component that can progress through stages
      function MultiStageUpdater() {
        const { nurses: ctxNurses, updateNurses } = useAppContext();
        const stages = ['Applied', 'CV Submitted', 'Under Review', 'Shortlisted - Yes'];

        const advance = () => {
          if (ctxNurses.length > 0) {
            const currentIdx = stages.indexOf(ctxNurses[0].pipelineStage);
            if (currentIdx < stages.length - 1) {
              const updated = ctxNurses.map((n, i) =>
                i === 0 ? { ...n, pipelineStage: stages[currentIdx + 1] } : n
              );
              updateNurses(updated);
            }
          }
        };

        return (
          <div>
            <span data-testid="stage">{ctxNurses[0]?.pipelineStage}</span>
            <button onClick={advance} data-testid="advance-btn">Advance</button>
          </div>
        );
      }

      render(<MultiStageUpdater />);

      expect(screen.getByTestId('stage')).toHaveTextContent('Applied');

      act(() => { screen.getByTestId('advance-btn').click(); });
      expect(screen.getByTestId('stage')).toHaveTextContent('CV Submitted');

      act(() => { screen.getByTestId('advance-btn').click(); });
      expect(screen.getByTestId('stage')).toHaveTextContent('Under Review');

      act(() => { screen.getByTestId('advance-btn').click(); });
      expect(screen.getByTestId('stage')).toHaveTextContent('Shortlisted - Yes');
    });
  });

  describe('Document verification workflow', () => {
    it('renders the verification tab in Document Management', async () => {
      const nurse = createNurse({ id: 'nurse-v1', fullName: 'Verify Nurse' });
      const doc = createDocument({
        id: 'doc-v1',
        nurseId: 'nurse-v1',
        type: 'Passport',
        status: 'Pending',
        verificationHistory: [],
      });
      const queueItem = {
        id: 'queue-v1',
        nurseId: 'nurse-v1',
        documentId: 'doc-v1',
        documentType: 'Passport',
        uploadDate: '2025-06-01',
        priority: 'High',
      };

      setData('nurses', [nurse]);
      setData('documents', [doc]);
      setData('verificationQueue', [queueItem]);

      render(<DocumentApp />, { route: '/documents' });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Click the Verification tab
      const verificationTab = screen.getByRole('button', { name: /Verification/i });
      fireEvent.click(verificationTab);

      // The verification queue should show the pending item
      await waitFor(() => {
        expect(screen.getByText('Verification Queue')).toBeInTheDocument();
      });
    });

    it('shows pending items in verification queue', async () => {
      const nurse = createNurse({ id: 'nurse-v2', fullName: 'Pending Nurse' });
      const doc = createDocument({
        id: 'doc-v2',
        nurseId: 'nurse-v2',
        type: 'SANC Registration',
        status: 'Pending',
        verificationHistory: [],
      });
      const queueItem = {
        id: 'queue-v2',
        nurseId: 'nurse-v2',
        documentId: 'doc-v2',
        documentType: 'SANC Registration',
        uploadDate: '2025-05-20',
        priority: 'Medium',
      };

      setData('nurses', [nurse]);
      setData('documents', [doc]);
      setData('verificationQueue', [queueItem]);

      render(<DocumentApp />, { route: '/documents' });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Navigate to Verification tab
      const verificationTab = screen.getByRole('button', { name: /Verification/i });
      fireEvent.click(verificationTab);

      await waitFor(() => {
        expect(screen.getByText('Pending Nurse')).toBeInTheDocument();
        expect(screen.getByText('SANC Registration')).toBeInTheDocument();
      });
    });

    it('approving a document removes it from the queue', async () => {
      const nurse = createNurse({ id: 'nurse-v3', fullName: 'Approve Nurse' });
      const doc = createDocument({
        id: 'doc-v3',
        nurseId: 'nurse-v3',
        type: 'Passport',
        status: 'Pending',
        verificationHistory: [],
      });
      const queueItem = {
        id: 'queue-v3',
        nurseId: 'nurse-v3',
        documentId: 'doc-v3',
        documentType: 'Passport',
        uploadDate: '2025-06-01',
        priority: 'High',
      };

      setData('nurses', [nurse]);
      setData('documents', [doc]);
      setData('verificationQueue', [queueItem]);

      render(<DocumentApp />, { route: '/documents' });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Navigate to Verification tab
      const verificationTab = screen.getByRole('button', { name: /Verification/i });
      fireEvent.click(verificationTab);

      await waitFor(() => {
        expect(screen.getByText('Approve Nurse')).toBeInTheDocument();
      });

      // Click approve button (first click opens notes)
      const approveBtn = screen.getByRole('button', { name: /Approve/i });
      fireEvent.click(approveBtn);

      // Click approve again to confirm (now showNotesFor === item.id)
      const confirmApproveBtn = screen.getByRole('button', { name: /Approve/i });
      fireEvent.click(confirmApproveBtn);

      // The pending queue should show "All documents have been verified"
      await waitFor(() => {
        expect(screen.getByText(/All documents have been verified/i)).toBeInTheDocument();
      });

      // Verify document status changed in localStorage
      const storedDocs = getData('documents');
      expect(storedDocs[0].status).toBe('Verified');
    });

    it('rejecting a document marks it as Rejected', async () => {
      const nurse = createNurse({ id: 'nurse-v4', fullName: 'Reject Nurse' });
      const doc = createDocument({
        id: 'doc-v4',
        nurseId: 'nurse-v4',
        type: 'Passport',
        status: 'Pending',
        verificationHistory: [],
      });
      const queueItem = {
        id: 'queue-v4',
        nurseId: 'nurse-v4',
        documentId: 'doc-v4',
        documentType: 'Passport',
        uploadDate: '2025-06-01',
        priority: 'Low',
      };

      setData('nurses', [nurse]);
      setData('documents', [doc]);
      setData('verificationQueue', [queueItem]);

      render(<DocumentApp />, { route: '/documents' });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Navigate to Verification tab
      const verificationTab = screen.getByRole('button', { name: /Verification/i });
      fireEvent.click(verificationTab);

      await waitFor(() => {
        expect(screen.getByText('Reject Nurse')).toBeInTheDocument();
      });

      // Click reject button (first click opens notes)
      const rejectBtn = screen.getByRole('button', { name: /Reject/i });
      fireEvent.click(rejectBtn);

      // Click reject again to confirm
      const confirmRejectBtn = screen.getByRole('button', { name: /Reject/i });
      fireEvent.click(confirmRejectBtn);

      // The pending queue should show "All documents have been verified"
      await waitFor(() => {
        expect(screen.getByText(/All documents have been verified/i)).toBeInTheDocument();
      });

      // Verify document status changed in localStorage
      const storedDocs = getData('documents');
      expect(storedDocs[0].status).toBe('Rejected');
    });

    it('shows empty state when no documents are pending verification', async () => {
      setData('nurses', []);
      setData('documents', []);
      setData('verificationQueue', []);

      render(<DocumentApp />, { route: '/documents' });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Navigate to Verification tab
      const verificationTab = screen.getByRole('button', { name: /Verification/i });
      fireEvent.click(verificationTab);

      await waitFor(() => {
        expect(screen.getByText(/All documents have been verified/i)).toBeInTheDocument();
      });
    });
  });
});
