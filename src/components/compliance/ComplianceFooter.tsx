import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Shield, FileText } from "lucide-react";

export const ComplianceFooter: React.FC = () => {
  return (
    <div className="border-t border-default bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-6">
        {/* Risk Warning Banner */}
        <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-orange-700 dark:text-orange-400 mb-1">
                Educational Platform - High Risk Warning
              </p>
              <p className="text-orange-600 dark:text-orange-300 leading-relaxed">
                Trading involves substantial risk of loss. All content is for educational purposes only. 
                We are not registered investment advisers. Past performance does not guarantee future results.
              </p>
            </div>
          </div>
        </div>

        {/* Compliance Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <Link 
              to="/legal/disclaimers" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Risk Disclaimers
            </Link>
          </div>
          
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <Link 
              to="/legal/terms" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
          </div>
          
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <Link 
              to="/legal/privacy" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>

        {/* Copyright and Legal Notice */}
        <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
          <div className="flex flex-col items-center gap-2 text-center">
            <p>
              Not registered as a securities broker-dealer or investment adviser. 
              All information is for educational purposes only. CFTC Rule 4.41 applies.
            </p>
            <p>
              © 2025 Imperial Trading Platform. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};