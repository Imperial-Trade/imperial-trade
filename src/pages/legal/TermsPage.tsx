export default function TermsPage() {
  return (
    <>
      
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <h1 className="text-4xl font-bold text-foreground mb-8">Terms of Service</h1>
          
          <div className="prose prose-lg max-w-none text-muted-foreground">
            <p className="text-lg mb-6">
              <strong>Effective Date:</strong> January 1, 2025
            </p>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
              <p className="mb-4">
                By accessing and using Trade Imperial's platform, you accept and agree to be bound by the terms and provision of this agreement.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Use License</h2>
              <p className="mb-4">
                Permission is granted to temporarily access Trade Imperial's platform for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Modify or copy the materials</li>
                <li>Use the materials for commercial purposes or public display</li>
                <li>Attempt to reverse engineer any software</li>
                <li>Remove any copyright or proprietary notations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. Trading Alerts and Notifications</h2>
              <p className="mb-4">
                Our platform provides trading alerts and educational content. Please note:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>All trading involves substantial risk of loss</li>
                <li>Past performance does not guarantee future results</li>
                <li>You should not trade with money you cannot afford to lose</li>
                <li>Our alerts are for educational purposes and not financial advice</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. User Accounts</h2>
              <p className="mb-4">
                When you create an account with us, you must provide information that is accurate, complete, and current at all times. You are responsible for safeguarding your account and all activities that occur under your account.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Disclaimer</h2>
              <p className="mb-4">
                The materials on Trade Imperial's platform are provided on an 'as is' basis. Trade Imperial makes no warranties, expressed or implied, and hereby disclaim and negate all other warranties including without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Limitations</h2>
              <p className="mb-4">
                In no event shall Trade Imperial or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Trade Imperial's platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Contact Information</h2>
              <p className="mb-4">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <p className="mb-2">
                <strong>Email:</strong> legal@tradeimperial.com
              </p>
              <p className="mb-2">
                <strong>Address:</strong> Trade Imperial Legal Team, [Your Address]
              </p>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}