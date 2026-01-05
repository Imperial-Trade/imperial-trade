/**
 * Broker Login Form with Animation
 * Secure credential input with encryption
 */

import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User, Server, Loader2 } from 'lucide-react';
import { encryptCredentials, hashCredentials } from '@/utils/encryption';
import { BrokerType } from './BrokerSelection';
import { supabase } from '@/integrations/supabase/client';

interface BrokerLoginFormProps {
  broker: BrokerType;
  isDarkMode: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export const BrokerLoginForm: React.FC<BrokerLoginFormProps> = ({
  broker,
  isDarkMode,
  onSuccess,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    login: '',
    password: '',
    server: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setIsAnimating(true);

    try {
      // Validate
      if (!formData.login || !formData.password || !formData.server) {
        throw new Error('Please fill in all fields');
      }

      // Encrypt credentials client-side
      const encryptedLogin = await encryptCredentials(formData.login);
      const encryptedPassword = await encryptCredentials(formData.password);
      const encryptedServer = await encryptCredentials(formData.server);
      
      // Create hash for comparison (without storing plaintext)
      const credentialsHash = await hashCredentials(
        formData.login,
        formData.password,
        formData.server
      );

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Store encrypted credentials in Supabase
      const { error: dbError } = await supabase
        .from('broker_connections')
        .upsert({
          user_id: user.id,
          broker_type: broker,
          encrypted_login: encryptedLogin,
          encrypted_password: encryptedPassword,
          encrypted_server: encryptedServer,
          credentials_hash: credentialsHash, // For detecting changes
          is_active: true,
          last_sync_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,broker_type'
        });

      if (dbError) {
        throw dbError;
      }

      // Trigger connection test via Edge Function
      const { error: testError } = await supabase.functions.invoke('test-broker-connection', {
        body: {
          broker_type: broker,
          encrypted_login: encryptedLogin,
          encrypted_password: encryptedPassword,
          encrypted_server: encryptedServer
        }
      });

      if (testError) {
        throw new Error('Failed to connect to broker. Please check your credentials.');
      }

      // Success animation
      setTimeout(() => {
        setIsAnimating(false);
        onSuccess();
      }, 1000);

    } catch (err: any) {
      setError(err.message || 'Failed to connect broker');
      setIsLoading(false);
      setIsAnimating(false);
    }
  };

  const getBrokerName = (type: BrokerType): string => {
    switch (type) {
      case 'XS': return 'XS.com';
      case 'EC_MARKETS': return 'EC Markets';
      case 'PU_PRIME': return 'PU Prime';
      default: return 'Broker';
    }
  };

  return (
    <div className={`
      relative overflow-hidden rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8
      ${isDarkMode ? 'bg-[#0A0A0A] border border-white/10' : 'bg-[#F5F5F0] border border-black/10'}
      w-full max-w-2xl mx-auto
    `}>
      {/* Animated background gradient */}
      <div className={`
        absolute inset-0 opacity-0 transition-opacity duration-1000
        ${isAnimating ? 'opacity-100' : ''}
        ${isDarkMode 
          ? 'bg-gradient-to-br from-bronze-500/20 via-transparent to-bronze-500/10'
          : 'bg-gradient-to-br from-yellow-500/20 via-transparent to-yellow-500/10'
        }
      `} />

      {/* Success checkmark animation */}
      {isAnimating && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className={`
            w-20 h-20 rounded-full flex items-center justify-center
            animate-scale-in
            ${isDarkMode ? 'bg-bronze-500' : 'bg-yellow-500'}
          `}>
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>
      )}

      <div className={`relative z-0 ${isAnimating ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
        <h3 className="text-xl sm:text-2xl font-bold mb-2 text-foreground">
          Connect to {getBrokerName(broker)}
        </h3>
        <p className="text-xs sm:text-sm text-foreground/70 mb-4 sm:mb-6">
          Enter your MT5 credentials to enable automatic trade syncing
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Login */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-2 text-foreground">
              Account Number
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-foreground/50" />
              <input
                type="text"
                value={formData.login}
                onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                className={`
                  w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border text-sm sm:text-base
                  ${isDarkMode 
                    ? 'bg-white/5 border-white/10 text-white focus:border-bronze-500' 
                    : 'bg-white border-black/10 text-black focus:border-yellow-500'
                  }
                  focus:outline-none focus:ring-2 focus:ring-bronze-500/50
                `}
                placeholder="Enter your MT5 account number"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-2 text-foreground">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-foreground/50" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={`
                  w-full pl-9 sm:pl-10 pr-10 sm:pr-12 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border text-sm sm:text-base
                  ${isDarkMode 
                    ? 'bg-white/5 border-white/10 text-white focus:border-bronze-500' 
                    : 'bg-white border-black/10 text-black focus:border-yellow-500'
                  }
                  focus:outline-none focus:ring-2 focus:ring-bronze-500/50
                `}
                placeholder="Enter your MT5 password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground active:scale-95"
              >
                {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
            </div>
          </div>

          {/* Server */}
          <div>
            <label className="block text-xs sm:text-sm font-medium mb-2 text-foreground">
              Server
            </label>
            <div className="relative">
              <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-foreground/50" />
              <input
                type="text"
                value={formData.server}
                onChange={(e) => setFormData({ ...formData, server: e.target.value })}
                className={`
                  w-full pl-9 sm:pl-10 pr-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border text-sm sm:text-base
                  ${isDarkMode 
                    ? 'bg-white/5 border-white/10 text-white focus:border-bronze-500' 
                    : 'bg-white border-black/10 text-black focus:border-yellow-500'
                  }
                  focus:outline-none focus:ring-2 focus:ring-bronze-500/50
                `}
                placeholder="e.g., ECMarkets-MT5-Live01"
                required
              />
            </div>
          </div>

          {error && (
            <div className={`
              p-3 rounded-lg sm:rounded-xl text-xs sm:text-sm
              ${isDarkMode ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'}
            `}>
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className={`
                flex-1 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all
                text-sm sm:text-base
                ${isDarkMode 
                  ? 'bg-white/5 hover:bg-white/10 active:bg-white/15 text-white' 
                  : 'bg-black/5 hover:bg-black/10 active:bg-black/15 text-black'
                }
              `}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`
                flex-1 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all
                flex items-center justify-center gap-2 text-sm sm:text-base
                ${isDarkMode
                  ? 'bg-bronze-500 hover:bg-bronze-600 active:bg-bronze-700 text-white'
                  : 'bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700 text-black'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Connect Broker'
              )}
            </button>
          </div>
        </form>

        <p className="text-[10px] sm:text-xs text-foreground/50 mt-4 text-center">
          🔒 Your credentials are encrypted and never stored in plain text
        </p>
      </div>
    </div>
  );
};

