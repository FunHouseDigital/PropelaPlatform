import { render, screen, fireEvent } from '../../../test/utils';
import FilterPanel from '../FilterPanel';

describe('FilterPanel', () => {
  const defaultProps = {
    filters: {},
    onFilterChange: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    defaultProps.onFilterChange = vi.fn();
    defaultProps.onClose = vi.fn();
  });

  it('renders the Filters heading', () => {
    render(<FilterPanel {...defaultProps} />);
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('renders all filter sections', () => {
    render(<FilterPanel {...defaultProps} />);

    expect(screen.getByText('Cohort')).toBeInTheDocument();
    expect(screen.getByText('Pipeline Stage')).toBeInTheDocument();
    expect(screen.getByText('Specialty')).toBeInTheDocument();
    expect(screen.getByText('Readiness Status')).toBeInTheDocument();
    expect(screen.getByText('Next Action')).toBeInTheDocument();
    expect(screen.getByText('Has Flags')).toBeInTheDocument();
    expect(screen.getByText('EF SET Level')).toBeInTheDocument();
    expect(screen.getByText('OET Status')).toBeInTheDocument();
    expect(screen.getByText('Province')).toBeInTheDocument();
  });

  it('calls onFilterChange when a filter option is checked', () => {
    render(<FilterPanel {...defaultProps} />);

    // Click on "Cohort 1" checkbox
    fireEvent.click(screen.getByLabelText('Cohort 1'));
    expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
      cohort: ['Cohort 1'],
    });
  });

  it('unchecks a filter option when clicked again', () => {
    const filters = { cohort: ['Cohort 1'] };
    render(<FilterPanel {...defaultProps} filters={filters} />);

    fireEvent.click(screen.getByLabelText('Cohort 1'));
    expect(defaultProps.onFilterChange).toHaveBeenCalledWith({
      cohort: [],
    });
  });

  it('calls onClose when the close button is clicked', () => {
    render(<FilterPanel {...defaultProps} />);

    // Find the X close button
    const closeButton = screen.getAllByRole('button').find(
      (btn) => btn.querySelector('.text-gray-500')
    );
    fireEvent.click(closeButton);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Apply button is clicked', () => {
    render(<FilterPanel {...defaultProps} />);

    fireEvent.click(screen.getByText('Apply'));
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onFilterChange with empty object when Clear All is clicked', () => {
    const filters = { cohort: ['Cohort 1'], province: ['Gauteng'] };
    render(<FilterPanel {...defaultProps} filters={filters} />);

    fireEvent.click(screen.getByText('Clear All'));
    expect(defaultProps.onFilterChange).toHaveBeenCalledWith({});
  });

  it('shows active filter count badge', () => {
    const filters = { cohort: ['Cohort 1', 'Cohort 2'], province: ['Gauteng'] };
    render(<FilterPanel {...defaultProps} filters={filters} />);

    // 3 total active filters
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', () => {
    const { container } = render(<FilterPanel {...defaultProps} />);

    const backdrop = container.querySelector('.bg-black\\/20');
    fireEvent.click(backdrop);
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });
});
