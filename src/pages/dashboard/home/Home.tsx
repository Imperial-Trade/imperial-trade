
import React from 'react';
import { TypeSafetyTest } from '@/components/testing/TypeSafetyTest';
import { useAuth } from '@/contexts/AuthContext';
import EconomicCalendarWidget from '@/components/widgets/EconomicCalendarWidget';
import EconomicEventCountdown from '@/components/widgets/EconomicEventCountdown';
import EconomicNotificationSystem from '@/components/widgets/EconomicNotificationSystem';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen p-6 bg-background">
      <EconomicNotificationSystem enabled={true} />
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-primary mb-2">
            Welcome to <span className="text-accent-green">Imperial Trading</span>
          </h1>
          <p className="text-secondary text-lg">
            Your comprehensive trading education and signal platform
          </p>
        </div>

        {/* Development Test Component */}
        {process.env.NODE_ENV === 'development' && user?.id && (
          <div className="mb-8">
            <TypeSafetyTest userId={user.id} />
          </div>
        )}

        {/* Economic Calendar Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <EconomicCalendarWidget variant="full" maxEvents={6} />
          </div>
          <div>
            <EconomicEventCountdown className="mb-4" />
            <EconomicCalendarWidget variant="compact" maxEvents={3} showOnlyHighImpact={true} />
          </div>
        </div>

        {/* Hero Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-6 bg-surface rounded-lg border border-default">
            <h2 className="text-2xl font-semibold text-primary mb-4">
              Start Your Trading Journey
            </h2>
            <p className="text-secondary mb-6">
              Access premium trading signals, educational resources, and community support to enhance your trading skills.
            </p>
            <a href="/dashboard/signal-stream">
              <button className="bg-accent-green hover:bg-green-500 text-white px-6 py-3 rounded-full font-semibold">
                Explore Trading Signals
              </button>
            </a>
          </div>

          <div className="p-6 bg-surface rounded-lg border border-default">
            <h2 className="text-2xl font-semibold text-primary mb-4">
              Learn and Grow
            </h2>
            <p className="text-secondary mb-6">
              Dive into our comprehensive courses and learning paths designed to take you from beginner to expert trader.
            </p>
            <a href="/dashboard/education">
              <button className="bg-accent-green hover:bg-green-500 text-white px-6 py-3 rounded-full font-semibold">
                Start Learning Now
              </button>
            </a>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="p-4 bg-surface rounded-lg border border-default">
            <h3 className="text-lg font-semibold text-primary mb-2">
              Total Signals
            </h3>
            <p className="text-3xl text-accent-green font-bold">1,245+</p>
          </div>

          <div className="p-4 bg-surface rounded-lg border border-default">
            <h3 className="text-lg font-semibold text-primary mb-2">
              Active Members
            </h3>
            <p className="text-3xl text-accent-green font-bold">8,792+</p>
          </div>

          <div className="p-4 bg-surface rounded-lg border border-default">
            <h3 className="text-lg font-semibold text-primary mb-2">
              Avg. Signal Accuracy
            </h3>
            <p className="text-3xl text-accent-green font-bold">78.5%</p>
          </div>
        </div>

        {/* Latest News & Updates */}
        <div className="mt-8 p-6 bg-surface rounded-lg border border-default">
          <h2 className="text-2xl font-semibold text-primary mb-4">
            Latest News & Updates
          </h2>
          <ul className="space-y-4">
            <li className="text-secondary">
              <span className="text-accent-green font-semibold">New Feature:</span> Real-time Economic Calendar with notifications
            </li>
            <li className="text-secondary">
              <span className="text-accent-green font-semibold">Update:</span> Enhanced market data integration
            </li>
            <li className="text-secondary">
              <span className="text-accent-green font-semibold">Event:</span> Live Trading Session with Expert Trader - Next Week
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
