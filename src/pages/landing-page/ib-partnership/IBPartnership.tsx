import React from "react";
import { motion } from "framer-motion";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Crown,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Award,
  CheckCircle,
  Star,
  Zap,
} from "lucide-react";

const IBPartnership = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-surface">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-amber-300/5" />
        <div className="container mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="flex items-center justify-center mb-6">
              <Crown className="h-12 w-12 text-primary mr-4" />
              <h1 className="text-5xl imperial-tech-font font-bold white-gold-gradient">
                IMPERIAL IB PARTNERSHIP
              </h1>
            </div>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Join the elite ranks of Imperial Trading Partners. Unlock premium
              commissions, exclusive resources, and build your trading empire
              with our industry-leading IB program.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-white px-8 py-4 text-lg"
              >
                <Crown className="mr-2 h-5 w-5" />
                Become an IB Partner
              </Button>
              <Button variant="outline" size="lg" className="px-8 py-4 text-lg">
                Learn More
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Commission Tiers */}
      <section className="py-20 bg-surface/30">
        <div className="container mx-auto px-6">
          <ScrollReveal>
            <h2 className="text-4xl font-bold text-center mb-16">
              <span className="white-gold-gradient">
                Commission Tiers
              </span>
            </h2>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                tier: "Bronze Partner",
                commission: "30%",
                requirements: "5+ Active Clients",
                color: "from-orange-400 to-orange-600",
                features: [
                  "Monthly Payouts",
                  "Basic Marketing Materials",
                  "Email Support",
                ],
              },
              {
                tier: "Silver Partner",
                commission: "45%",
                requirements: "25+ Active Clients",
                color: "from-gray-400 to-gray-600",
                features: [
                  "Bi-weekly Payouts",
                  "Premium Marketing Suite",
                  "Priority Support",
                  "Custom Landing Pages",
                ],
              },
              {
                tier: "Gold Partner",
                commission: "60%",
                requirements: "50+ Active Clients",
                color: "from-amber-400 to-amber-600",
                features: [
                  "Weekly Payouts",
                  "Full Marketing Arsenal",
                  "Dedicated Account Manager",
                  "White-label Solutions",
                  "Exclusive Events",
                ],
              },
            ].map((tier, index) => (
              <ScrollReveal key={index} delay={index * 200}>
                <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 transform hover:-translate-y-2 white-gold-bg">
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${tier.color}`}
                  />
                  <CardHeader className="text-center pb-4">
                    <div
                      className={`w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r ${tier.color} flex items-center justify-center`}
                    >
                      <Award className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold">
                      {tier.tier}
                    </CardTitle>
                    <div className="text-4xl font-black text-primary mt-2">
                      {tier.commission}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {tier.requirements}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {tier.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center">
                          <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <ScrollReveal>
            <h2 className="text-4xl font-bold text-center mb-16">
              Why Choose <span className="text-primary">Imperial</span>?
            </h2>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: TrendingUp,
                title: "High Commissions",
                description: "Industry-leading commission rates up to 60%",
              },
              {
                icon: Zap,
                title: "Fast Payouts",
                description: "Weekly payouts for top-tier partners",
              },
              {
                icon: Users,
                title: "Dedicated Support",
                description: "Personal account managers for Gold partners",
              },
              {
                icon: Target,
                title: "Marketing Tools",
                description: "Professional marketing materials and resources",
              },
            ].map((benefit, index) => (
              <ScrollReveal key={index} delay={index * 100}>
                <Card className="text-center p-6 hover:shadow-lg transition-all duration-300">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-primary to-amber-300 rounded-full flex items-center justify-center">
                    <benefit.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default IBPartnership;
