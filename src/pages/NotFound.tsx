
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Crown, Home, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import LandingLayout from "./layouts/LandingLayout";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  const popularPages = [
    { name: "Home", path: "/", icon: Home },
    { name: "About", path: "/about", icon: Search },
    { name: "Features", path: "/features", icon: Search },
    { name: "IB Partnership", path: "/partnership", icon: Search },
  ];

  return (
    <LandingLayout>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-background/95 px-6">
        <div className="max-w-2xl w-full text-center animate-fade-in-up">
          {/* Brand Header */}
          <div className="flex items-center justify-center mb-8">
            <div className="w-16 h-16 bg-surface/90 rounded-2xl flex items-center justify-center glow-effect-gold backdrop-blur-md shadow-2xl">
              <Crown className="w-10 h-10 text-accent-gold" />
            </div>
          </div>

          {/* Error Message */}
          <div className="mb-8">
            <h1 className="text-8xl font-bold bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent mb-4">
              404
            </h1>
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Page Not Found
            </h2>
            <p className="text-xl text-muted-foreground mb-2">
              Oops! The page you're looking for doesn't exist.
            </p>
            <p className="text-sm text-muted-foreground">
              Route: <code className="bg-muted px-2 py-1 rounded text-xs">{location.pathname}</code>
            </p>
          </div>

          {/* Navigation Options */}
          <div className="space-y-6">
            {/* Primary Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Home className="w-5 h-5 mr-2" />
                  Back to Home
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => window.history.back()}
                className="border-white/20 text-white/80 hover:bg-white/10"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Go Back
              </Button>
            </div>

            {/* Popular Pages */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Popular Pages
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {popularPages.map((page) => (
                  <Link key={page.path} to={page.path}>
                    <Button
                      variant="ghost"
                      className="h-auto p-4 flex flex-col items-center gap-2 hover:bg-white/5 border border-white/10"
                    >
                      <page.icon className="w-5 h-5 text-accent-gold" />
                      <span className="text-sm text-white/80">{page.name}</span>
                    </Button>
                  </Link>
                ))}
              </div>
            </div>

            {/* Help Text */}
            <div className="mt-8 p-4 bg-surface/50 rounded-lg border border-white/10">
              <p className="text-sm text-muted-foreground">
                If you believe this is an error, please contact support or try refreshing the page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </LandingLayout>
  );
};

export default NotFound;
