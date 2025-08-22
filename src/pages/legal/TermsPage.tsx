import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Shield, AlertTriangle, Scale } from "lucide-react";
import Layout from "@/components/layouts/PageLayout";

const TermsPage: React.FC = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Terms of Service
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Please read these terms carefully. By using our services, you agree to be bound by these terms and conditions.
            </p>
          </div>

          {/* Terms Content */}
          <div className="space-y-8">
            {/* Scope & Nature of Services */}
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="w-5 h-5" />
                  Scope & Nature of Our Services
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  Imperial provides educational content, tools, and community features related to trading and markets. We do not provide personalized investment advice or brokerage services. Any information is for educational purposes only and should not be construed as a recommendation to buy or sell securities or other financial instruments.
                </p>
              </CardContent>
            </Card>

            {/* Accounts & Eligibility */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-600">
                  <Shield className="w-5 h-5" />
                  Accounts & Eligibility
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    You must provide accurate information and keep your account secure.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    You are responsible for all activity that occurs under your account.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    You must be at least 18 years old or the age of majority in your jurisdiction.
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Email Communication Consent */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Email Communication Consent
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  By using our services and providing your email address, you consent to receive communications from us as described in our Privacy Policy, including transactional messages and, where you have opted in, marketing emails. Email delivery is provided by OneSignal. You can opt out of marketing emails at any time via the unsubscribe link included in every email.
                </p>
              </CardContent>
            </Card>

            {/* Push Notifications & OneSignal */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Push Notifications & OneSignal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  We offer optional push notifications delivered by OneSignal. Opt-in is required, and you may opt out at any time via device/browser settings or in-app controls. See our Privacy Policy for details about data sharing with OneSignal.
                </p>
              </CardContent>
            </Card>

            {/* User Conduct & Intellectual Property */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-600">
                  <Scale className="w-5 h-5" />
                  User Conduct & Intellectual Property
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    Do not misuse the services or interfere with their operation.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    All Imperial brands, logos, and content are protected and may not be used without permission.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    You may not copy, distribute, or create derivative works without authorization.
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Disclaimers & Limitation of Liability */}
            <Card className="border-l-4 border-l-red-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="w-5 h-5" />
                  Disclaimers & Limitation of Liability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  The services are provided "as is" without warranties of any kind. We do not warrant that the services will be uninterrupted or error-free. To the maximum extent permitted by law, Imperial is not liable for any indirect, incidental, special, consequential, or punitive damages, or for any loss of profits or revenues, whether incurred directly or indirectly.
                </p>
              </CardContent>
            </Card>

            {/* Governing Law & Dispute Resolution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="w-5 h-5" />
                  Governing Law & Dispute Resolution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  These Terms are governed by the laws of the State of Nevada, USA, without regard to conflict of laws principles. Any disputes will be resolved in the state or federal courts located in Nevada, and you consent to the jurisdiction and venue of such courts.
                </p>
              </CardContent>
            </Card>

            {/* Changes to These Terms */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Changes to These Terms
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  We may update these Terms from time to time. If we make material changes, we will provide notice as appropriate. Your continued use of the services after changes take effect constitutes acceptance of the revised Terms.
                </p>
              </CardContent>
            </Card>

            {/* Risk Warning Banner */}
            <Card className="bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
                  <AlertTriangle className="w-5 h-5" />
                  Educational Platform - High Risk Warning
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-orange-700 dark:text-orange-300 font-medium">
                  Trading involves substantial risk of loss. All content is for educational purposes only. We are not registered investment advisers. Past performance does not guarantee future results.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center text-sm text-muted-foreground space-y-2">
            <p className="font-medium">Effective date: August 21, 2025</p>
            <p>
              Not registered as a securities broker-dealer or investment adviser. All information is for educational purposes only. CFTC Rule 4.41 applies.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              <Link 
                to="/legal/disclaimers" 
                className="text-primary hover:underline font-medium"
              >
                Risk Disclaimers
              </Link>
              <Link 
                to="/legal/terms" 
                className="text-primary hover:underline font-medium"
              >
                Terms of Service
              </Link>
              <Link 
                to="/legal/privacy" 
                className="text-primary hover:underline font-medium"
              >
                Privacy Policy
              </Link>
            </div>
            <p className="text-xs mt-4">
              © 2025 Imperial Trading Platform. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TermsPage;