import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LoadingScreen } from '@/components/LoadingScreen';

describe('LoadingScreen', () => {
  it('renders default message', () => {
    render(<LoadingScreen />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('supports custom message and className', () => {
    const { container } = render(<LoadingScreen message="Booting" className="custom" />);
    expect(screen.getByText('Booting')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('custom');
  });
});
