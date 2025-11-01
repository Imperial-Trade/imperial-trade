import { 
  Shield, 
  AlertTriangle, 
  FileText, 
  UserCheck, 
  Bell, 
  Scale, 
  Mail,
  TrendingUp,
  Lock
} from 'lucide-react';
import { LegalSection } from '@/components/legal/LegalSection';
import { ComplianceFooter } from '@/components/compliance/ComplianceFooter';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-surface to-muted border-b border-border">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <div className="text-center">
            <div className="inline-flex items-center gap-3 mb-4">
              <Scale className="w-8 h-8 text-accent-gold" />
              <h1 className="text-4xl font-bold text-foreground">Terms of Service</h1>
            </div>
            <p className="text-lg text-muted-foreground mb-2">
              Professional Trading Education Platform Agreement
            </p>
            <div className="inline-flex items-center gap-2 text-sm text-accent-gold bg-accent-gold/10 px-4 py-2 rounded-full">
              <FileText className="w-4 h-4" />
              <span>Effective Date: January 1, 2025</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        
        <LegalSection icon={FileText} title="1. Acceptance of Terms" variant="default">
          <p>
            By accessing and using Trade Imperial's educational trading platform, you accept and agree to be bound by the terms and provisions of this agreement. Trade Imperial is a sophisticated trading education platform designed for serious traders and investors.
          </p>
        </LegalSection>

        <LegalSection icon={Shield} title="2. Scope and Nature of Services" variant="info">
          <p className="mb-4">
            Trade Imperial provides professional trading education, market analysis, and educational content. Our platform includes:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Educational trading signals and market analysis</li>
            <li>Live trading sessions and educational webinars</li>
            <li>Trading courses, tutorials, and learning materials</li>
            <li>Community forums and educational discussions</li>
            <li>Portfolio tracking and journal tools for educational purposes</li>
          </ul>
        </LegalSection>

        <LegalSection icon={UserCheck} title="3. Account Eligibility and Access" variant="success">
          <p className="mb-4">
            To access our educational platform, you must:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Be at least 18 years of age or the age of majority in your jurisdiction</li>
            <li>Provide accurate, complete, and current information during registration</li>
            <li>Maintain the security and confidentiality of your account credentials</li>
            <li>Accept full responsibility for all activities under your account</li>
            <li>Comply with all applicable laws and regulations in your jurisdiction</li>
          </ul>
        </LegalSection>

        <LegalSection icon={AlertTriangle} title="4. Risk Disclosure and Educational Purpose" variant="warning">
          <div className="bg-accent-red/5 border border-accent-red/20 rounded-lg p-4 mb-4">
            <p className="font-semibold text-accent-red mb-2">⚠️ IMPORTANT RISK DISCLOSURE</p>
            <p className="text-sm">
              All content provided on Trade Imperial is for EDUCATIONAL PURPOSES ONLY and does not constitute financial, investment, or trading advice.
            </p>
          </div>
          <p className="mb-4">
            <strong>Trading and investing involves substantial risk of loss and is not suitable for all investors.</strong> You should carefully consider your financial situation and risk tolerance before engaging in any trading activities.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Past performance does not guarantee future results</li>
            <li>All trading involves substantial risk of loss</li>
            <li>You should never trade with money you cannot afford to lose</li>
            <li>Our educational content and analysis are not personalized investment advice</li>
            <li>You should consult with qualified financial professionals before making investment decisions</li>
          </ul>
        </LegalSection>

        <LegalSection icon={Bell} title="5. Push Notifications and Email Communications" variant="info">
          <p className="mb-4">
            Trade Imperial uses advanced notification systems to deliver timely educational content:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Push Notifications:</strong> Real-time educational alerts via OneSignal for market insights</li>
            <li><strong>Email Communications:</strong> Educational newsletters, course updates, and platform announcements</li>
            <li><strong>Opt-out:</strong> You can disable notifications at any time through your account settings</li>
            <li><strong>Data Security:</strong> All notification tokens are stored securely and used solely for educational purposes</li>
          </ul>
        </LegalSection>

        <LegalSection icon={TrendingUp} title="6. Intellectual Property and Content Usage" variant="default">
          <p className="mb-4">
            All content, including but not limited to educational materials, trading analysis, course content, and proprietary indicators, is the intellectual property of Trade Imperial. Under this license you may not:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Reproduce, distribute, or commercially exploit any platform content</li>
            <li>Reverse engineer any proprietary trading algorithms or indicators</li>
            <li>Share account credentials or provide unauthorized access to third parties</li>
            <li>Remove copyright, trademark, or other proprietary notices</li>
            <li>Use automated systems to scrape or download platform content</li>
          </ul>
        </LegalSection>

        <LegalSection icon={Lock} title="7. Privacy and Data Protection" variant="success">
          <p className="mb-4">
            Trade Imperial is committed to protecting your privacy and personal information:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>All data transmission is encrypted using industry-standard protocols</li>
            <li>Personal information is stored securely and never sold to third parties</li>
            <li>You retain full control over your personal data and account information</li>
            <li>Data processing complies with applicable privacy regulations</li>
          </ul>
        </LegalSection>

        <LegalSection icon={Scale} title="8. Limitation of Liability and Governing Law" variant="warning">
          <p className="mb-4">
            <strong>Disclaimer:</strong> The educational materials on Trade Imperial's platform are provided on an "as is" basis. Trade Imperial makes no warranties, expressed or implied, regarding the accuracy, completeness, or suitability of any educational content.
          </p>
          <p className="mb-4">
            <strong>Limitation of Liability:</strong> In no event shall Trade Imperial or its affiliates be liable for any trading losses, damages for loss of data or profit, or any consequential damages arising from the use of our educational platform.
          </p>
          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <p className="text-sm">
              <strong>CFTC Rule 4.41 Compliance:</strong> Hypothetical or simulated performance results have certain limitations and do not represent actual trading results.
            </p>
          </div>
        </LegalSection>

        <LegalSection icon={Mail} title="9. Contact Information" variant="info">
          <p className="mb-4">
            For questions about these Terms of Service or our educational platform, please contact our legal team:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-surface p-4 rounded-lg">
              <p className="font-semibold text-foreground mb-2">Legal Department</p>
              <p className="text-sm text-muted-foreground">
                <strong>Email:</strong> legal@tradeimperial.com<br />
                <strong>Response Time:</strong> 2-3 business days
              </p>
            </div>
            <div className="bg-surface p-4 rounded-lg">
              <p className="font-semibold text-foreground mb-2">General Support</p>
              <p className="text-sm text-muted-foreground">
                <strong>Email:</strong> support@tradeimperial.com<br />
                <strong>Response Time:</strong> 24-48 hours
              </p>
            </div>
          </div>
        </LegalSection>

      </div>
      
      <ComplianceFooter />
    </div>
  );
}