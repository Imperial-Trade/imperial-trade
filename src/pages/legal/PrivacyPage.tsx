import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Eye, Users, Lock, AlertTriangle, FileText } from "lucide-react";
import Layout from "@/components/layouts/PageLayout";

const PrivacyPage: React.FC = () => {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Privacy Policy
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We are committed to protecting your privacy and ensuring transparency in how we collect, use, and protect your information.
            </p>
          </div>

          {/* Privacy Content */}
          <div className="space-y-8">
            {/* Information We Collect */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-600">
                  <Eye className="w-5 h-5" />
                  Information We Collect
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>
                      <strong>Account details:</strong> name, email address, and profile information when you create an account or interact with our services (managed via Supabase Auth).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>
                      <strong>Usage and device data:</strong> log data, pages viewed, approximate location, and device/browser characteristics collected to secure and improve our services.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>
                      <strong>Cookies and similar technologies:</strong> used for authentication, preferences, analytics, and notifications. You can control cookies via your browser settings.
                    </span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* How We Use Your Information */}
            <Card className="border-l-4 border-l-green-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <Users className="w-5 h-5" />
                  How We Use Your Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    Provide, maintain, and secure the Imperial platform and user accounts.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    Deliver educational content, trading tools, and real-time notifications.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    Communicate service updates, transactional messages, and, with consent, marketing.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    Comply with legal obligations and enforce our Terms of Use.
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Push Notifications via OneSignal */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Push Notifications via OneSignal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  We use OneSignal to provide optional push notifications for alerts and updates. If you opt in, OneSignal may receive device identifiers, IP address, and usage data necessary to deliver notifications. You can opt out at any time in your browser or device settings or via in-app controls. For details on OneSignal's data practices, see their{" "}
                  <a 
                    href="https://onesignal.com/privacy_policy" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Privacy Policy
                  </a>.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  If you provide an email address for notifications, we may share it with OneSignal solely to facilitate notification delivery where applicable. OneSignal's policies govern their processing of such data.
                </p>
              </CardContent>
            </Card>

            {/* Email Communications via OneSignal */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Email Communications via OneSignal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  We send transactional and, with consent, marketing emails using OneSignal as our email service provider. When we send you email, your email address and message content are processed by OneSignal to deliver those communications. See OneSignal's{" "}
                  <a 
                    href="https://onesignal.com/privacy_policy" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Privacy Policy
                  </a>.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  You can opt out of marketing emails at any time by clicking the unsubscribe link included in every message. Transactional emails (e.g., security, account notices) are necessary for service delivery and cannot usually be disabled.
                </p>
              </CardContent>
            </Card>

            {/* Your Rights & Choices */}
            <Card className="border-l-4 border-l-purple-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-600">
                  <Users className="w-5 h-5" />
                  Your Rights & Choices
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    Access, update, or delete your information by contacting us or using in-app settings where available.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    Opt in/out of push notifications via your device or browser settings and within your Imperial account.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    Opt out of marketing emails via the unsubscribe link at the bottom of each email.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    Control cookies through your browser; disabling some cookies may affect functionality.
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Data Sharing & Security */}
            <Card className="border-l-4 border-l-red-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <Lock className="w-5 h-5" />
                  Data Sharing & Security
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  We do not sell personal data. We share information with service providers solely to operate our platform (e.g., Supabase for authentication and database, OneSignal for notifications and email). We implement appropriate safeguards to protect your data.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  We retain data only as long as needed for the purposes described above or as required by law. When no longer needed, information is deleted or anonymized.
                </p>
              </CardContent>
            </Card>

            {/* Children's Privacy */}
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <Shield className="w-5 h-5" />
                  Children's Privacy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Our services are not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided personal information, please contact us so we can take appropriate action.
                </p>
              </CardContent>
            </Card>

          </div>

        </div>
      </div>
    </Layout>
  );
};

export default PrivacyPage;