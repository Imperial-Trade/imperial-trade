import React from 'react';

interface User {
  id: string;
  role?: string;
  [key: string]: unknown;
}

interface UseAuthResult {
  user: User | null;
  isLoading: boolean;
}

export const useAuth = (): UseAuthResult => {
  // Lightweight placeholder that can be wired to Supabase Auth later.
  // Keeps the app compiling if the real hook isn't present.
  const [user] = React.useState<User | null>(null);
  return { user, isLoading: false };
};
