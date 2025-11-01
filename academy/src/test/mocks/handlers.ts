
import { http, HttpResponse } from 'msw';

export const handlers = [
  // Mock Supabase auth endpoints
  http.post('*/auth/v1/token', () => {
    return HttpResponse.json({
      access_token: 'mock-token',
      token_type: 'bearer',
      expires_in: 3600,
      user: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        user_metadata: {
          access_level: 'user'
        }
      }
    });
  }),

  // Mock user profile endpoint
  http.get('*/rest/v1/profiles', () => {
    return HttpResponse.json([
      {
        id: '123e4567-e89b-12d3-a456-426614174000',
        display_name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        access_level: 'user',
        account_status: 'active'
      }
    ]);
  }),

  // Mock admin functions
  http.post('*/functions/v1/admin-user-management', () => {
    return HttpResponse.json({
      users: [
        {
          id: '1',
          email: 'user1@test.com',
          display_name: 'User One',
          role: 'user',
          user_type: 'member',
          access_level: 'user',
          account_status: 'active'
        }
      ]
    });
  }),
];
