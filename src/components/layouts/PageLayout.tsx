import React from "react";
import { Link } from "react-router-dom";
import { ComplianceFooter } from "@/components/compliance/ComplianceFooter";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1">
        {children}
      </main>
      <ComplianceFooter />
    </div>
  );
}