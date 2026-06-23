import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../../../test/utils';
import AccessibilitySettings from '../AccessibilitySettings';

describe('AccessibilitySettings', () => {
  it('renders the accessibility settings form', () => {
    render(<AccessibilitySettings />);

    expect(screen.getByText('High Contrast Mode')).toBeInTheDocument();
    expect(screen.getByText('Motion Preferences')).toBeInTheDocument();
    expect(screen.getByText('Font Size')).toBeInTheDocument();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('renders high contrast toggle as off by default', () => {
    render(<AccessibilitySettings />);

    // First switch is high contrast
    const switches = screen.getAllByRole('switch');
    expect(switches[0]).toHaveAttribute('aria-checked', 'false');
  });

  it('toggles high contrast mode on click', () => {
    render(<AccessibilitySettings />);

    const switches = screen.getAllByRole('switch');
    const highContrastToggle = switches[0];

    expect(highContrastToggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(highContrastToggle);
    expect(highContrastToggle).toHaveAttribute('aria-checked', 'true');
  });

  it('toggles reduced motion on click', () => {
    render(<AccessibilitySettings />);

    const switches = screen.getAllByRole('switch');
    const reducedMotionToggle = switches[1];

    expect(reducedMotionToggle).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(reducedMotionToggle);
    expect(reducedMotionToggle).toHaveAttribute('aria-checked', 'true');
  });

  it('selects font size options', () => {
    render(<AccessibilitySettings />);

    const largeButton = screen.getByText('Large');
    fireEvent.click(largeButton);

    // After click, the Large button should have the selected styling
    expect(largeButton.closest('button')).toHaveClass('border-[#5B2D8E]');
  });

  it('saves settings on save button click', () => {
    render(<AccessibilitySettings />);

    // Toggle high contrast on
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);

    // Click save
    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    // Should show saved confirmation
    expect(screen.getByText('Saved!')).toBeInTheDocument();
  });

  it('renders all three font size options', () => {
    render(<AccessibilitySettings />);

    expect(screen.getByText('Small')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Large')).toBeInTheDocument();
  });
});
