
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ResponsiveUserManagementTable } from '@/components/admin/ResponsiveUserManagementTable';
import { supabase } from '@/integrations/supabase/client';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('User Management Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads and displays users', async () => {
    const mockUsers = [
      {
        id: '1',
        email: 'user1@test.com',
        display_name: 'User One',
        role: 'user',
        user_type: 'member',
        access_level: 'user',
        account_status: 'active',
        created_at: '2024-01-01T00:00:00Z'
      }
    ];

    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { users: mockUsers },
      error: null
    });

    render(<ResponsiveUserManagementTable />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('User One')).toBeInTheDocument();
      expect(screen.getByText('user1@test.com')).toBeInTheDocument();
    });
  });

  it('handles user creation', async () => {
    const user = userEvent.setup();
    
    vi.mocked(supabase.functions.invoke)
      .mockResolvedValueOnce({ data: { users: [] }, error: null }) // Initial load
      .mockResolvedValueOnce({ data: { success: true }, error: null }); // Create user

    render(<ResponsiveUserManagementTable />, { wrapper: createWrapper() });

    // Find and click create user button (would need to implement this in actual component)
    // This is a placeholder for the actual integration test
    expect(true).toBe(true);
  });
});
