
import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { LayoutDashboard } from "lucide-react";
import ContentSection from "./ContentSection";
import { useAuth } from "@/contexts/AuthContext";

export default function FinalCTA() {
  const { user, loading } = useAuth();

  return (
    <section className="w-full bg-background py-16 sm:py-20 md:py-24 text-center z-10 relative overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        <ContentSection>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 drop-shadow-lg px-2">
            {user ? "Welcome Back to the " : "Ready to Join the "}
            <span className="gold-text-gradient">Elite?</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-white/90 mb-8 sm:mb-10 drop-shadow-md px-2 max-w-2xl mx-auto">
            {user 
              ? "Continue your trading journey and access your professional dashboard to track your progress and opportunities."
              : "Your journey to trading mastery and professional partnership begins now. Take the definitive step towards your financial ambitions."
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            {!loading && (
              user ? (
                <Link to="/dashboard/home">
                  <Button
                    size="lg"
                    className="bg-accent-green hover:bg-green-500 text-white font-semibold px-6 sm:px-10 py-3 sm:py-4 text-sm sm:text-base rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 drop-shadow-lg w-full sm:w-auto flex items-center gap-2"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <Link to={createPageUrl("account-request")}>
                  <Button
                    size="lg"
                    className="bg-accent-green hover:bg-green-500 text-white font-semibant px-6 sm:px-10 py-3 sm:py-4 text-sm sm:text-base rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 drop-shadow-lg w-full sm:w-auto"
                  >
                    Get Started
                  </Button>
                </Link>
              )
            )}
          </div>
        </ContentSection>
      </div>
    </section>
  );
}
