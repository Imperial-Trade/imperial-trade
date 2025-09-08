import { 
  Eye, 
  Settings, 
  Bell, 
  Mail, 
  User, 
  Lock, 
  Shield, 
  FileText,
  Database,
  Globe
} from 'lucide-react';
import { LegalSection } from '@/components/legal/LegalSection';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-surface to-muted border-b border-border">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="text-center">
            <div className="inline-flex items-center gap-3 mb-4">
              <Shield className="w-8 h-8 text-accent-blue" />
              <h1 className="text-4xl font-bold text-foreground">Privacy Policy</h1>
            </div>
            <p className="text-lg text-muted-foreground mb-2">
              Your Data Protection and Privacy Rights
            </p>
            <div className="inline-flex items-center gap-2 text-sm text-accent-blue bg-accent-blue/10 px-4 py-2 rounded-full">
              <FileText className="w-4 h-4" />
              <span>Effective Date: January 1, 2025</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        
        <LegalSection icon={Eye} title="1. Information We Collect" variant="info">
          <p className="mb-4">
            Trade Imperial collects information to provide superior educational trading services. We are transparent about our data collection practices:
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 mb-4">
            <div className="bg-surface p-4 rounded-lg border border-border">
              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <User className="w-4 h-4 text-accent-blue" />
                Account Information
              </h4>
              <ul className="text-sm space-y-1">
                <li>• Full name and email address</li>
                <li>• Phone number (optional)</li>
                <li>• Account preferences and settings</li>
                <li>• Profile information and avatar</li>
              </ul>
            </div>
            
            <div className="bg-surface p-4 rounded-lg border border-border">
              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4 text-accent-green" />
                Platform Usage Data
              </h4>
              <ul className="text-sm space-y-1">
                <li>• Trading preferences and journal entries</li>
                <li>• Course progress and completion data</li>
                <li>• Platform interaction analytics</li>
                <li>• Device and browser information</li>
              </ul>
            </div>
          </div>

          <div className="bg-accent-blue/5 border border-accent-blue/20 rounded-lg p-4">
            <p className="text-sm">
              <strong>Privacy-First Approach:</strong> We only collect data that directly enhances your educational trading experience. No unnecessary personal information is ever requested or stored.
            </p>
          </div>
        </LegalSection>

        <LegalSection icon={Settings} title="2. How We Use Your Information" variant="default">
          <p className="mb-4">Your information is used exclusively to enhance your educational trading experience:</p>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-surface rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-accent-green/10 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-accent-green">1</span>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Platform Operations</h4>
                <p className="text-sm text-muted-foreground">Maintain and improve our trading education platform functionality</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-surface rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-accent-blue/10 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-accent-blue">2</span>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Educational Content Delivery</h4>
                <p className="text-sm text-muted-foreground">Send trading alerts, course updates, and educational notifications</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-surface rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-accent-gold/10 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-accent-gold">3</span>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Personalization</h4>
                <p className="text-sm text-muted-foreground">Customize your learning experience and trading preferences</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-surface rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-accent-red/10 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-accent-red">4</span>
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Security & Fraud Prevention</h4>
                <p className="text-sm text-muted-foreground">Protect your account and ensure platform security</p>
              </div>
            </div>
          </div>
        </LegalSection>

        <LegalSection icon={Bell} title="3. Push Notifications and Communications" variant="info">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-accent-blue/5 to-accent-blue/10 p-4 rounded-lg border border-accent-blue/20">
              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Bell className="w-4 h-4 text-accent-blue" />
                Push Notifications
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Real-time trading alerts powered by OneSignal for immediate market insights and educational content.
              </p>
              <ul className="text-xs space-y-1">
                <li>• Market analysis and trading opportunities</li>
                <li>• Live session start notifications</li>
                <li>• Course update alerts</li>
                <li>• Portfolio milestone achievements</li>
              </ul>
            </div>
            
            <div className="bg-gradient-to-br from-accent-green/5 to-accent-green/10 p-4 rounded-lg border border-accent-green/20">
              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Mail className="w-4 h-4 text-accent-green" />
                Email Communications
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                Professional email updates for comprehensive market education and platform announcements.
              </p>
              <ul className="text-xs space-y-1">
                <li>• Weekly market analysis reports</li>
                <li>• New course and content releases</li>
                <li>• Platform feature updates</li>
                <li>• Account security notifications</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 bg-muted/30 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Full Control:</strong> You can easily manage all notification preferences through your account settings or disable them entirely through your device settings.
            </p>
          </div>
        </LegalSection>

        <LegalSection icon={Lock} title="4. Data Security and Protection" variant="success">
          <p className="mb-4">
            Trade Imperial employs enterprise-grade security measures to protect your personal information:
          </p>
          
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 bg-surface rounded-lg border border-border">
              <Lock className="w-8 h-8 text-accent-green mx-auto mb-2" />
              <h4 className="font-semibold text-foreground mb-1">Encryption</h4>
              <p className="text-xs text-muted-foreground">256-bit SSL encryption for all data transmission</p>
            </div>
            
            <div className="text-center p-4 bg-surface rounded-lg border border-border">
              <Database className="w-8 h-8 text-accent-blue mx-auto mb-2" />
              <h4 className="font-semibold text-foreground mb-1">Storage</h4>
              <p className="text-xs text-muted-foreground">Encrypted database storage with regular security audits</p>
            </div>
            
            <div className="text-center p-4 bg-surface rounded-lg border border-border">
              <Shield className="w-8 h-8 text-accent-gold mx-auto mb-2" />
              <h4 className="font-semibold text-foreground mb-1">Access Control</h4>
              <p className="text-xs text-muted-foreground">Multi-factor authentication and role-based access</p>
            </div>
          </div>
          
          <div className="bg-accent-green/5 border border-accent-green/20 rounded-lg p-4">
            <p className="text-sm">
              <strong>Industry Standards:</strong> Our security practices comply with SOC 2 Type II standards and are regularly audited by third-party security firms.
            </p>
          </div>
        </LegalSection>

        <LegalSection icon={User} title="5. Your Privacy Rights and Choices" variant="default">
          <p className="mb-4">You have comprehensive control over your personal data:</p>
          
          <div className="space-y-3">
            <div className="flex items-center gap-4 p-3 bg-surface rounded-lg border border-border">
              <div className="flex-shrink-0">
                <Eye className="w-5 h-5 text-accent-blue" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Access Your Data</h4>
                <p className="text-sm text-muted-foreground">View and download all personal information we have about you</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-3 bg-surface rounded-lg border border-border">
              <div className="flex-shrink-0">
                <Settings className="w-5 h-5 text-accent-green" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Correct Your Information</h4>
                <p className="text-sm text-muted-foreground">Update or correct any inaccurate personal information</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-3 bg-surface rounded-lg border border-border">
              <div className="flex-shrink-0">
                <User className="w-5 h-5 text-accent-red" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Delete Your Account</h4>
                <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-3 bg-surface rounded-lg border border-border">
              <div className="flex-shrink-0">
                <Mail className="w-5 h-5 text-accent-gold" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Communication Preferences</h4>
                <p className="text-sm text-muted-foreground">Opt-out of marketing communications while keeping essential alerts</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-3 bg-surface rounded-lg border border-border">
              <div className="flex-shrink-0">
                <Globe className="w-5 h-5 text-accent-blue" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Data Portability</h4>
                <p className="text-sm text-muted-foreground">Export your data in a machine-readable format</p>
              </div>
            </div>
          </div>
        </LegalSection>

        <LegalSection icon={Database} title="6. Data Sharing and Third Parties" variant="warning">
          <div className="bg-accent-red/5 border border-accent-red/20 rounded-lg p-4 mb-4">
            <p className="font-semibold text-accent-red mb-2">🔒 NO DATA SELLING POLICY</p>
            <p className="text-sm">
              Trade Imperial NEVER sells, rents, or trades your personal information to third parties for marketing purposes.
            </p>
          </div>
          
          <p className="mb-4">We only share limited data with trusted service providers who help operate our platform:</p>
          
          <div className="space-y-3">
            <div className="p-3 bg-surface rounded-lg border border-border">
              <h4 className="font-semibold text-foreground mb-2">Essential Service Providers</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Supabase:</strong> Database hosting and authentication (encrypted data storage)</li>
                <li>• <strong>OneSignal:</strong> Push notification delivery (notification tokens only)</li>
                <li>• <strong>PostHog:</strong> Anonymous usage analytics (no personal identifiers)</li>
              </ul>
            </div>
          </div>
        </LegalSection>

        <LegalSection icon={Mail} title="7. Contact Our Privacy Team" variant="info">
          <p className="mb-4">
            For any privacy-related questions, concerns, or requests, our dedicated privacy team is here to help:
          </p>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-accent-blue/5 to-accent-blue/10 p-6 rounded-lg border border-accent-blue/20">
              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Mail className="w-5 h-5 text-accent-blue" />
                Privacy Officer
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                <strong>Email:</strong> privacy@tradeimperial.com<br />
                <strong>Response Time:</strong> 48 hours maximum<br />
                <strong>Specializes in:</strong> Data requests, privacy concerns
              </p>
            </div>
            
            <div className="bg-gradient-to-br from-accent-green/5 to-accent-green/10 p-6 rounded-lg border border-accent-green/20">
              <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5 text-accent-green" />
                Security Team
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                <strong>Email:</strong> security@tradeimperial.com<br />
                <strong>Response Time:</strong> 24 hours for security issues<br />
                <strong>Specializes in:</strong> Account security, data breaches
              </p>
            </div>
          </div>
          
          <div className="mt-4 bg-muted/30 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground text-center">
              <strong>Mailing Address:</strong> Trade Imperial Privacy Team, 123 Financial District, Suite 456, New York, NY 10001
            </p>
          </div>
        </LegalSection>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-border text-center">
          <div className="bg-muted/30 rounded-lg p-6">
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Last Updated:</strong> January 1, 2025 | <strong>Version:</strong> 3.0 | <strong>Next Review:</strong> July 1, 2025
            </p>
            <p className="text-xs text-muted-foreground">
              We may update this Privacy Policy periodically. Material changes will be communicated via email and platform notifications 30 days in advance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}