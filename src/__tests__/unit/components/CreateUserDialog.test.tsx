
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CreateUserDialog } from '@/components/admin/CreateUserDialog';
import { TestWrapper } from '@/test/utils/test-helpers';

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockCreateUser = vi.fn();

const renderCreateUserDialog = () => {
  return render(
    <TestWrapper>
      <CreateUserDialog onCreateUser={mockCreateUser} />
    </TestWrapper>
  );
};

describe('CreateUserDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create user button', () => {
    renderCreateUserDialog();
    expect(screen.getByRole('button', { name: /create user/i })).toBeInTheDocument();
  });

  it('opens dialog when create user button is clicked', async () => {
    const user = userEvent.setup();
    renderCreateUserDialog();
    
    await user.click(screen.getByRole('button', { name: /create user/i }));
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Create New User')).toBeInTheDocument();
  });

  it('renders all form fields', async () => {
    const user = userEvent.setup();
    renderCreateUserDialog();
    
    await user.click(screen.getByRole('button', { name: /create user/i }));
    
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/user type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/access level/i)).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    renderCreateUserDialog();
    
    await user.click(screen.getByRole('button', { name: /create user/i }));
    
    // Try to submit without filling required fields
    const submitButton = screen.getByRole('button', { name: /create user$/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/email address is required/i)).toBeInTheDocument();
    });
  });

  it('validates email format', async () => {
    const user = userEvent.setup();
    renderCreateUserDialog();
    
    await user.click(screen.getByRole('button', { name: /create user/i }));
    
    const emailInput = screen.getByLabelText(/email address/i);
    await user.type(emailInput, 'invalid-email');
    
    const submitButton = screen.getByRole('button', { name: /create user$/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    });
  });

  it('validates password length', async () => {
    const user = userEvent.setup();
    renderCreateUserDialog();
    
    await user.click(screen.getByRole('button', { name: /create user/i }));
    
    const passwordInput = screen.getByLabelText(/password/i);
    await user.type(passwordInput, '123'); // Too short
    
    const submitButton = screen.getByRole('button', { name: /create user$/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/password must be at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('creates user with valid data', async () => {
    const user = userEvent.setup();
    mockCreateUser.mockResolvedValue(undefined);
    
    renderCreateUserDialog();
    
    await user.click(screen.getByRole('button', { name: /create user/i }));
    
    // Fill in valid form data
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.type(screen.getByLabelText(/display name/i), 'Test User');
    
    const submitButton = screen.getByRole('button', { name: /create user$/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockCreateUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        display_name: 'Test User',
        user_type: 'member',
        access_level: 'user',
        role: 'user'
      });
    });
  });

  it('handles form submission error', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Failed to create user';
    mockCreateUser.mockRejectedValue(new Error(errorMessage));
    
    renderCreateUserDialog();
    
    await user.click(screen.getByRole('button', { name: /create user/i }));
    
    // Fill in valid form data
    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.type(screen.getByLabelText(/display name/i), 'Test User');
    
    const submitButton = screen.getByRole('button', { name: /create user$/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockCreateUser).toHaveBeenCalled();
    });
  });

  it('closes dialog when cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderCreateUserDialog();
    
    await user.click(screen.getByRole('button', { name: /create user/i }));
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);
    
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('clears form after successful submission', async () => {
    const user = userEvent.setup();
    mockCreateUser.mockResolvedValue(undefined);
    
    renderCreateUserDialog();
    
    await user.click(screen.getByRole('button', { name: /create user/i }));
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const displayNameInput = screen.getByLabelText(/display name/i);
    
    // Fill in form data
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(displayNameInput, 'Test User');
    
    const submitButton = screen.getByRole('button', { name: /create user$/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockCreateUser).toHaveBeenCalled();
    });
    
    // Dialog should close and reopen with cleared form
    await user.click(screen.getByRole('button', { name: /create user/i }));
    
    expect(screen.getByLabelText(/email address/i)).toHaveValue('');
    expect(screen.getByLabelText(/password/i)).toHaveValue('');
    expect(screen.getByLabelText(/display name/i)).toHaveValue('');
  });
});
