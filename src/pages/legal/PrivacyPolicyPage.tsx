import React, { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Bell, Mail, Cookie, Database, Link as LinkIcon } from "lucide-react";
import { ComplianceFooter } from "@/components/compliance/ComplianceFooter";

export default function PrivacyPolicyPage() {
  useEffect(() => {
    const title = "Imperial Privacy Policy | Push & Email Disclosures";
    document.title = title;

    const desc =
      "Imperial Privacy Policy covering data collection, OneSignal push/email, and your choices.";
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
    canonical.setAttribute("href", `${window.location.origin}/legal/privacy`);

    // JSON-LD structured data
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: title,
      url: `${window.location.origin}/legal/privacy`,
      description: desc,
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${window.location.origin}/` },
          { "@type": "ListItem", position: 2, name: "Privacy Policy", item: `${window.location.origin}/legal/privacy` },
        ],
      },
    });
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const lastUpdated = new Date().toLocaleDateString();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Imperial Brand Privacy Statement
          </h1>
          <p className="mt-3 text-muted-foreground max-w-3xl">
            We respect your privacy and are committed to protecting it. This policy explains what
            information we collect, how we use it, and the choices available to you. It applies to
            the Imperial web application and related services.
          </p>
        </header>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Information We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Account details: name, email address, and profile information when you create an
                  account or interact with our services (managed via Supabase Auth).
                </li>
                <li>
                  Usage and device data: log data, pages viewed, approximate location, and device/browser
                  characteristics collected to secure and improve our services.
                </li>
                <li>
                  Cookies and similar technologies: used for authentication, preferences, analytics,
                  and notifications. You can control cookies via your browser settings.
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                How We Use Your Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ul className="list-disc pl-5 space-y-2">
                <li>Provide, maintain, and secure the Imperial platform and user accounts.</li>
                <li>Deliver educational content, trading tools, and real-time notifications.</li>
                <li>Communicate service updates, transactional messages, and, with consent, marketing.</li>
                <li>Comply with legal obligations and enforce our Terms of Use.</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Push Notifications via OneSignal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                We use OneSignal to provide optional push notifications for alerts and updates. If you
                opt in, OneSignal may receive device identifiers, IP address, and usage data necessary
                to deliver notifications. You can opt out at any time in your browser or device settings
                or via in-app controls. For details on OneSignal's data practices, see their
                <a className="underline ml-1" href="https://onesignal.com/privacy_policy" target="_blank" rel="noreferrer">Privacy Policy</a>.
              </p>
              <p>
                If you provide an email address for notifications, we may share it with OneSignal solely
                to facilitate notification delivery where applicable. OneSignal's policies govern their
                processing of such data.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email Communications via OneSignal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                We send transactional and, with consent, marketing emails using OneSignal as our email service
                provider. When we send you email, your email address and message content are processed by
                OneSignal to deliver those communications. See OneSignal's
                <a className="underline ml-1" href="https://onesignal.com/privacy_policy" target="_blank" rel="noreferrer">Privacy Policy</a>.
              </p>
              <p>
                You can opt out of marketing emails at any time by clicking the unsubscribe link included
                in every message. Transactional emails (e.g., security, account notices) are necessary for
                service delivery and cannot usually be disabled.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cookie className="w-5 h-5" />
                Your Rights & Choices
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  Access, update, or delete your information by contacting us or using in-app settings
                  where available.
                </li>
                <li>
                  Opt in/out of push notifications via your device or browser settings and within your
                  Imperial account.
                </li>
                <li>
                  Opt out of marketing emails via the unsubscribe link at the bottom of each email.
                </li>
                <li>
                  Control cookies through your browser; disabling some cookies may affect functionality.
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5" />
                Data Sharing & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                We do not sell personal data. We share information with service providers solely to operate
                our platform (e.g., Supabase for authentication and database, OneSignal for notifications and email). We implement appropriate safeguards to protect your data.
              </p>
              <p>
                We retain data only as long as needed for the purposes described above or as required by
                law. When no longer needed, information is deleted or anonymized.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Children's Privacy</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Our services are not directed to children under 13. We do not knowingly collect personal
              information from children under 13. If you believe a child has provided personal information,
              please contact us so we can take appropriate action.
            </CardContent>
          </Card>

          <div className="text-xs text-muted-foreground">
            Last updated: {lastUpdated}
          </div>
        </div>
      </div>

      <ComplianceFooter />
    </div>
  );
}
