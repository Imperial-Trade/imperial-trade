export default function PrivacyPage() {
  return (
    <>
      
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <h1 className="text-4xl font-bold text-foreground mb-8">Privacy Policy</h1>
          
          <div className="prose prose-lg max-w-none text-muted-foreground">
            <p className="text-lg mb-6">
              <strong>Effective Date:</strong> January 1, 2025
            </p>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Information We Collect</h2>
              <p className="mb-4">
                Trade Imperial collects information to provide better services to our users. We collect information in the following ways:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Account information (name, email, phone number)</li>
                <li>Trading preferences and settings</li>
                <li>Usage data and analytics</li>
                <li>Device and browser information</li>
                <li>Push notification tokens (with your consent)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. How We Use Your Information</h2>
              <p className="mb-4">We use the information we collect to:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Provide and maintain our trading platform</li>
                <li>Send trading alerts and notifications</li>
                <li>Improve our services and user experience</li>
                <li>Communicate with you about updates and features</li>
                <li>Ensure platform security and fraud prevention</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. Push Notifications</h2>
              <p className="mb-4">
                We use OneSignal to deliver push notifications for trading alerts. Your push notification token is stored securely and used only to send you relevant trading information. You can disable notifications at any time through your device settings or our platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Data Security</h2>
              <p className="mb-4">
                We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. All data is encrypted in transit and at rest.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Your Rights</h2>
              <p className="mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Delete your account and data</li>
                <li>Opt-out of communications</li>
                <li>Data portability</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Contact Us</h2>
              <p className="mb-4">
                If you have any questions about this Privacy Policy, please contact us at:
              </p>
              <p className="mb-2">
                <strong>Email:</strong> privacy@tradeimperial.com
              </p>
              <p className="mb-2">
                <strong>Address:</strong> Trade Imperial Privacy Team, [Your Address]
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}