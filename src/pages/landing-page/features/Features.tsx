export default function Features() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-background/95">
      <h1 className="text-4xl font-bold text-primary mb-6">Features</h1>
      <p className="text-secondary text-lg mb-4">
        Explore the powerful features of Imperial Trade.
      </p>
      <div className="max-w-2xl w-full p-6 bg-white rounded-lg shadow-md">
        <ul className="list-disc list-inside space-y-2">
          <li>Advanced Trading Tools</li>
          <li>Real-time Market Data</li>
          <li>AI-Powered Insights</li>
          <li>Customizable Dashboards</li>
          <li>Secure and Scalable Architecture</li>
        </ul>
      </div>
    </div>
  );
}
