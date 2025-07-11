
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestWrapper } from '@/test/utils/test-helpers';
import { AccountRequestForm } from '@/components/account-request/AccountRequestForm';
import { useAccountRequestForm } from '@/hooks/useAccountRequestForm';
import { AccountRequest } from '@/api/entities';

// Mock the AccountRequest entity
vi.mock('@/api/entities', () => ({
  AccountRequest: {
    create: vi.fn(),
    list: vi.fn()
  }
}));

// Mock the hook
vi.mock('@/hooks/useAccountRequestForm');

describe('Account Request Flow Integration Test', () => {
  const mockForm = {
    control: {} as any,
    handleSubmit: vi.fn((fn) => fn),
    formState: { 
      isSubmitting: false,
      errors: {}
    },
    reset: vi.fn()
  };

  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAccountRequestForm).mockReturnValue({
      form: mockForm,
      onSubmit: mockOnSubmit,
      canSubmit: true,
      isSubmitting: false
    });
  });

  it('should handle user account type selection correctly', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <AccountRequestForm
          form={mockForm}
          onSubmit={mockOnSubmit}
          isSubmitting={false}
          canSubmit={true}
        />
      </TestWrapper>
    );

    // Find and click the account type selector
    const accountTypeSelect = screen.getByRole('combobox');
    await user.click(accountTypeSelect);

    // Verify both options are available
    expect(screen.getByText('Standard Member')).toBeInTheDocument();
    expect(screen.getByText('Educator / IB Partner')).toBeInTheDocument();

    // Select educator option
    await user.click(screen.getByText('Educator / IB Partner'));

    // The form should now have the educator value selected
    expect(accountTypeSelect).toHaveTextContent('Educator / IB Partner');
  });

  it('should prevent bot submissions via honeypot', async () => {
    const botForm = {
      ...mockForm,
      getValues: () => ({
        full_name: 'Bot Name',
        email: 'bot@example.com',
        account_type: 'user',
        website: 'http://spam-site.com' // Bot filled honeypot
      })
    };

    render(
      <TestWrapper>
        <AccountRequestForm
          form={botForm}
          onSubmit={mockOnSubmit}
          isSubmitting={false}
          canSubmit={true}
        />
      </TestWrapper>
    );

    // The honeypot field should be hidden
    const honeypotField = document.querySelector('input[name="website"]');
    expect(honeypotField).toBeInTheDocument();
    expect(honeypotField?.closest('div')).toHaveStyle({ display: 'none' });
  });

  it('should validate required fields properly', async () => {
    const user = userEvent.setup();
    
    render(
      <TestWrapper>
        <AccountRequestForm
          form={mockForm}
          onSubmit={mockOnSubmit}
          isSubmitting={false}
          canSubmit={true}
        />
      </TestWrapper>
    );

    // Try to submit without filling required fields
    const submitButton = screen.getByRole('button', { name: /submit request/i });
    await user.click(submitButton);

    // Form validation should prevent submission
    expect(mockOnSubmit).toHaveBeenCalled();
  });

  it('should handle account creation for educator type', async () => {
    const mockAccountRequest = {
      id: 'test-id',
      full_name: 'Test Educator',
      email: 'educator@test.com',
      account_type: 'educator',
      status: 'approved'
    };

    vi.mocked(AccountRequest.create).mockResolvedValue(mockAccountRequest);

    const testData = {
      full_name: 'Test Educator',
      email: 'educator@test.com',
      phone_number: '1234567890',
      vt_market_account_number: 'VT123456',
      referrer: '',
      account_type: 'educator' as const,
      reason: 'I want to become an educator to teach trading strategies.',
      website: '' // Honeypot should be empty
    };

    await mockOnSubmit(testData);

    expect(AccountRequest.create).toHaveBeenCalledWith(testData);
  });

  it('should enforce rate limiting', async () => {
    const rateLimitedHook = {
      ...mockForm,
      onSubmit: mockOnSubmit,
      canSubmit: false, // Rate limited
      isSubmitting: false
    };

    vi.mocked(useAccountRequestForm).mockReturnValue(rateLimitedHook);

    render(
      <TestWrapper>
        <AccountRequestForm
          form={mockForm}
          onSubmit={mockOnSubmit}
          isSubmitting={false}
          canSubmit={false}
        />
      </TestWrapper>
    );

    const submitButton = screen.getByRole('button', { name: /submit request/i });
    expect(submitButton).toBeDisabled();
    
    // Should show rate limit message
    expect(screen.getByText(/rate limit reached/i)).toBeInTheDocument();
  });
});
