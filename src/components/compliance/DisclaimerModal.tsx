import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, FileText } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DisclaimerModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
  title: string;
  type: "general" | "tools" | "ideas";
}

export const DisclaimerModal: React.FC<DisclaimerModalProps> = ({
  isOpen,
  onAccept,
  onDecline,
  title,
  type,
}) => {
  const [hasRead, setHasRead] = useState(false);
  const [hasUnderstood, setHasUnderstood] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);

  const canProceed = hasRead && hasUnderstood && hasAgreed;

  const getDisclaimerContent = () => {
    const commonDisclaimer = `
      Imperial Trading Platform provides educational and informational tools for analyzing financial markets. 
      We are not registered as a securities broker-dealer or an investment adviser. No information on this 
      site is intended as investment, tax, financial, or legal advice. All content is for illustrative and 
      educational purposes only.
    `;

    const riskWarning = `
      Trading foreign exchange, cryptocurrencies, and other financial instruments on margin carries a high 
      level of risk and may not be suitable for all investors. The high degree of leverage can work against 
      you as well as for you. Before deciding to trade, you should carefully consider your investment objectives, 
      level of experience, and risk appetite. The possibility exists that you could sustain a loss of some or 
      all of your initial investment and therefore you should not invest money that you cannot afford to lose.
    `;

    const hypotheticalPerformance = `
      All patterns, trade ideas, and performance results displayed on this platform are hypothetical. 
      Hypothetical performance results have many inherent limitations. No representation is being made that 
      any account will or is likely to achieve profits or losses similar to those shown. In fact, there are 
      frequently sharp differences between hypothetical performance results and the actual results subsequently 
      achieved by any particular trading program. Past performance is not indicative of future results.
    `;

    const aiToolsDisclaimer = `
      The AI-driven tools, including the Pattern Scanner and Strength Scores, are based on historical data 
      analysis and are not predictors of future market movements. They are provided as educational aids to 
      assist in your own analysis and should not be the sole basis for any trading decision. All trading 
      decisions are your own.
    `;

    switch (type) {
      case "tools":
        return `${commonDisclaimer}\n\n${riskWarning}\n\n${aiToolsDisclaimer}`;
      case "ideas":
        return `${commonDisclaimer}\n\n${hypotheticalPerformance}\n\n${aiToolsDisclaimer}`;
      default:
        return `${commonDisclaimer}\n\n${riskWarning}\n\n${hypotheticalPerformance}`;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-500">
            <AlertTriangle className="w-5 h-5" />
            {title}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-4">
            <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm leading-relaxed whitespace-pre-line">
                  {getDisclaimerContent()}
                </div>
              </div>
            </div>

            <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
              <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2">
                IMPORTANT: Educational Use Only
              </h4>
              <p className="text-sm text-red-600 dark:text-red-300">
                This platform is designed for educational purposes. You are responsible for conducting your own 
                analysis and making your own trading decisions. Always consult with a qualified financial advisor 
                before making any trading decisions.
              </p>
            </div>
          </div>
        </ScrollArea>

        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasRead"
              checked={hasRead}
              onCheckedChange={(checked) => setHasRead(checked === true)}
            />
            <label htmlFor="hasRead" className="text-sm">
              I have read and understand the disclaimers above
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasUnderstood"
              checked={hasUnderstood}
              onCheckedChange={(checked) => setHasUnderstood(checked === true)}
            />
            <label htmlFor="hasUnderstood" className="text-sm">
              I understand this is an educational tool, and all ideas are hypothetical
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasAgreed"
              checked={hasAgreed}
              onCheckedChange={(checked) => setHasAgreed(checked === true)}
            />
            <label htmlFor="hasAgreed" className="text-sm">
              I agree that all trading involves substantial risk of loss
            </label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onDecline}
          >
            I Do Not Agree
          </Button>
          <Button
            onClick={onAccept}
            disabled={!canProceed}
            className="bg-lime-500 hover:bg-lime-600 text-black"
          >
            I Understand & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};