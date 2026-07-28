import { fireEvent, render, screen, within } from '@testing-library/react';

import PipelineView from '../PipelineView';

function makeNurse(overrides = {}) {
  return {
    id: 'nurse-1',
    fullName: 'Pipeline Nurse',
    pipelineStage: 'Applied',
    readinessStatus: 'Not Ready',
    nextAction: 'No action required',
    flags: 0,
    version: 4,
    ...overrides,
  };
}

function renderPipeline({ nurses = [makeNurse()], pipeline = {}, permissions } = {}) {
  const props = {
    nurses,
    pipeline,
    permissions,
    onNurseClick: vi.fn(),
    onPipelineChange: vi.fn(),
    onRetryPipeline: vi.fn(),
    onReloadPipeline: vi.fn(),
    onRebasePipeline: vi.fn(),
  };
  render(<PipelineView {...props} />);
  return props;
}

function dragNurseTo(nurseId, stage) {
  const dataTransfer = {
    effectAllowed: '',
    dropEffect: '',
    setData: vi.fn(),
  };
  fireEvent.dragStart(screen.getByTestId(`pipeline-card-${nurseId}`), { dataTransfer });
  fireEvent.dragOver(screen.getByTestId(`pipeline-stage-${stage}`), { dataTransfer });
  fireEvent.drop(screen.getByTestId(`pipeline-stage-${stage}`), { dataTransfer });
  return dataTransfer;
}

describe('PipelineView versioned pipeline integration', () => {
  it('submits identifier, base version, stage, and helper-derived readiness', () => {
    const props = renderPipeline();

    const dataTransfer = dragNurseTo('nurse-1', 'OET Passed');

    expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', 'nurse-1');
    expect(props.onPipelineChange).toHaveBeenCalledTimes(1);
    expect(props.onPipelineChange).toHaveBeenCalledWith({
      id: 'nurse-1',
      baseVersion: 4,
      pipelineStage: 'OET Passed',
      readinessStatus: 'Placement Ready',
    });
  });

  it.each(['Enter', ' '])('opens a pipeline card from the keyboard with %s', (key) => {
    const props = renderPipeline();
    const card = screen.getByTestId('pipeline-card-nurse-1');

    fireEvent.keyDown(card, { key });

    expect(props.onNurseClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'nurse-1' }));
    expect(props.onPipelineChange).not.toHaveBeenCalled();
  });

  it('disables role-gated pipeline controls without invoking the command', () => {
    const props = renderPipeline({
      permissions: { canChangePipeline: false },
    });
    const card = screen.getByTestId('pipeline-card-nurse-1');

    expect(card).toHaveAttribute('draggable', 'false');
    expect(card).toHaveAttribute('aria-disabled', 'true');
    dragNurseTo('nurse-1', 'OET Passed');
    expect(props.onPipelineChange).not.toHaveBeenCalled();
  });

  it('disables duplicate moves while a nurse pipeline command is pending', () => {
    const props = renderPipeline({
      pipeline: {
        'nurse-1': {
          state: 'loading',
          decision: null,
        },
      },
    });
    const card = screen.getByTestId('pipeline-card-nurse-1');

    expect(card).toHaveAttribute('draggable', 'false');
    expect(card).toHaveAttribute('aria-disabled', 'true');
    dragNurseTo('nurse-1', 'OET Passed');
    expect(props.onPipelineChange).not.toHaveBeenCalled();
  });

  it('keeps the exact prior stage and readiness after failure and offers explicit recovery', () => {
    const props = renderPipeline({
      pipeline: {
        'nurse-1': {
          state: 'error',
          error: { code: 'NETWORK', message: 'Connection timed out.' },
          previous: { pipelineStage: 'Applied', readinessStatus: 'Not Ready' },
          proposed: { pipelineStage: 'OET Passed', readinessStatus: 'Placement Ready' },
          baseVersion: 4,
          decision: { type: 'pipelineFailure', retryAvailable: true },
        },
      },
    });

    const appliedColumn = screen.getByTestId('pipeline-stage-Applied');
    expect(within(appliedColumn).getByText('Pipeline Nurse')).toBeInTheDocument();
    expect(within(appliedColumn).getByText('Not Ready')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Connection timed out. The previous stage and readiness are still displayed.'
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId('pipeline-card-nurse-1')).toHaveAttribute('draggable', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'Retry move' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reload from server' }));
    expect(props.onRetryPipeline).toHaveBeenCalledWith('nurse-1');
    expect(props.onReloadPipeline).toHaveBeenCalledWith('nurse-1');
  });

  it('shows latest conflict details and requires reload or rebase before another move', () => {
    const latest = makeNurse({
      pipelineStage: 'Under Review',
      readinessStatus: 'Not Ready',
      version: 5,
    });
    const props = renderPipeline({
      pipeline: {
        'nurse-1': {
          state: 'error',
          error: null,
          previous: { pipelineStage: 'Applied', readinessStatus: 'Not Ready' },
          proposed: { pipelineStage: 'OET Passed', readinessStatus: 'Placement Ready' },
          baseVersion: 4,
          decision: {
            type: 'pipelineConflict',
            latest,
            retryAvailable: false,
            requiresReload: true,
          },
        },
      },
    });

    expect(screen.getByText('Pipeline move conflicted')).toBeInTheDocument();
    expect(screen.getByText(/now in Under Review/)).toBeInTheDocument();
    expect(screen.getByText(/version 5/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry move' })).not.toBeInTheDocument();
    expect(screen.getByTestId('pipeline-card-nurse-1')).toHaveAttribute('draggable', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'Reload from server' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rebase on latest' }));
    expect(props.onReloadPipeline).toHaveBeenCalledWith('nurse-1');
    expect(props.onRebasePipeline).toHaveBeenCalledWith('nurse-1');
    expect(props.onPipelineChange).not.toHaveBeenCalled();
  });
});
