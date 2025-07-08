
import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import ContentSection from "./ContentSection";

export default function FinalCTA() {
  return (
    <section className="w-full bg-background py-16 sm:py-20 md:py-24 text-center z-10 relative overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12">
        <ContentSection>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6 drop-shadow-lg px-2">
            Ready to Join the{" "}
            <span className="gold-text-gradient">Elite?</span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-white/90 mb-8 sm:mb-10 drop-shadow-md px-2 max-w-2xl mx-auto">
            Your journey to trading mastery and professional partnership
            begins now. Take the definitive step towards your financial
            ambitions.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link to={createPageUrl("account-request")}>
              <Button
                size="lg"
                className="bg-accent-green hover:bg-green-500 text-white font-semibold px-6 sm:px-10 py-3 sm:py-4 text-sm sm:text-base rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 drop-shadow-lg w-full sm:w-auto"
              >
                Become a Member
              </Button>
            </Link>
          </div>
        </ContentSection>
      </div>
    </section>
  );
}
