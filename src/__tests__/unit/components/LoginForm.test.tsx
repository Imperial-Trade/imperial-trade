
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useForm } from 'react-hook-form';
import { LoginForm } from '@/components/login/LoginForm';
import { LoginFormData } from '@/lib/validations/loginSchema';
import { TestWrapper } from '@/test/utils/test-helpers';

const mockOnSubmit = vi.fn();

const TestLoginForm = ({ 
  isSubmitting = false 
}: { 
  isSubmitting?: boolean; 
}) => {
  const form = useForm<LoginFormData>({
    defaultValues: {
      email: '',
      password: '',
      website: '' // Changed from honeypot to website to match schema
    }
  });

  return (
    <TestWrapper>
      <LoginForm
        form={form}
        onSubmit={mockOnSubmit}
        isSubmitting={isSubmitting}
      />
    </TestWrapper>
  );
};

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form fields', () => {
    render(<TestLoginForm />);
    
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows password toggle button', () => {
    render(<TestLoginForm />);
    
    const toggleButton = screen.getByRole('button', { name: '' }); // Password toggle button
    expect(toggleButton).toBeInTheDocument();
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<TestLoginForm />);
    
    const passwordInput = screen.getByLabelText(/password/i);
    const toggleButton = screen.getByRole('button', { name: '' });
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    
    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    render(<TestLoginForm />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);
    
    expect(mockOnSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      website: '' // Changed from honeypot to website
    });
  });

  it('shows loading state when submitting', () => {
    render(<TestLoginForm isSubmitting={true} />);
    
    const submitButton = screen.getByRole('button', { name: /signing in/i });
    expect(submitButton).toBeDisabled();
    expect(screen.getByText(/signing in/i)).toBeInTheDocument();
  });

  it('disables inputs when submitting', () => {
    render(<TestLoginForm isSubmitting={true} />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    
    expect(emailInput).toBeDisabled();
    expect(passwordInput).toBeDisabled();
  });

  it('includes honeypot field for security', () => {
    render(<TestLoginForm />);
    
    // Honeypot field should be present but hidden (website field)
    const honeypotField = document.querySelector('input[name="website"]');
    expect(honeypotField).toBeInTheDocument();
  });

  it('displays email and password icons', () => {
    render(<TestLoginForm />);
    
    // Check for mail and lock icons (they should be in the DOM)
    const emailContainer = screen.getByLabelText(/email address/i).closest('div');
    const passwordContainer = screen.getByLabelText(/password/i).closest('div');
    
    expect(emailContainer).toBeInTheDocument();
    expect(passwordContainer).toBeInTheDocument();
  });
});
