import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Scale, Shield, UserCheck, Bell, Mail } from "lucide-react";
import { ComplianceFooter } from "@/components/compliance/ComplianceFooter";

export default function TermsOfUsePage() {
  useEffect(() => {
    const title = "Imperial Terms of Use | Service Rules & Rights";
    document.title = title;

    const desc = "Imperial Terms of Use covering acceptable use, IP, disclaimers, and governing law.";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", desc);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", `${window.location.origin}/legal/terms`);

    // JSON-LD structured data
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      url: `${window.location.origin}/legal/terms`,
      description: desc,
    });
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const effectiveDate = new Date().toLocaleDateString();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Imperial Terms of Use
          </h1>
          <p className="mt-3 text-muted-foreground max-w-3xl">
            These Terms govern your access to and use of the Imperial web application and services.
            By accessing or using the platform, you agree to these Terms.
          </p>
        </header>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Scope & Nature of Our Services
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                Imperial provides educational content, tools, and community features related to trading
                and markets. We do not provide personalized investment advice or brokerage services.
                Any information is for educational purposes only and should not be construed as a
                recommendation to buy or sell securities or other financial instruments.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                Accounts & Eligibility
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <ul className="list-disc pl-5 space-y-2">
                <li>You must provide accurate information and keep your account secure.</li>
                <li>You are responsible for all activity that occurs under your account.</li>
                <li>You must be at least 18 years old or the age of majority in your jurisdiction.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email Communication Consent
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                By using our services and providing your email address, you consent to receive
                communications from us as described in our Privacy Policy, including transactional
                messages and, where you have opted in, marketing emails. You can opt out of marketing
                emails at any time via the unsubscribe link included in every email.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Push Notifications & OneSignal
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                We offer optional push notifications delivered by OneSignal. Opt-in is required, and you
                may opt out at any time via device/browser settings or in-app controls. See our Privacy
                Policy for details about data sharing with OneSignal.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="w-5 h-5" />
                User Conduct & Intellectual Property
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <ul className="list-disc pl-5 space-y-2">
                <li>Do not misuse the services or interfere with their operation.</li>
                <li>All Imperial brands, logos, and content are protected and may not be used without permission.</li>
                <li>You may not copy, distribute, or create derivative works without authorization.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Disclaimers & Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                The services are provided "as is" without warranties of any kind. We do not warrant that
                the services will be uninterrupted or error-free. To the maximum extent permitted by law,
                Imperial is not liable for any indirect, incidental, special, consequential, or punitive
                damages, or for any loss of profits or revenues, whether incurred directly or indirectly.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Governing Law & Dispute Resolution</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>
                These Terms are governed by the laws of the State of Nevada, USA, without regard to
                conflict of laws principles. Any disputes will be resolved in the state or federal courts
                located in Nevada, and you consent to the jurisdiction and venue of such courts.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Changes to These Terms</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              We may update these Terms from time to time. If we make material changes, we will provide
              notice as appropriate. Your continued use of the services after changes take effect
              constitutes acceptance of the revised Terms.
            </CardContent>
          </Card>

          <div className="text-xs text-muted-foreground">Effective date: {effectiveDate}</div>
        </div>
      </div>

      <ComplianceFooter />
    </div>
  );
}
