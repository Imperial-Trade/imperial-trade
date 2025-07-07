import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import type { User } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Settings as SettingsIcon,
  User as UserIcon,
  Save,
  AlertTriangle,
  CheckCircle,
  Crown,
  Shield,
  Clock,
  CheckCircle2,
  X,
  ChevronDown,
  ChevronRight,
  Edit3,
  Zap,
  Bell,
  Rocket,
} from 'lucide-react';

// This function is assumed to be defined elsewhere in a real application,
// likely part of a routing utility. For this self-contained file,
// a simple mock implementation is provided.
const createPageUrl = (pageName) => {
  switch (pageName) {
    case 'Home':
      return '/'; // Assuming home page is at the root
    // Add other page mappings as needed
    default:
      return `/${pageName.toLowerCase()}`;
  }
};

export default function Settings() {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmittingVerification, setIsSubmittingVerification] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [verificationMessage, setVerificationMessage] = useState({ type: '', text: '' });

  // Verification form state
  const [verificationForm, setVerificationForm] = useState({
    vt_markets_uid: '',
    account_type: 'trader'
  });

  // Expanded sections state
  const [expandedSections, setExpandedSections] = useState({
    accountInfo: false,
    displayName: false,
    verification: false,
    priceConfig: false,
    notifications: true, // Default open notifications section
  });

  useEffect(() => {
    // Check for URL parameter to auto-expand a section
    const urlParams = new URLSearchParams(window.location.search);
    const action = urlParams.get('action');
    if (action === 'verify_name') {
      setExpandedSections(prev => ({ ...prev, displayName: true }));
      // Optionally scroll to the element after a short delay
      setTimeout(() => {
        const element = document.getElementById('display-name-section');
        if(element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }

    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setDisplayName(user?.user_metadata?.full_name || '');
      // Load existing verification data if available
      if (user?.user_metadata?.vt_markets_uid) {
        setVerificationForm({
          vt_markets_uid: user.user_metadata.vt_markets_uid,
          account_type: user.user_metadata.vt_account_type || 'trader'
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setMessage({ type: 'error', text: 'Failed to load user data' });
    }
    setIsLoading(false);
  };

  const toggleSection = (sectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      setMessage({ type: 'error', text: 'Display name cannot be empty' });
      return;
    }

    if (displayName.length < 2) {
      setMessage({ type: 'error', text: 'Display name must be at least 2 characters long' });
      return;
    }

    if (displayName.length > 50) {
      setMessage({ type: 'error', text: 'Display name cannot exceed 50 characters' });
      return;
    }

    setIsSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const trimmedName = displayName.trim();
      
      // Update user metadata in Supabase Auth
      const { error } = await supabase.auth.updateUser({
        data: { full_name: trimmedName }
      });

      if (error) throw error;

      // Check if this was the initial name verification from the URL parameter
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('action') === 'verify_name') {
        // Set flags for the welcome notification on the Home page
        sessionStorage.setItem('nameVerifiedWelcome', 'true');
        sessionStorage.setItem('verifiedName', trimmedName);
        // Redirect to home page to complete the onboarding flow
        window.location.href = createPageUrl('Home');
      } else {
        // Reload user data to get updated info
        await loadUserData();
        setMessage({ type: 'success', text: 'Display name updated successfully!' });
        
        // Dispatch a global event with the updated user
        window.dispatchEvent(new CustomEvent('user-updated', { detail: user }));
      }
    } catch (error) {
      console.error('Error updating display name:', error);
      setMessage({ type: 'error', text: 'Failed to update display name. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerificationSubmit = async (e) => {
    e.preventDefault();

    if (!verificationForm.vt_markets_uid.trim()) {
      setVerificationMessage({ type: 'error', text: 'Please enter your VT Markets UID.' });
      return;
    }

    // Basic UID validation (adjust pattern as needed)
    const uidPattern = /^[A-Za-z0-9]{6,20}$/;
    if (!uidPattern.test(verificationForm.vt_markets_uid.trim())) {
      setVerificationMessage({ type: 'error', text: 'Please enter a valid VT Markets UID (6-20 alphanumeric characters).' });
      return;
    }

    setIsSubmittingVerification(true);
    setVerificationMessage({ type: '', text: '' });

    try {
      // Update user metadata with verification data
      const { error } = await supabase.auth.updateUser({
        data: {
          vt_markets_uid: verificationForm.vt_markets_uid.trim(),
          vt_account_type: verificationForm.account_type,
          verification_status: 'pending',
          verification_submitted_date: new Date().toISOString()
        }
      });

      if (error) throw error;

      // Reload user data
      await loadUserData();

      setVerificationMessage({
        type: 'success',
        text: 'VT Markets account verification submitted successfully! Your account is now under review.'
      });
    } catch (error) {
      console.error('Error submitting verification:', error);
      setVerificationMessage({ type: 'error', text: 'Failed to submit verification. Please try again.' });
    } finally {
      setIsSubmittingVerification(false);
    }
  };

  const getVerificationStatusBadge = () => {
    switch (user?.user_metadata?.verification_status) {
      case 'pending':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/20">
            <Clock className="w-3 h-3 mr-1" />
            Under Review
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Verified Trader
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/20">
            <X className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/20">
            Not Verified
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-green"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <SettingsIcon className="w-8 h-8 text-accent-green" />
            <h1 className="text-3xl lg:text-4xl font-bold text-primary">
              Account <span className="gold-text-gradient">Settings</span>
            </h1>
          </div>
          <p className="text-secondary text-lg">
            Manage your account preferences and profile information
          </p>
        </div>

        <div className="space-y-4">
          {/* Account Info Section */}
          <Card className="glass-effect border-default">
            <CardHeader
              className="cursor-pointer hover:bg-surface/20 transition-colors"
              onClick={() => toggleSection('accountInfo')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserIcon className="w-5 h-5 text-accent-green" />
                  <CardTitle className="text-primary">Account Information</CardTitle>
                </div>
                {expandedSections.accountInfo ?
                  <ChevronDown className="w-5 h-5 text-secondary" /> :
                  <ChevronRight className="w-5 h-5 text-secondary" />
                }
              </div>
            </CardHeader>

            {expandedSections.accountInfo && (
              <CardContent className="space-y-4 border-t border-default/20 pt-4">
                <div>
                  <p className="text-sm text-secondary">Email Address</p>
                  <p className="font-semibold text-primary">{user?.email}</p>
                </div>
                <div>
                  <p className="text-sm text-secondary">Account Level</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {user?.user_metadata?.access_level === 'admin' && (
                      <Badge className="bg-accent-gold/20 text-accent-gold">
                        <Crown className="w-3 h-3 mr-1" />
                        Educator
                      </Badge>
                    )}
                    {user?.user_metadata?.access_level === 'verified' && (
                      <Badge className="bg-blue-500/20 text-blue-400">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Verified Trader
                      </Badge>
                    )}
                    {user?.user_metadata?.access_level === 'user' && (
                      <Badge className="bg-accent-green/20 text-accent-green">
                        <Shield className="w-3 h-3 mr-1" />
                        Member
                      </Badge>
                    )}
                    {user?.user_metadata?.access_level === 'free' && (
                      <Badge className="bg-accent-blue/20 text-accent-blue">
                        Free Tier
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-secondary">Verification Status</p>
                  <div className="mt-1">
                    {getVerificationStatusBadge()}
                  </div>
                </div>
                {user?.user_metadata?.vt_markets_uid && (
                  <div>
                    <p className="text-sm text-secondary">VT Markets UID</p>
                    <p className="font-semibold text-primary">{user.user_metadata.vt_markets_uid}</p>
                  </div>
                )}
                {user?.user_metadata?.vt_account_type && (
                  <div>
                    <p className="text-sm text-secondary">Account Type</p>
                    <p className="font-semibold text-primary capitalize">{user.user_metadata.vt_account_type}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-secondary">Member Since</p>
                  <p className="font-semibold text-primary">
                    {new Date(user?.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Display Name Settings Section */}
          <Card className="glass-effect border-default" id="display-name-section">
            <CardHeader
              className="cursor-pointer hover:bg-surface/20 transition-colors"
              onClick={() => toggleSection('displayName')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Edit3 className="w-5 h-5 text-accent-green" />
                  <div>
                    <CardTitle className="text-primary">Display Name Settings</CardTitle>
                    <p className="text-secondary text-sm mt-1">
                      This name will be displayed throughout the platform
                    </p>
                  </div>
                </div>
                {expandedSections.displayName ?
                  <ChevronDown className="w-5 h-5 text-secondary" /> :
                  <ChevronRight className="w-5 h-5 text-secondary" />
                }
              </div>
            </CardHeader>

            {expandedSections.displayName && (
              <CardContent className="space-y-6 border-t border-default/20 pt-6">
                {/* Important Notice */}
                <Alert className="border-amber-500/20 bg-amber-500/10">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <AlertDescription className="text-amber-200">
                    <strong>Important:</strong> We strongly recommend using your real name to maintain account security
                    and avoid potential temporary holds. Accounts with suspicious or fake names may be subject to review.
                  </AlertDescription>
                </Alert>

                {/* Success/Error Messages */}
                {message.text && (
                  <Alert className={message.type === 'success' ? 'border-green-500/20 bg-green-500/10' : 'border-red-500/20 bg-red-500/10'}>
                    {message.type === 'success' ?
                      <CheckCircle className="w-4 h-4 text-green-400" /> :
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                    }
                    <AlertDescription className={message.type === 'success' ? 'text-green-200' : 'text-red-200'}>
                      {message.text}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Display Name Input */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-primary">
                    Display Name
                  </label>
                  <Input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your full name"
                    className="bg-surface border-default text-primary"
                    maxLength={50}
                  />
                  <div className="flex justify-between text-xs text-secondary">
                    <span>Use your real name for best experience</span>
                    <span>{displayName.length}/50</span>
                  </div>
                </div>

                {/* Guidelines */}
                <div className="bg-surface/50 rounded-lg p-4">
                  <h4 className="font-semibold text-primary mb-2">Display Name Guidelines:</h4>
                  <ul className="text-sm text-secondary space-y-1">
                    <li>• Use your real first and last name</li>
                    <li>• Avoid special characters, numbers, or symbols</li>
                    <li>• Professional names help build trust in the community</li>
                    <li>• Nicknames or handles may trigger security reviews</li>
                  </ul>
                </div>

                {/* Save Button */}
                <Button
                  onClick={handleSave}
                  disabled={isSaving || !displayName.trim() || displayName.trim() === user?.user_metadata?.full_name}
                  className="bg-accent-green hover:bg-green-500 text-white font-semibold"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardContent>
            )}
          </Card>

          {/* Verified Trader Section */}
          {user?.user_metadata?.access_level !== 'verified' && (
            <Card className="glass-effect border-default">
              <CardHeader
                className="cursor-pointer hover:bg-surface/20 transition-colors"
                onClick={() => toggleSection('verification')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-400" />
                    <div>
                      <CardTitle className="text-primary">Become a Verified Trader</CardTitle>
                      <p className="text-secondary text-sm mt-1">
                        Link your VT Markets account to get verified trader status
                      </p>
                    </div>
                  </div>
                  {expandedSections.verification ?
                    <ChevronDown className="w-5 h-5 text-secondary" /> :
                    <ChevronRight className="w-5 h-5 text-secondary" />
                  }
                </div>
              </CardHeader>

              {expandedSections.verification && (
                <CardContent className="space-y-6 border-t border-default/20 pt-6">
                  {/* Verification Info */}
                  <Alert className="border-blue-500/20 bg-blue-500/10">
                    <CheckCircle2 className="w-4 h-4 text-blue-400" />
                    <AlertDescription className="text-blue-200">
                      <strong>Verified Traders</strong> get enhanced credibility, priority support, and access to exclusive features.
                      Link your VT Markets account to verify your trading status.
                    </AlertDescription>
                  </Alert>

                  {/* Verification Status Messages */}
                  {verificationMessage.text && (
                    <Alert className={verificationMessage.type === 'success' ? 'border-green-500/20 bg-green-500/10' : 'border-red-500/20 bg-red-500/10'}>
                      {verificationMessage.type === 'success' ?
                        <CheckCircle className="w-4 h-4 text-green-400" /> :
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      }
                      <AlertDescription className={verificationMessage.type === 'success' ? 'text-green-200' : 'text-red-200'}>
                        {verificationMessage.text}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Current Status */}
                  {user?.user_metadata?.verification_status && user?.user_metadata?.verification_status !== 'none' && (
                    <div className="bg-surface/50 rounded-lg p-4">
                      <h4 className="font-semibold text-primary mb-2">Verification Status</h4>
                      <div className="flex items-center gap-2 mb-2">
                        {getVerificationStatusBadge()}
                      </div>
                      {user?.user_metadata?.verification_submitted_date && (
                        <p className="text-sm text-secondary">
                          Submitted: {new Date(user.user_metadata.verification_submitted_date).toLocaleDateString()}
                        </p>
                      )}
                      {user?.user_metadata?.verification_rejection_reason && (
                        <p className="text-sm text-red-400 mt-2">
                          <strong>Rejection Reason:</strong> {user.user_metadata.verification_rejection_reason}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Verification Form */}
                  {user?.user_metadata?.verification_status !== 'pending' && user?.user_metadata?.verification_status !== 'approved' && (
                    <>
                      <div className="bg-surface/50 rounded-lg p-4">
                        <h4 className="font-semibold text-primary mb-2">Requirements:</h4>
                        <ul className="text-sm text-secondary space-y-1">
                          <li>• Active VT Markets trading account</li>
                          <li>• Valid VT Markets UID (User ID)</li>
                          <li>• Account must be in good standing</li>
                          <li>• Minimum account activity requirements may apply</li>
                        </ul>
                      </div>

                      <form onSubmit={handleVerificationSubmit} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-primary mb-2">
                            VT Markets UID <span className="text-red-400">*</span>
                          </label>
                          <Input
                            type="text"
                            value={verificationForm.vt_markets_uid}
                            onChange={(e) => setVerificationForm(prev => ({...prev, vt_markets_uid: e.target.value}))}
                            placeholder="Enter your VT Markets User ID"
                            className="bg-surface border-default text-primary"
                            required
                          />
                          <p className="text-xs text-secondary mt-1">
                            You can find your UID in your VT Markets client portal or MT4/MT5 platform
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-primary mb-2">
                            Account Type <span className="text-red-400">*</span>
                          </label>
                          <select
                            value={verificationForm.account_type}
                            onChange={(e) => setVerificationForm(prev => ({...prev, account_type: e.target.value}))}
                            className="w-full p-3 bg-surface border border-default rounded-lg text-primary"
                            required
                          >
                            <option value="trader">Regular Trader</option>
                            <option value="ib">Introducing Broker (IB)</option>
                          </select>
                          <p className="text-xs text-secondary mt-1">
                            Select "IB" if you are an Introducing Broker with VT Markets
                          </p>
                        </div>

                        <Button
                          type="submit"
                          disabled={isSubmittingVerification}
                          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold"
                        >
                          {isSubmittingVerification ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Submit for Verification
                            </>
                          )}
                        </Button>
                      </form>
                    </>
                  )}
                </CardContent>
              )}
            </Card>
          )}

          {/* Notification Settings Section */}
          <Card className="glass-effect border-default">
            <CardHeader
              className="cursor-pointer hover:bg-surface/20 transition-colors"
              onClick={() => toggleSection('notifications')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-accent-green" />
                  <div>
                    <CardTitle className="text-primary">Notification Settings</CardTitle>
                    <p className="text-secondary text-sm mt-1">
                      Manage how you receive trade alerts and updates
                    </p>
                  </div>
                </div>
                {expandedSections.notifications ?
                  <ChevronDown className="w-5 h-5 text-secondary" /> :
                  <ChevronRight className="w-5 h-5 text-secondary" />
                }
              </div>
            </CardHeader>

            {expandedSections.notifications && (
              <CardContent className="space-y-6 border-t border-default/20 pt-6">
                <Alert className="border-green-500/20 bg-green-500/10">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <AlertDescription className="text-green-200">
                    <strong>In-App Alerts are Active.</strong> You will receive real-time notifications for trade signals, take-profit hits, and stop-loss triggers directly within the application.
                  </AlertDescription>
                </Alert>
                <div className="bg-surface/50 rounded-lg p-4">
                    <h4 className="font-semibold text-primary mb-2">How It Works:</h4>
                    <ul className="text-sm text-secondary space-y-2">
                        <li className="flex items-start gap-3">
                          <Bell className="w-5 h-5 mt-1 text-accent-green flex-shrink-0" /> 
                          <span>Notifications appear as pop-up cards in the top-right corner of your screen.</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <Rocket className="w-5 h-5 mt-1 text-accent-green flex-shrink-0" /> 
                          <span>You'll be alerted for new signals, order activations, and when trades are closed—no browser permission needed.</span>
                        </li>
                    </ul>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Price Feed Configuration - For Admins Only */}
          {user && user.role === 'admin' && (
            <Card className="glass-effect border-default">
              <CardHeader
                className="cursor-pointer hover:bg-surface/20 transition-colors"
                onClick={() => toggleSection('priceConfig')}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-emerald-400" />
                    <div>
                      <CardTitle className="text-primary">Price Feed Configuration</CardTitle>
                      <p className="text-secondary text-sm mt-1">
                        Live price feed status and configuration
                      </p>
                    </div>
                  </div>
                  {expandedSections.priceConfig ?
                    <ChevronDown className="w-5 h-5 text-secondary" /> :
                    <ChevronRight className="w-5 h-5 text-secondary" />
                  }
                </div>
              </CardHeader>

              {expandedSections.priceConfig && (
                <CardContent className="space-y-6 border-t border-default/20 pt-6">
                  <div className="bg-emerald-900/30 border border-emerald-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-emerald-400 mb-2">
                      <Zap className="w-5 h-5" />
                      <span className="font-semibold">Live Twelve Data Feed Active</span>
                    </div>
                    <p className="text-emerald-300 text-sm mb-3">
                      The application is connected to the Twelve Data API for real-time price feeds.
                    </p>
                     <div className="flex gap-2 flex-wrap">
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Real-Time Prices
                        </Badge>
                        <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                          8s Refresh Rate
                        </Badge>
                    </div>
                  </div>
                  
                  <div className="bg-surface/50 rounded-lg p-4">
                    <h3 className="font-semibold mb-3 text-primary">Supported Instruments</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-secondary">
                      <div>
                        <h4 className="font-medium text-accent-green mb-2">Commodities</h4>
                        <div className="space-y-1">
                          <div>• XAU/USD (Gold)</div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-accent-green mb-2">Cryptocurrency</h4>
                        <div className="space-y-1">
                          <div>• BTC/USD (Bitcoin)</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
