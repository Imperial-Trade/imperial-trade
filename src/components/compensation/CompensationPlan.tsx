
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Calculator, 
  Award, 
  Star,
  Crown,
  Shield,
  Target,
  Users,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Download,
  Sparkles
} from "lucide-react";

const rankData = [
  { 
    name: 'Hero', 
    volume: 0, 
    rebate: 6, 
    color: 'var(--text-secondary)', 
    icon: Star,
    perks: 'Standard rebate structure. Access to marketing materials and support.' 
  },
  { 
    name: 'Expert', 
    volume: 10000, 
    rebate: 9, 
    color: '#3b82f6', // blue-500
    icon: Award,
    perks: 'Increased rebates. Priority support from our partnership team.' 
  },
  { 
    name: 'Specialist', 
    volume: 20000, 
    rebate: 12, 
    color: '#14b8a6', // teal-500
    icon: Shield,
    perks: 'Higher rebate tier. Eligibility for a $200 Bonus.' 
  },
  { 
    name: 'Ambassador', 
    volume: 50000, 
    rebate: 15, 
    color: '#8b5cf6', // violet-500
    icon: Users,
    perks: 'Qualifies for exclusive Luxury Asia Asia Retreats after reaching this rank twice. Significant rebate increase.' 
  },
  { 
    name: 'Royal Ambassador', 
    volume: 70000, 
    rebate: 18, 
    color: '#ec4899', // pink-500
    icon: Target,
    perks: 'Eligible for the 7-Day Luxury Cruise. Receives top-tier support and event invitations.' 
  },
  { 
    name: 'Imperial', 
    volume: 100000, 
    rebate: 20, 
    color: 'var(--accent-gold)', 
    icon: Crown,
    perks: 'Highest possible rebate of $20/lot. Awarded the exclusive Imperial Gold Necklace. Receives bespoke support and VIP access to all company events.' 
  }
];

const testimonials = [
  { 
    name: 'Ramon Lamela', 
    rank: 'Ambassador', 
    quote: 'The support and rebate structure at VT Markets helped me double my business in just 6 months. The Asia retreat was an unforgettable experience!' 
  },
  { 
    name: 'Christine Mendoza', 
    rank: 'Imperial', 
    quote: 'Reaching Imperial felt impossible at first, but the clear progression path made it achievable. The rewards are truly top-class.' 
  },
  { 
    name: 'Anonymous', 
    rank: 'Expert', 
    quote: 'As someone new to being an IB, the Hero and Expert tiers gave me the confidence and earnings to go full-time. The platform is fantastic.' 
  }
];

export default function CompensationPlan({ onBecomePartnerClick }) {
  const [selectedRank, setSelectedRank] = useState(null);
  const [clients, setClients] = useState(10);
  const [avgLots, setAvgLots] = useState(15);
  const [selectedPlannerRank, setSelectedPlannerRank] = useState('Hero');
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [targetVolume, setTargetVolume] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // Calculate earnings for what-if planner
  const calculateEarnings = () => {
    const rankInfo = rankData.find(r => r.name === selectedPlannerRank);
    if (!rankInfo) return { total: 0, breakdown: '' };
    
    const totalLots = clients * avgLots;
    const earnings = totalLots * rankInfo.rebate;
    
    return {
      total: earnings,
      breakdown: `${clients} clients × ${avgLots} lots/client × $${rankInfo.rebate}/lot`
    };
  };

  const earnings = calculateEarnings();

  // Testimonial rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  // AI Analysis function
  const analyzeTarget = async () => {
    const volume = parseInt(targetVolume);
    if (isNaN(volume) || volume < 0) {
      setAiError('Please enter a valid, positive number for the volume.');
      return;
    }

    setIsAiLoading(true);
    setAiError('');
    setAiResult(null);

    // Simulate AI analysis (since we can't make external API calls in this environment)
    setTimeout(() => {
      let targetRank = rankData[0];
      for (let i = rankData.length - 1; i >= 0; i--) {
        if (volume >= rankData[i].volume) {
          targetRank = rankData[i];
          break;
        }
      }

      const strategies = [
        "Focus on building strong relationships with your existing clients to increase their trading frequency.",
        "Consider hosting educational webinars to attract new traders to your network.",
        "Leverage social media marketing to expand your reach and attract quality traders.",
        "Partner with other successful IBs to share strategies and cross-refer clients.",
        "Provide exceptional customer service to encourage word-of-mouth referrals."
      ];

      const randomStrategy = strategies[Math.floor(Math.random() * strategies.length)];

      setAiResult({
        rank: targetRank.name,
        rebate: targetRank.rebate,
        message: randomStrategy
      });
      setIsAiLoading(false);
    }, 2000);
  };

  const RankCard = ({ rank }) => {
    const IconComponent = rank.icon;
    return (
      <Card 
        className={`glass-effect border-default cursor-pointer transition-all duration-300 hover:border-accent-green hover:scale-105 ${
          selectedRank?.name === rank.name ? 'ring-2 ring-accent-green' : ''
        }`}
        onClick={() => setSelectedRank(rank)}
      >
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-surface flex items-center justify-center">
            <IconComponent className="w-8 h-8" style={{ color: rank.color }} />
          </div>
          <h3 className="text-lg font-bold text-primary mb-2">{rank.name}</h3>
          <p className="text-2xl font-black" style={{ color: rank.color }}>
            ${rank.rebate}/lot
          </p>
          {rank.volume > 0 && (
            <p className="text-sm text-secondary mt-2">
              ${rank.volume.toLocaleString()} min volume
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center mb-16">
        <div className="relative h-60 rounded-2xl overflow-hidden mb-8 bg-surface">
             <div className="absolute inset-0 bg-grid-slate-700/[0.1] bg-[length:20px_20px] [mask-image:linear-gradient(to_bottom,white_10%,transparent_100%)]"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div>
              <h1 className="text-4xl lg:text-5xl font-black text-primary mb-4">
                Your Path to <span className="text-accent-gold">Prosperity</span>
              </h1>
              <p className="text-xl text-secondary">
                Imperial Professional Compensation Structure with VT Markets IB
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Ranks and Badges */}
      <section>
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-primary mb-4">
            Achieve New <span className="text-accent-gold">Ranks</span>, Unlock New Rewards
          </h2>
          <p className="text-xl text-secondary max-w-3xl mx-auto">
            Our tiered system is designed to reward your growth. Click on any badge to discover the exclusive perks and benefits unlocked at each level.
          </p>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          {rankData.map((rank) => (
            <RankCard key={rank.name} rank={rank} />
          ))}
        </div>

        {/* Rank Details Modal */}
        {selectedRank && (
          <Card className="glass-effect border-default glow-effect-green">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-2xl font-bold" style={{ color: selectedRank.color }}>
                  {selectedRank.name} Rank
                </CardTitle>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedRank(null)}
                  className="text-primary hover:bg-surface"
                >
                  ✕
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-secondary text-lg">{selectedRank.perks}</p>
              <div className="mt-4 flex gap-4">
                <Badge className="bg-green-500/10 text-accent-green">
                  ${selectedRank.rebate}/lot rebate
                </Badge>
                {selectedRank.volume > 0 && (
                  <Badge className="bg-blue-500/10 text-accent-blue">
                    ${selectedRank.volume.toLocaleString()} min volume
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Business Planner */}
      <section>
        <Card className="glass-effect border-default">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary flex items-center gap-2">
              <Calculator className="w-6 h-6 text-accent-green" />
              "What-If" Business Planner
            </CardTitle>
            <p className="text-secondary">
              Model your business growth. Project your earnings based on number of clients and their average trading volume.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-end">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-primary mb-2">My IB Rank:</label>
                  <select
                    value={selectedPlannerRank}
                    onChange={(e) => setSelectedPlannerRank(e.target.value)}
                    className="w-full p-3 bg-surface border border-default rounded-lg text-primary"
                  >
                    {rankData.map((rank) => (
                      <option key={rank.name} value={rank.name}>{rank.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary mb-2">Number of Active Clients:</label>
                  <Input
                    type="number"
                    value={clients}
                    onChange={(e) => setClients(parseInt(e.target.value) || 0)}
                    className="bg-surface border-default text-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-primary mb-2">Average Lots per Client:</label>
                  <Input
                    type="number"
                    value={avgLots}
                    onChange={(e) => setAvgLots(parseInt(e.target.value) || 0)}
                    className="bg-surface border-default text-primary"
                  />
                </div>
              </div>
              
              <div className="lg:col-span-2 bg-surface/50 rounded-lg p-8 text-center">
                <p className="text-lg font-semibold text-secondary">Projected Monthly Earnings</p>
                <p className="text-5xl font-black text-accent-green my-4">
                  ${earnings.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-secondary">{earnings.breakdown}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* AI Strategy Assistant */}
      <section>
        <Card className="glass-effect border-default">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary flex items-center gap-2 justify-center">
              <Sparkles className="w-6 h-6 text-accent-gold" />
              AI Strategy Assistant
            </CardTitle>
            <p className="text-secondary text-center">
              Leverage artificial intelligence to chart your course. Enter your target monthly volume to receive your projected rank and a personalized strategic tip.
            </p>
          </CardHeader>
          <CardContent>
            <div className="max-w-md mx-auto space-y-4">
              <div>
                <label className="block text-lg font-semibold text-primary mb-2">
                  Target Monthly Client Volume ($):
                </label>
                <Input
                  type="number"
                  placeholder="e.g., 65000"
                  value={targetVolume}
                  onChange={(e) => setTargetVolume(e.target.value)}
                  className="bg-surface border-default text-primary"
                  min="0"
                />
              </div>
              
              <Button
                onClick={analyzeTarget}
                disabled={isAiLoading}
                className="w-full bg-accent-green hover:bg-green-500 text-white font-semibold glow-effect-green"
              >
                {isAiLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Analyze My Target
                  </>
                )}
              </Button>

              {aiError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-accent-red rounded-md">
                  {aiError}
                </div>
              )}

              {aiResult && (
                <div className="p-4 bg-blue-500/10 rounded-md">
                  <p className="text-xl font-bold text-accent-blue">
                    Projected Rank: {aiResult.rank}
                  </p>
                  <p className="text-lg mt-2 text-secondary">
                    Rebate per Lot: ${aiResult.rebate}
                  </p>
                  <p className="mt-4 text-base italic text-secondary">
                    <strong>AI Strategy Tip:</strong> {aiResult.message}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Success Stories */}
      <section>
        <Card className="glass-effect border-default">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary text-center">
              Success Stories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative max-w-3xl mx-auto text-center">
              <div className="min-h-32">
                <p className="text-xl italic text-secondary mb-4">
                  "{testimonials[currentTestimonial].quote}"
                </p>
                <p className="font-bold text-lg text-primary">
                  {testimonials[currentTestimonial].name}, 
                  <span className="text-accent-gold ml-1">
                    {testimonials[currentTestimonial].rank}
                  </span>
                </p>
              </div>
              
              <div className="flex justify-center gap-4 mt-6">
                <Button
                  variant="ghost"
                  onClick={prevTestimonial}
                  className="text-primary hover:bg-surface"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={nextTestimonial}
                  className="text-primary hover:bg-surface"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Call to Action */}
      <section className="text-center">
        <Card className="glass-effect border-default glow-effect-gold">
          <CardContent className="p-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-primary mb-6">
              Begin Your Partnership Journey
            </h2>
            <p className="text-lg text-secondary mb-8 max-w-2xl mx-auto">
              Join an elite group of partners and build a thriving business with VT Markets through Imperial Trading Community.
            </p>
            <Button 
              onClick={onBecomePartnerClick}
              className="bg-accent-green hover:bg-green-500 text-white font-semibold px-8 py-3 text-xl glow-effect-green"
            >
              Become an IB Partner
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
