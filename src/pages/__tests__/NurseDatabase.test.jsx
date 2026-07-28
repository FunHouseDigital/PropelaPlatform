import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { fireEvent, render, screen } from '@testing-library/react';

import NurseDatabase from '../NurseDatabase';

let contextValue;
let authValue;

vi.mock('../../context/AppContext', () => ({
  useAppContext: () => contextValue,
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => authValue,
}));

vi.mock('../../hooks/useDebounce', () => ({
  useDebouncedValue: (value) => value,
}));

vi.mock('../../components/nurses/GalleryView', () => ({
  default: ({ nurses, onNurseClick }) => (
    <div data-testid="gallery-view">
      {nurses.map((nurse) => (
        <button key={nurse.id} type="button" onClick={() => onNurseClick(nurse)}>
          {nurse.fullName}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('../../components/nurses/PipelineView', () => ({
  default: ({ nurses, onPipelineChange, pipeline, permissions }) => (
    <div
      data-testid="pipeline-view"
      data-can-change-pipeline={String(permissions?.canChangePipeline)}
    >
      {nurses.map((nurse) => nurse.fullName).join(',')}
      {nurses[0] && (
        <button
          type="button"
          disabled={permissions?.canChangePipeline === false}
          onClick={() =>
            onPipelineChange({
              id: nurses[0].id,
              baseVersion: nurses[0].version,
              pipelineStage: 'OET Passed',
              readinessStatus: 'Placement Ready',
            })
          }
        >
          Move pipeline nurse
        </button>
      )}
      <span data-testid="pipeline-progress">{pipeline?.[nurses[0]?.id]?.state || ''}</span>
    </div>
  ),
}));

vi.mock('../../components/nurses/CohortView', () => ({
  default: ({ nurses }) => (
    <div data-testid="cohort-view">{nurses.map((nurse) => nurse.fullName).join(',')}</div>
  ),
}));

vi.mock('../../components/nurses/NurseCard', () => ({
  default: ({ nurseSlice }) => (
    <div data-testid="nurse-card">{nurseSlice.selected.fullName}</div>
  ),
}));

vi.mock('../../components/nurses/FilterPanel', () => ({
  default: () => <div data-testid="filter-panel" />,
}));

function makeNurse(overrides = {}) {
  return {
    id: 'nurse-1',
    fullName: 'Controller Nurse',
    email: 'controller@example.test',
    sancNumber: 'SANC-1',
    primaryClinicalSpecialty: 'Medical/Surgical',
    pipelineStage: 'Applied',
    readinessStatus: 'Not Ready',
    cohortAssigned: 'Cohort 1',
    cvScore: 3,
    submittedAt: '2026-01-01',
    flags: 0,
    version: 1,
    ...overrides,
  };
}

function makeContext({ items = [], topLevelNurses = items, slice = {} } = {}) {
  return {
    nurses: topLevelNurses,
    nurseSlice: {
      items,
      total: items.length,
      hasAcceptedList: true,
      listState: 'success',
      listError: null,
      staleWarning: false,
      selectedId: null,
      selected: null,
      detailState: 'idle',
      detailError: null,
      ...slice,
    },
    refreshNurses: vi.fn(),
    retryNurses: vi.fn(),
    openNurse: vi.fn(() => Promise.resolve({ status: 'ok' })),
    openCreate: vi.fn(),
    updateCreateDraft: vi.fn(),
    closeCreate: vi.fn(() => true),
    createNurse: vi.fn(),
    retryCreate: vi.fn(),
    retryCreateAfterCollision: vi.fn(),
    changeNursePipeline: vi.fn(),
    retryNursePipeline: vi.fn(),
    reloadNursePipeline: vi.fn(),
    rebaseNursePipeline: vi.fn(),
  };
}

describe('NurseDatabase shared controller integration', () => {
  beforeEach(() => {
    contextValue = makeContext();
    authValue = {
      role: 'Admin',
      currentUser: { id: 'user-admin', role: 'Admin' },
    };
  });

  it('shows initial loading progress without a false empty state', () => {
    contextValue = makeContext({
      slice: {
        items: [],
        total: 0,
        hasAcceptedList: false,
        listState: 'loading',
      },
    });

    render(<NurseDatabase />);

    expect(screen.getByRole('status', { name: 'Loading nurses' })).toBeInTheDocument();
    expect(screen.queryByText('No nurses yet')).not.toBeInTheDocument();
  });

  it('renders an accepted empty controller list without falling back to top-level samples', () => {
    const sample = makeNurse({ id: 'sample-1', fullName: 'Bundled Sample Nurse' });
    contextValue = makeContext({
      items: [],
      topLevelNurses: [sample],
      slice: { total: 0, hasAcceptedList: true, listState: 'success' },
    });

    render(<NurseDatabase />);

    expect(screen.getByText('No nurses yet')).toBeInTheDocument();
    expect(screen.queryByText('Bundled Sample Nurse')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Add Nurse' })).toHaveLength(2);
  });

  it('routes both Add Nurse affordances through the controller create opener', () => {
    contextValue = makeContext({ items: [] });
    render(<NurseDatabase />);

    const addActions = screen.getAllByRole('button', { name: 'Add Nurse' });
    fireEvent.click(addActions[0]);
    fireEvent.click(addActions[1]);

    expect(contextValue.openCreate).toHaveBeenCalledTimes(2);
  });

  it.each(['Admin', 'Superadmin', 'Recruiter'])(
    'shows header and empty-state Add Nurse controls for the %s role',
    (role) => {
      authValue = { role, currentUser: { id: `user-${role}`, role } };
      contextValue = makeContext({ items: [] });

      render(<NurseDatabase />);

      expect(screen.getAllByRole('button', { name: 'Add Nurse' })).toHaveLength(2);
    },
  );

  it.each([
    ['non-operational role', { role: 'Viewer', currentUser: { id: 'user-viewer', role: 'Viewer' } }],
    ['missing profile role', { role: null, currentUser: { id: 'user-no-profile', role: null } }],
  ])('hides every Add Nurse control for a %s', (_label, identity) => {
    authValue = identity;
    contextValue = makeContext({ items: [] });

    render(<NurseDatabase />);

    expect(screen.queryByRole('button', { name: 'Add Nurse' })).not.toBeInTheDocument();
    expect(contextValue.openCreate).not.toHaveBeenCalled();
  });

  it('retains stale accepted records and exposes the categorized error and retry action', () => {
    const nurse = makeNurse();
    contextValue = makeContext({
      items: [nurse],
      slice: {
        listState: 'error',
        listError: { code: 'NETWORK', message: 'Connection timed out.' },
        staleWarning: true,
      },
    });

    render(<NurseDatabase />);

    expect(screen.getByText('Controller Nurse')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByText(/Showing the last loaded records/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(contextValue.retryNurses).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['AUTH', 'Authentication required'],
    ['FORBIDDEN', 'Permission denied'],
    ['VALIDATION', 'Data validation error'],
  ])('categorizes a non-recoverable %s list failure without exposing retry', (code, title) => {
    contextValue = makeContext({
      items: [makeNurse()],
      slice: {
        listState: 'error',
        listError: { code, message: 'The request cannot be retried yet.' },
        staleWarning: true,
      },
    });

    render(<NurseDatabase />);

    expect(screen.getByText(title)).toBeInTheDocument();
    expect(screen.getByText('Controller Nurse')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('retains accepted records and reports non-destructive refresh progress', () => {
    contextValue = makeContext({
      items: [makeNurse()],
      slice: { listState: 'loading' },
    });

    render(<NurseDatabase />);

    expect(screen.getByText('Controller Nurse')).toBeInTheDocument();
    expect(screen.getByText('Refreshing nurses. Current records remain available.')).toBeInTheDocument();
    expect(screen.queryByText('No nurses yet')).not.toBeInTheDocument();
    const refresh = screen.getByRole('button', { name: 'Refreshing' });
    expect(refresh).toBeDisabled();
    fireEvent.click(refresh);
    expect(contextValue.refreshNurses).not.toHaveBeenCalled();
  });

  it('distinguishes filter no-match from a genuine empty list and preserves the total', () => {
    contextValue = makeContext({ items: [makeNurse()] });
    render(<NurseDatabase />);

    fireEvent.change(screen.getByRole('textbox', { name: 'Search nurses' }), {
      target: { value: 'does-not-match' },
    });

    expect(screen.getByText('No nurses match your search')).toBeInTheDocument();
    expect(screen.getByText('1 nurse')).toBeInTheDocument();
    expect(screen.queryByText('No nurses yet')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByText('Controller Nurse')).toBeInTheDocument();
  });

  it('passes the accepted controller list through gallery, pipeline, and cohort views', () => {
    contextValue = makeContext({ items: [makeNurse()] });
    render(<NurseDatabase />);

    expect(screen.getByTestId('gallery-view')).toHaveTextContent('Controller Nurse');

    fireEvent.click(screen.getByRole('button', { name: 'Pipeline' }));
    expect(screen.getByTestId('pipeline-view')).toHaveTextContent('Controller Nurse');

    fireEvent.click(screen.getByRole('button', { name: 'Cohort' }));
    expect(screen.getByTestId('cohort-view')).toHaveTextContent('Controller Nurse');
  });

  it('opens nurse detail by identifier and renders only authoritative selected detail', () => {
    const listNurse = makeNurse({ fullName: 'List Snapshot Name' });
    const authoritative = makeNurse({ fullName: 'Authoritative Detail Name', version: 2 });
    contextValue = makeContext({
      items: [listNurse],
      slice: {
        selectedId: listNurse.id,
        selected: authoritative,
        detailState: 'success',
      },
    });

    render(<NurseDatabase />);
    fireEvent.click(screen.getByRole('button', { name: 'List Snapshot Name' }));

    expect(contextValue.openNurse).toHaveBeenCalledWith('nurse-1');
    expect(contextValue.openNurse.mock.calls[0]).toHaveLength(1);
    expect(screen.getByTestId('nurse-card')).toHaveTextContent('Authoritative Detail Name');
  });

  it('routes pipeline moves as explicit versioned commands with derived readiness', () => {
    const pipelineNurse = makeNurse({ version: 7 });
    contextValue = makeContext({
      items: [pipelineNurse],
      slice: {
        pipeline: {
          [pipelineNurse.id]: { state: 'idle', decision: null },
        },
      },
    });
    render(<NurseDatabase />);

    fireEvent.click(screen.getByRole('button', { name: 'Pipeline' }));
    fireEvent.click(screen.getByRole('button', { name: 'Move pipeline nurse' }));

    expect(contextValue.changeNursePipeline).toHaveBeenCalledWith({
      id: 'nurse-1',
      baseVersion: 7,
      pipelineStage: 'OET Passed',
      readinessStatus: 'Placement Ready',
    });
    expect(contextValue.changeNursePipeline.mock.calls[0]).toHaveLength(1);
  });

  it('disables pipeline mutation controls for a non-operational role without removing the command', () => {
    authValue = {
      role: 'Read-only',
      currentUser: { id: 'user-read-only', role: 'Read-only' },
    };
    contextValue = makeContext({ items: [makeNurse({ version: 7 })] });
    render(<NurseDatabase />);

    fireEvent.click(screen.getByRole('button', { name: 'Pipeline' }));

    expect(screen.getByTestId('pipeline-view')).toHaveAttribute(
      'data-can-change-pipeline',
      'false',
    );
    const move = screen.getByRole('button', { name: 'Move pipeline nurse' });
    expect(move).toBeDisabled();
    fireEvent.click(move);
    expect(contextValue.changeNursePipeline).not.toHaveBeenCalled();
    expect(typeof contextValue.changeNursePipeline).toBe('function');
  });

  it('has no direct nurse persistence imports or whole-collection updater use', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/pages/NurseDatabase.jsx'),
      'utf8',
    );

    expect(source).not.toMatch(/from ['"]\.\.\/lib\/storage['"]/);
    expect(source).not.toMatch(/\b(?:getNurses|saveNurses|updateNurses)\b/);
  });
});
