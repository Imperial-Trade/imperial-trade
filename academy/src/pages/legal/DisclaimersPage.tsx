import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Shield, FileText, Scale } from "lucide-react";
import { ComplianceFooter } from "@/components/compliance/ComplianceFooter";

export default function DisclaimersPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Scale className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold">Legal Disclaimers</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Important legal information about our educational platform
          </p>
        </div>

        <div className="space-y-8">
          {/* General Disclaimer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                General Disclaimer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="leading-relaxed">
                Imperial Trading Platform provides educational and informational tools for analyzing financial markets. 
                We are not registered as a securities broker-dealer or an investment adviser under the Investment 
                Advisers Act of 1940 or any other applicable securities laws. No information on this site is intended 
                as investment, tax, financial, or legal advice. All content is for illustrative and educational 
                purposes only.
              </p>
              <p className="leading-relaxed">
                The information provided on this platform should not be construed as a recommendation to buy, sell, 
                or hold any particular security or investment. You should not rely solely on the information provided 
                to make investment decisions. Always conduct your own research and consult with qualified financial 
                professionals before making any investment decisions.
              </p>
            </CardContent>
          </Card>

          {/* High-Risk Investment Warning */}
          <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <AlertTriangle className="w-5 h-5" />
                High-Risk Investment Warning
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="leading-relaxed">
                Trading foreign exchange, cryptocurrencies, and other financial instruments on margin carries a high 
                level of risk and may not be suitable for all investors. The high degree of leverage can work against 
                you as well as for you. Before deciding to trade, you should carefully consider your investment 
                objectives, level of experience, and risk appetite.
              </p>
              <p className="leading-relaxed">
                The possibility exists that you could sustain a loss of some or all of your initial investment and 
                therefore you should not invest money that you cannot afford to lose. You should be aware of all the 
                risks associated with trading and seek advice from an independent financial advisor if you have any doubts.
              </p>
            </CardContent>
          </Card>

          {/* Hypothetical Performance Disclaimer */}
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <Shield className="w-5 h-5" />
                Hypothetical Performance Disclaimer (CFTC Rule 4.41)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="leading-relaxed">
                All patterns, trade ideas, and performance results displayed on this platform are hypothetical. 
                Hypothetical performance results have many inherent limitations, some of which are described below. 
                No representation is being made that any account will or is likely to achieve profits or losses 
                similar to those shown.
              </p>
              <p className="leading-relaxed">
                In fact, there are frequently sharp differences between hypothetical performance results and the 
                actual results subsequently achieved by any particular trading program. One of the limitations of 
                hypothetical performance results is that they are generally prepared with the benefit of hindsight.
              </p>
              <p className="leading-relaxed">
                In addition, hypothetical trading does not involve financial risk, and no hypothetical trading 
                record can completely account for the impact of financial risk in actual trading. For example, 
                the ability to withstand losses or to adhere to a particular trading program in spite of trading 
                losses are material points which can also adversely affect actual trading results.
              </p>
              <p className="font-semibold text-red-600 dark:text-red-400">
                Past performance is not indicative of future results.
              </p>
            </CardContent>
          </Card>

          {/* AI Tools Disclaimer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                AI Tools Disclaimer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="leading-relaxed">
                The AI-driven tools on our platform, including the Pattern Scanner and Pattern Strength Scores, 
                are based on historical data analysis and technical pattern recognition. These tools are not 
                predictors of future market movements and should not be relied upon as such.
              </p>
              <p className="leading-relaxed">
                Pattern Strength Scores represent a hypothetical measure of how strongly current technical factors 
                align with historical patterns. These scores are NOT predictions of future success and are provided 
                for educational purposes only to help users understand technical analysis concepts.
              </p>
              <p className="leading-relaxed">
                All AI-generated analysis should be used as educational aids to assist in your own analysis and 
                should not be the sole basis for any trading decision. All trading decisions are ultimately your 
                own responsibility.
              </p>
            </CardContent>
          </Card>

          {/* No Financial Advice */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Not Financial Advice
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="leading-relaxed">
                Nothing on this platform constitutes financial advice, investment advice, trading advice, or any 
                other sort of advice. You should not treat any of the platform's content as such. Imperial Trading 
                Platform does not recommend that any particular security or investment strategy is suitable for 
                any specific person.
              </p>
              <p className="leading-relaxed">
                You understand that you are using any and all information available on or through this platform 
                at your own risk. You should consult with a professional financial advisor where appropriate.
              </p>
            </CardContent>
          </Card>

          {/* Regulatory Notice */}
          <Card className="border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <Scale className="w-5 h-5" />
                Regulatory Notice
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="leading-relaxed">
                Imperial Trading Platform operates as an educational technology company. We are not licensed or 
                regulated as a financial services provider in any jurisdiction. Our platform provides educational 
                tools and resources designed to help users learn about financial markets and develop analytical skills.
              </p>
              <p className="leading-relaxed">
                Users are responsible for understanding and complying with all applicable laws and regulations 
                in their jurisdiction regarding trading and investment activities. We recommend consulting with 
                qualified legal and financial professionals regarding your specific situation.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Contact Information */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            Questions about these disclaimers? Contact our legal team at legal@tradeimperial.com
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>

      <ComplianceFooter />
    </div>
  );
}