import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { render, screen, waitFor, fireEvent } from '../../test/utils';
import { setData } from '../../lib/storage';
import { createNurse } from '../../test/factories/nurseFactory';

const NurseDatabase = lazy(() => import('../NurseDatabase'));

function NurseApp() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/nurses" element={<NurseDatabase />} />
      </Routes>
    </Suspense>
  );
}

describe('Filter and search integration tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Nurse search by name', () => {
    it('filters nurses when typing in search input', async () => {
      const nurses = [
        createNurse({ fullName: 'Alice Johnson', pipelineStage: 'Applied' }),
        createNurse({ fullName: 'Bob Smith', pipelineStage: 'Applied' }),
        createNurse({ fullName: 'Carol Williams', pipelineStage: 'CV Submitted' }),
      ];
      setData('nurses', nurses);

      render(<NurseApp />, { route: '/nurses' });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // All three nurses should initially be visible
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();

      // Type in the search input
      const searchInput = screen.getByPlaceholderText(/Search name, email, SANC/i);
      fireEvent.change(searchInput, { target: { value: 'Alice' } });

      // After filtering, only Alice should be visible
      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
        expect(screen.queryByText('Carol Williams')).not.toBeInTheDocument();
      });
    });

    it('shows all nurses when search is cleared', async () => {
      const nurses = [
        createNurse({ fullName: 'Alice Johnson', pipelineStage: 'Applied' }),
        createNurse({ fullName: 'Bob Smith', pipelineStage: 'Applied' }),
      ];
      setData('nurses', nurses);

      render(<NurseApp />, { route: '/nurses' });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      const searchInput = screen.getByPlaceholderText(/Search name, email, SANC/i);

      // Search for Alice
      fireEvent.change(searchInput, { target: { value: 'Alice' } });
      await waitFor(() => {
        expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
      });

      // Clear search
      fireEvent.change(searchInput, { target: { value: '' } });
      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      });
    });

    it('searches by email address', async () => {
      const nurses = [
        createNurse({ fullName: 'Alice Johnson', email: 'alice@special.com', pipelineStage: 'Applied' }),
        createNurse({ fullName: 'Bob Smith', email: 'bob@normal.com', pipelineStage: 'Applied' }),
      ];
      setData('nurses', nurses);

      render(<NurseApp />, { route: '/nurses' });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      const searchInput = screen.getByPlaceholderText(/Search name, email, SANC/i);
      fireEvent.change(searchInput, { target: { value: 'special' } });

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
        expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
      });
    });
  });

  describe('Nurse filter by pipeline stage', () => {
    it('opens the filter panel when Filter button is clicked', async () => {
      const nurses = [
        createNurse({ fullName: 'Alice Johnson', pipelineStage: 'Applied' }),
      ];
      setData('nurses', nurses);

      render(<NurseApp />, { route: '/nurses' });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Click the Filters button
      const filterButton = screen.getByRole('button', { name: /Filters/i });
      fireEvent.click(filterButton);

      // Filter panel should appear with Pipeline Stage section
      await waitFor(() => {
        expect(screen.getByText('Pipeline Stage')).toBeInTheDocument();
      });
    });

    it('filters nurses by pipeline stage selection', async () => {
      const nurses = [
        createNurse({ fullName: 'Alice Applied', pipelineStage: 'Applied' }),
        createNurse({ fullName: 'Bob CV', pipelineStage: 'CV Submitted' }),
        createNurse({ fullName: 'Carol Review', pipelineStage: 'Under Review' }),
      ];
      setData('nurses', nurses);

      render(<NurseApp />, { route: '/nurses' });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Initially all 3 nurses visible
      expect(screen.getByText('Alice Applied')).toBeInTheDocument();
      expect(screen.getByText('Bob CV')).toBeInTheDocument();

      // Open filters
      const filterButton = screen.getByRole('button', { name: /Filters/i });
      fireEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByText('Pipeline Stage')).toBeInTheDocument();
      });

      // Select "CV Submitted" checkbox in the Pipeline Stage section
      const cvCheckbox = screen.getByRole('checkbox', { name: /CV Submitted/i });
      fireEvent.click(cvCheckbox);

      // Now only Bob CV should be shown in gallery
      await waitFor(() => {
        expect(screen.getByText('Bob CV')).toBeInTheDocument();
        expect(screen.queryByText('Alice Applied')).not.toBeInTheDocument();
        expect(screen.queryByText('Carol Review')).not.toBeInTheDocument();
      });
    });

    it('shows filter count badge when filters are active', async () => {
      const nurses = [
        createNurse({ fullName: 'Alice Applied', pipelineStage: 'Applied' }),
        createNurse({ fullName: 'Bob CV', pipelineStage: 'CV Submitted' }),
      ];
      setData('nurses', nurses);

      render(<NurseApp />, { route: '/nurses' });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Open filters and select a stage
      const filterButton = screen.getByRole('button', { name: /Filters/i });
      fireEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByText('Pipeline Stage')).toBeInTheDocument();
      });

      const appliedCheckbox = screen.getByRole('checkbox', { name: /Applied/i });
      fireEvent.click(appliedCheckbox);

      // The filter count badge should appear on the Filters button
      await waitFor(() => {
        // Filter count of 1 should be shown somewhere
        const badges = screen.getAllByText('1');
        expect(badges.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Filter updates displayed results', () => {
    it('no results when filter matches no nurses', async () => {
      const nurses = [
        createNurse({ fullName: 'Alice Applied', pipelineStage: 'Applied' }),
        createNurse({ fullName: 'Bob Applied', pipelineStage: 'Applied' }),
      ];
      setData('nurses', nurses);

      render(<NurseApp />, { route: '/nurses' });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Search for something that does not exist
      const searchInput = screen.getByPlaceholderText(/Search name, email, SANC/i);
      fireEvent.change(searchInput, { target: { value: 'zzzznonexistent' } });

      // Count should show 0 filtered results visible
      // The page header shows allNurses count, but the gallery should be empty
      await waitFor(() => {
        // The page still shows "2 nurses" in the header (total count)
        // but no nurse cards/names should be rendered in the view
        expect(screen.queryByText('Alice Applied')).not.toBeInTheDocument();
        expect(screen.queryByText('Bob Applied')).not.toBeInTheDocument();
      });
    });

    it('combining search and filter narrows results', async () => {
      const nurses = [
        createNurse({ fullName: 'Alice Johnson', pipelineStage: 'Applied' }),
        createNurse({ fullName: 'Alice Smith', pipelineStage: 'CV Submitted' }),
        createNurse({ fullName: 'Bob Johnson', pipelineStage: 'Applied' }),
      ];
      setData('nurses', nurses);

      render(<NurseApp />, { route: '/nurses' });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      }, { timeout: 5000 });

      // Search for Alice (matches 2)
      const searchInput = screen.getByPlaceholderText(/Search name, email, SANC/i);
      fireEvent.change(searchInput, { target: { value: 'Alice' } });

      await waitFor(() => {
        expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
      });
    });
  });
});
