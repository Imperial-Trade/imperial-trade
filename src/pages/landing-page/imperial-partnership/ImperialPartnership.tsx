import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import ParallaxSection from "@/components/landing/ParallaxSection";
import { TypewriterText } from "@/components/ui/typewriter-text";
import { TradingBackground } from "@/components/account-request/TradingBackground";
import { Crown, Users, Rocket, LineChart, Shield, Wallet, ArrowRight, CheckCircle2, Sparkles, BarChart3, Share2 } from "lucide-react";
import { useLocation } from "react-router-dom";

// Lightweight SEO component to inject head tags without extra deps
function SEOHead() {
  const location = useLocation();
  const canonical = `${window.location.origin}/imperial-partnership`;
  useEffect(() => {
    const title = "Imperial Partnership – Ambassador Program for Lucrative Royalties";
    const description = "Become an Imperial Ambassador. Earn lifetime affiliate commissions and royalties whenever your audience trades with our broker.";

    document.title = title;

    const ensureMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name='${name}']`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const ensureProperty = (property: string, content: string) => {
      let el = document.querySelector(`meta[property='${property}']`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("property", property);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    ensureMeta("description", description);
    ensureProperty("og:title", title);
    ensureProperty("og:description", description);
    ensureProperty("og:type", "website");
    ensureProperty("og:url", canonical);

    let link = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", canonical);

    // Structured data: Organization + Program + FAQ
    const ld = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Imperial Partnership",
      "url": canonical,
      "about": {
        "@type": "Organization",
        "name": "Imperial Trading",
        "url": window.location.origin,
      },
      "hasPart": [
        {
          "@type": "ProgramMembership",
          "name": "Imperial Ambassador Program",
          "membershipNumber": "AMBASSADOR",
          "programName": "Imperial Partnership",
          "description": "Earn lifetime affiliate commissions and royalties when your audience trades with our broker.",
        },
      ],
      "mainEntity": {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How do I earn as an ambassador?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Share your unique link. When users sign up and trade, you earn affiliate commissions plus lifetime royalties on activity."
            }
          },
          {
            "@type": "Question",
            "name": "Is there a minimum payout?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "No complicated thresholds. We process fast payouts as soon as you meet standard transfer minimums."
            }
          }
        ]
      }
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(ld);
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, [location.pathname]);

  return null;
}

export default function ImperialPartnership() {
  // Earnings calculator state
  const [referrals, setReferrals] = useState(25); // new active clients per month
  const [avgRevenue, setAvgRevenue] = useState(80); // broker revenue per active client per month
  const [royaltyRate, setRoyaltyRate] = useState(5); // lifetime royalty % on downline/volume
  const [affiliateRate, setAffiliateRate] = useState(35); // base affiliate % of broker revenue

  const monthly = useMemo(() => {
    const base = referrals * avgRevenue * (affiliateRate / 100);
    const royalty = referrals * avgRevenue * (royaltyRate / 100);
    return {
      base: Math.round(base),
      royalty: Math.round(royalty),
      total: Math.round(base + royalty),
    };
  }, [referrals, avgRevenue, royaltyRate, affiliateRate]);

  return (
    <>
      <SEOHead />
      <header className="relative min-h-[80vh] flex items-center justify-center overflow-hidden bg-background">
        {/* Animated trading background */}
        <div className="absolute inset-0 -z-10 opacity-60">
          <TradingBackground />
        </div>
        {/* Gradient overlay for contrast */}
        <div className="absolute inset-0 -z-[5] bg-gradient-to-b from-background/60 via-background/40 to-background" />

        <div className="container mx-auto px-6 py-20 text-center">
          <div className="mx-auto max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/40">
              <Crown className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Imperial Partnership</span>
            </div>
            <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground">
              Become an Imperial Ambassador
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Partner with us and earn lifetime affiliate commissions and royalties whenever your audience trades with our broker.
            </p>
            <div className="mt-6 text-xl font-medium text-foreground">
              <TypewriterText text="Build a serious income stream. Create impact. Get paid for your influence." showCursor className="text-foreground" />
            </div>

            <div className="mt-8 flex items-center justify-center gap-3">
              <Button size="lg" className="shadow-md">
                Apply Now <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline">
                Book a Call
              </Button>
            </div>

            <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: Users, label: "Lifetime Royalties" },
                { icon: Rocket, label: "Fast Payouts" },
                { icon: LineChart, label: "Real-time Analytics" },
                { icon: Shield, label: "RLS-Secure Portal" },
              ].map((f, i) => (
                <div key={i} className="rounded-xl border border-border bg-card text-card-foreground px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <f.icon className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">{f.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main>
        {/* Earnings Calculator */}
        <section className="container mx-auto px-6 py-16">
          <ScrollReveal>
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Wallet className="h-5 w-5 text-primary" />
                  Earnings Calculator
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <label className="text-sm text-muted-foreground">New active clients / month</label>
                    <div className="mt-2">
                      <Slider value={[referrals]} min={0} max={200} step={1} onValueChange={(v) => setReferrals(v[0] ?? 0)} />
                      <Input className="mt-2" type="number" value={referrals} onChange={(e) => setReferrals(parseInt(e.target.value || "0"))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Broker revenue per active client ($)</label>
                    <div className="mt-2">
                      <Slider value={[avgRevenue]} min={10} max={300} step={5} onValueChange={(v) => setAvgRevenue(v[0] ?? 0)} />
                      <Input className="mt-2" type="number" value={avgRevenue} onChange={(e) => setAvgRevenue(parseInt(e.target.value || "0"))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Base affiliate rate (%)</label>
                    <div className="mt-2">
                      <Slider value={[affiliateRate]} min={10} max={60} step={1} onValueChange={(v) => setAffiliateRate(v[0] ?? 0)} />
                      <Input className="mt-2" type="number" value={affiliateRate} onChange={(e) => setAffiliateRate(parseInt(e.target.value || "0"))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Royalty rate (%)</label>
                    <div className="mt-2">
                      <Slider value={[royaltyRate]} min={0} max={20} step={1} onValueChange={(v) => setRoyaltyRate(v[0] ?? 0)} />
                      <Input className="mt-2" type="number" value={royaltyRate} onChange={(e) => setRoyaltyRate(parseInt(e.target.value || "0"))} />
                    </div>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-primary/10 to-background border-border">
                    <CardContent className="p-6">
                      <div className="text-sm text-muted-foreground">Base affiliate</div>
                      <div className="mt-1 text-3xl font-bold text-foreground">${monthly.base.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-primary/10 to-background border-border">
                    <CardContent className="p-6">
                      <div className="text-sm text-muted-foreground">Royalties</div>
                      <div className="mt-1 text-3xl font-bold text-foreground">${monthly.royalty.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-to-br from-primary/10 to-background border-border">
                    <CardContent className="p-6">
                      <div className="text-sm text-muted-foreground">Total monthly estimate</div>
                      <div className="mt-1 text-3xl font-bold text-foreground">${monthly.total.toLocaleString()}</div>
                    </CardContent>
                  </Card>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">Estimates for illustration only. Actual results depend on performance and tier.</p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Button size="lg" className="shadow">
                    Start Earning Today
                  </Button>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" /> Lifetime royalties preserved
                  </div>
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>
        </section>

        {/* How it works */}
        <section className="bg-muted/30 py-16">
          <div className="container mx-auto px-6">
            <ScrollReveal>
              <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground">How the Imperial Partnership Works</h2>
              <p className="mt-2 text-center text-muted-foreground max-w-2xl mx-auto">A simple, transparent pathway to consistent earnings as an ambassador.</p>
            </ScrollReveal>
            <div className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { icon: Share2, title: "1. Get your link", text: "Apply and receive your unique, trackable ambassador link." },
                { icon: Rocket, title: "2. Promote", text: "Share across your channels. We provide the marketing arsenal." },
                { icon: BarChart3, title: "3. Users trade", text: "Your audience signs up and trades with our broker." },
                { icon: Wallet, title: "4. You get paid", text: "Earn affiliate commissions and lifetime royalties." },
              ].map((s, i) => (
                <ScrollReveal key={i} delay={i * 100}>
                  <Card className="h-full border-border">
                    <CardContent className="p-6">
                      <s.icon className="h-6 w-6 text-primary" />
                      <h3 className="mt-4 font-semibold text-foreground">{s.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{s.text}</p>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        {/* Social proof */}
        <section className="container mx-auto px-6 py-16">
          <ScrollReveal>
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground">What Ambassadors Say</h2>
            <p className="mt-2 text-center text-muted-foreground max-w-2xl mx-auto">Creators and educators are building serious recurring income with Imperial.</p>
          </ScrollReveal>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <ScrollReveal key={i} delay={i * 100}>
                <Card className="border-border h-full">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10" />
                      <div>
                        <div className="font-medium text-foreground">Ambassador {i}</div>
                        <div className="text-xs text-muted-foreground">Finance Creator</div>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">“In three months, my recurring royalties surpassed my ad revenue. The portal shows everything in real time.”</p>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="relative overflow-hidden">
          <ParallaxSection videoSrc="https://videos.pexels.com/video-files/7975456/7975456-hd_1920_1080_25fps.mp4">
            <div className="relative z-10 container mx-auto px-6 py-20">
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground">Ready to become an Imperial Ambassador?</h2>
                <p className="mt-2 text-muted-foreground">Apply now and secure lifetime royalties on every user who trades with our broker through your influence.</p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <Button size="lg" className="shadow-md">Apply Now</Button>
                  <Button size="lg" variant="outline">Talk to our team</Button>
                </div>
              </div>
            </div>
          </ParallaxSection>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
        </section>

        {/* FAQs */}
        <section className="container mx-auto px-6 py-16">
          <ScrollReveal>
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground">Frequently Asked Questions</h2>
          </ScrollReveal>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { q: "What is the Imperial Partnership?", a: "Our ambassador program where you earn affiliate commissions and lifetime royalties from users trading with our broker." },
              { q: "How fast are payouts?", a: "We process payouts fast based on your selected method after standard transfer minimums are met." },
              { q: "Do I need to be a trader?", a: "No. Many ambassadors are creators or educators who share our platform with their audience." },
              { q: "Is there real-time tracking?", a: "Yes. Our portal provides live analytics, tiers, and performance insights." },
            ].map((item, i) => (
              <Card key={i} className="border-border">
                <CardContent className="p-6">
                  <div className="font-medium text-foreground">{item.q}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{item.a}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
