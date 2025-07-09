
import React from 'react';
import { TypeSafetyTest } from '@/components/testing/TypeSafetyTest';
import ComponentTypeSafetyTest from '@/components/testing/ComponentTypeSafetyTest';
import Phase4TestSuite from '@/components/testing/Phase4TestSuite';
import { useAuth } from '@/contexts/AuthContext';

export default function DevTests() {
  const { user } = useAuth();

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="min-h-screen p-6 bg-background">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-primary mb-4">
              Development Tools
            </h1>
            <p className="text-secondary">
              This page is only available in development mode.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary mb-2">
            Development Testing Suite
          </h1>
          <p className="text-secondary text-lg">
            Comprehensive type safety and component testing for Imperial Trading
          </p>
        </div>

        <div className="space-y-8">
          {/* Phase 4: Enhanced Resilience Test Suite */}
          <div className="mb-8">
            <Phase4TestSuite />
          </div>

          {/* Phase 2: API & Data Flow Type Safety Test */}
          {user?.id && (
            <div className="mb-8">
              <TypeSafetyTest userId={user.id} />
            </div>
          )}

          {/* Phase 4: Component Type Safety Test */}
          <div>
            <ComponentTypeSafetyTest />
          </div>
        </div>

        {/* Development Info */}
        <div className="mt-8 p-6 bg-surface rounded-lg border border-default">
          <h2 className="text-xl font-semibold text-primary mb-4">
            Development Environment Info
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-primary">Environment:</span>
              <span className="ml-2 text-secondary">{process.env.NODE_ENV}</span>
            </div>
            <div>
              <span className="font-medium text-primary">User ID:</span>
              <span className="ml-2 text-secondary font-mono">{user?.id || 'Not authenticated'}</span>
            </div>
            <div>
              <span className="font-medium text-primary">User Email:</span>
              <span className="ml-2 text-secondary">{user?.email || 'Not authenticated'}</span>
            </div>
            <div>
              <span className="font-medium text-primary">Access Level:</span>
              <span className="ml-2 text-secondary">{user?.user_metadata?.access_level || 'free'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
