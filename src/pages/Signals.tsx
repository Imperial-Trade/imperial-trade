
import Layout from "@/components/Layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Clock, Target, Shield } from "lucide-react"

const Signals = () => {
  const signals = [
    {
      pair: "EUR/USD",
      action: "BUY",
      entry: "1.0850",
      target: "1.0920",
      stopLoss: "1.0800",
      status: "Active",
      time: "2 hours ago",
      profit: "+65 pips",
      type: "trending-up",
      educator: "Pro Trader Alex",
      verified: true
    },
    {
      pair: "GBP/JPY",
      action: "SELL",
      entry: "185.50",
      target: "184.20",
      stopLoss: "186.00",
      status: "Completed",
      time: "4 hours ago",
      profit: "+130 pips",
      type: "trending-down",
      educator: "FX Master Sarah",
      verified: true
    },
    {
      pair: "USD/CAD",
      action: "BUY",
      entry: "1.3720",
      target: "1.3780",
      stopLoss: "1.3680",
      status: "Pending",
      time: "1 hour ago",
      profit: "Waiting",
      type: "trending-up",
      educator: "Trade Guru Mike",
      verified: true
    },
    {
      pair: "AUD/USD",
      action: "SELL",
      entry: "0.6580",
      target: "0.6520",
      stopLoss: "0.6620",
      status: "Active",
      time: "30 minutes ago",
      profit: "+25 pips",
      type: "trending-down",
      educator: "Lead Educator Lisa",
      verified: true
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-500/20 text-green-400 border-green-500/30"
      case "Completed": return "bg-blue-500/20 text-blue-400 border-blue-500/30"
      case "Pending": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30"
    }
  }

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent">
              Professional Trading Signals
            </h1>
            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
              <Shield className="w-4 h-4 mr-1" />
              Verified Educators Only
            </Badge>
          </div>
          <p className="text-lg text-muted-foreground">
            Real-time educational opportunities from our verified market educators and contributors.
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30">
            <CardContent className="p-6 text-center">
              <TrendingUp className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-400">87%</div>
              <div className="text-sm text-muted-foreground">Success Rate</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/30">
            <CardContent className="p-6 text-center">
              <Target className="h-8 w-8 text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-400">25+</div>
              <div className="text-sm text-muted-foreground">Daily Signals</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-purple-500/20 to-violet-500/20 border-purple-500/30">
            <CardContent className="p-6 text-center">
              <Clock className="h-8 w-8 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-purple-400">24/7</div>
              <div className="text-sm text-muted-foreground">Monitoring</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-primary/20 to-amber-300/20 border-primary/30">
            <CardContent className="p-6 text-center">
              <Shield className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-primary">15+</div>
              <div className="text-sm text-muted-foreground">Pro Educators</div>
            </CardContent>
          </Card>
        </div>

        {/* Signals List */}
        <div className="grid gap-4">
          {signals.map((signal, index) => (
            <Card key={index} className="hover:scale-[1.01] transition-all duration-300 bg-background/50 backdrop-blur-sm border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {signal.type === "trending-up" ? (
                        <TrendingUp className="h-5 w-5 text-green-400" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-red-400" />
                      )}
                      <CardTitle className="text-xl">{signal.pair}</CardTitle>
                    </div>
                    <Badge variant="outline" className={`${signal.action === "BUY" ? "text-green-400 border-green-500/30" : "text-red-400 border-red-500/30"}`}>
                      {signal.action}
                    </Badge>
                    {signal.verified && (
                      <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                        <Shield className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Badge className={getStatusColor(signal.status)}>
                      {signal.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{signal.time}</span>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  By {signal.educator}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Entry</div>
                    <div className="font-semibold">{signal.entry}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Target</div>
                    <div className="font-semibold text-green-400">{signal.target}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Stop Loss</div>
                    <div className="font-semibold text-red-400">{signal.stopLoss}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Profit</div>
                    <div className={`font-semibold ${signal.profit === "Waiting" ? "text-muted-foreground" : "text-green-400"}`}>
                      {signal.profit}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  )
}

export default Signals
