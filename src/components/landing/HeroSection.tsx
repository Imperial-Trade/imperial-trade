
import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp } from "lucide-react";
import ContentSection from "./ContentSection";
import { useAuth } from "@/contexts/AuthContext";

export default function HeroSection() {
  const { user, loading } = useAuth();

  return (
    <section className="relative min-h-screen flex items-center justify-center text-center z-10 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        <ContentSection>
          <div className="mb-6 sm:mb-8">
            <div className="inline-flex items-center px-3 sm:px-4 py-2 rounded-full bg-accent-green/20 border border-accent-green/30 text-accent-green text-xs sm:text-sm font-medium mb-4 sm:mb-6">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
              Elite Trading Community
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-4 sm:mb-6 drop-shadow-lg px-2">
            Master the Markets with{" "}
            <span className="imperial-tech-font">Imperial Trading</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/90 mb-8 sm:mb-10 drop-shadow-md px-2 max-w-4xl mx-auto">
            Join an exclusive community of professional traders. Access premium tools, live sessions, and expert guidance to accelerate your trading journey.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12">
            {!loading && (
              user ? (
                <Link to="/dashboard/home">
                  <Button
                    size="lg"
                    className="bg-accent-green hover:bg-green-500 text-white font-semibold px-6 sm:px-10 py-3 sm:py-4 text-sm sm:text-base rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 drop-shadow-lg w-full sm:w-auto"
                  >
                    Access Dashboard
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              ) : (
                <Link to={createPageUrl("account-request")}>
                  <Button
                    size="lg"
                    className="bg-accent-green hover:bg-green-500 text-white font-semibold px-6 sm:px-10 py-3 sm:py-4 text-sm sm:text-base rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 drop-shadow-lg w-full sm:w-auto"
                  >
                    Get Started
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              )
            )}

            <Link to={createPageUrl("account-request-status")}>
              <Button
                variant="outline"
                size="lg"
                className="border-white/30 text-white hover:bg-white/10 font-semibold px-6 sm:px-10 py-3 sm:py-4 text-sm sm:text-base rounded-lg sm:rounded-xl transition-all duration-300 backdrop-blur-sm w-full sm:w-auto"
              >
                Check Request Status
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-center max-w-2xl mx-auto">
            <div className="bg-white/10 backdrop-blur-md rounded-lg sm:rounded-xl p-4 sm:p-6 border border-white/20">
              <div className="text-xl sm:text-2xl font-bold text-accent-green mb-1 sm:mb-2">
                500+
              </div>
              <div className="text-xs sm:text-sm text-white/80">Active Traders</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-lg sm:rounded-xl p-4 sm:p-6 border border-white/20">
              <div className="text-xl sm:text-2xl font-bold text-accent-green mb-1 sm:mb-2">
                85%
              </div>
              <div className="text-xs sm:text-sm text-white/80">Success Rate</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-lg sm:rounded-xl p-4 sm:p-6 border border-white/20">
              <div className="text-xl sm:text-2xl font-bold text-accent-green mb-1 sm:mb-2">
                24/7
              </div>
              <div className="text-xs sm:text-sm text-white/80">Market Analysis</div>
            </div>
          </div>
        </ContentSection>
      </div>
    </section>
  );
}
