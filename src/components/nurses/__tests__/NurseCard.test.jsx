import { render, screen, fireEvent } from '../../../test/utils';
import NurseCard from '../NurseCard';
import { createNurse } from '../../../test/factories/nurseFactory';

// Mock useDebounce to execute immediately for test simplicity
vi.mock('../../../hooks/useDebounce', () => ({
  useDebounce: (callback) => {
    const fn = (...args) => callback(...args);
    fn.flush = vi.fn();
    return fn;
  },
}));

describe('NurseCard', () => {
  const defaultNurse = createNurse({
    fullName: 'Thandi Nkosi',
    preferredName: 'Thandi',
    pipelineStage: 'Applied',
    nextAction: 'Needs: Chase CV, then scoring',
    nextActionDueDate: '2099-12-31',
    email: 'thandi@example.com',
    communicationLog: [
      { date: '2025-06-10', channel: 'Email', summary: 'Initial outreach', nextAction: 'Follow up' },
    ],
    scorecardFields: {
      hospitalExp: 4,
      sancStatus: 5,
      qualifications: 3,
      specialisation: 2,
      financialReadiness: 3,
      motivation: 4,
      passport: 5,
    },
  });

  it('renders the nurse full name', () => {
    render(<NurseCard nurse={defaultNurse} onClose={vi.fn()} onUpdate={vi.fn()} />);
    expect(screen.getByText('Thandi Nkosi')).toBeInTheDocument();
  });

  it('renders initials when no photo URL', () => {
    const nurse = createNurse({ fullName: 'Jane Doe', photoURL: '' });
    render(<NurseCard nurse={nurse} onClose={vi.fn()} onUpdate={vi.fn()} />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders pipeline stage select with current value', () => {
    render(<NurseCard nurse={defaultNurse} onClose={vi.fn()} onUpdate={vi.fn()} />);
    const stageSelect = screen.getAllByDisplayValue('Applied')[0];
    expect(stageSelect).toBeInTheDocument();
  });

  it('calls onUpdate when pipeline stage is changed', () => {
    const onUpdate = vi.fn();
    render(<NurseCard nurse={defaultNurse} onClose={onUpdate} onUpdate={onUpdate} />);

    const stageSelect = screen.getAllByDisplayValue('Applied')[0];
    fireEvent.change(stageSelect, { target: { value: 'Under Review' } });
    expect(onUpdate).toHaveBeenCalled();
    expect(onUpdate.mock.calls[0][0].pipelineStage).toBe('Under Review');
  });

  it('displays next action with color coding', () => {
    render(<NurseCard nurse={defaultNurse} onClose={vi.fn()} onUpdate={vi.fn()} />);
    // The next action select should show the value
    const nextActionSelect = screen.getByDisplayValue('Needs: Chase CV, then scoring');
    expect(nextActionSelect).toBeInTheDocument();
    // The wrapping div should have color classes (teal for future due date)
    const wrapper = nextActionSelect.closest('div');
    expect(wrapper.className).toContain('bg-teal-50');
  });

  it('displays overdue next action in red', () => {
    const overdueNurse = createNurse({
      nextAction: 'Needs: Chase CV, then scoring',
      nextActionDueDate: '2020-01-01',
    });
    render(<NurseCard nurse={overdueNurse} onClose={vi.fn()} onUpdate={vi.fn()} />);
    const nextActionSelect = screen.getByDisplayValue('Needs: Chase CV, then scoring');
    const wrapper = nextActionSelect.closest('div');
    expect(wrapper.className).toContain('bg-red-50');
  });

  it('renders scorecard section with fields', () => {
    render(<NurseCard nurse={defaultNurse} onClose={vi.fn()} onUpdate={vi.fn()} />);
    expect(screen.getByText('Hospital Exp')).toBeInTheDocument();
    expect(screen.getByText('SANC Status')).toBeInTheDocument();
    expect(screen.getByText('Qualifications')).toBeInTheDocument();
  });

  it('calls onUpdate when scorecard field is changed', () => {
    const onUpdate = vi.fn();
    render(<NurseCard nurse={defaultNurse} onClose={vi.fn()} onUpdate={onUpdate} />);

    // Find all scorecard rating buttons - click a button for Hospital Exp row
    // The Hospital Exp row has rating buttons 1-5, the current value is 4
    // Let's click button "5" in the Hospital Exp row
    const hospitalExpLabel = screen.getByText('Hospital Exp');
    const row = hospitalExpLabel.closest('.flex');
    const buttons = row.querySelectorAll('button');
    // button[4] is the "5" rating
    fireEvent.click(buttons[4]);

    expect(onUpdate).toHaveBeenCalled();
    const updatedNurse = onUpdate.mock.calls[0][0];
    expect(updatedNurse.scorecardFields.hospitalExp).toBe(5);
  });

  it('renders communication log entries', () => {
    render(<NurseCard nurse={defaultNurse} onClose={vi.fn()} onUpdate={vi.fn()} />);
    expect(screen.getByText('Initial outreach')).toBeInTheDocument();
    // "Email" appears multiple times (field label + channel badge), just check summary and channel badge exists
    const channelBadges = screen.getAllByText('Email');
    expect(channelBadges.length).toBeGreaterThan(0);
  });

  it('shows add communication form when button is clicked', () => {
    render(<NurseCard nurse={defaultNurse} onClose={vi.fn()} onUpdate={vi.fn()} />);

    fireEvent.click(screen.getByText('Add Communication'));
    expect(screen.getByPlaceholderText('Summary of communication...')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('hides add communication form when Cancel is clicked', () => {
    render(<NurseCard nurse={defaultNurse} onClose={vi.fn()} onUpdate={vi.fn()} />);

    fireEvent.click(screen.getByText('Add Communication'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByPlaceholderText('Summary of communication...')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<NurseCard nurse={defaultNurse} onClose={onClose} onUpdate={vi.fn()} />);

    // The X button at top right
    const closeButtons = screen.getAllByRole('button');
    const closeBtn = closeButtons.find((btn) => btn.querySelector('.text-gray-500'));
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<NurseCard nurse={defaultNurse} onClose={onClose} onUpdate={vi.fn()} />);

    const backdrop = container.querySelector('.bg-black\\/30');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
