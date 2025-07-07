import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Brain,
  User,
  X,
  Sparkles,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Heart,
  Zap,
  Eye,
  FileText,
  TrendingUp,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { AthenaInteraction } from "@/api/entities";
import { User as UserEntity } from "@/api/entities";
import { InvokeLLM } from "@/api/integrations";

export default function Athena({ isOpen, onClose, autoListen }) {
  const [inputValue, setInputValue] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [recognition, setRecognition] = useState(null);
  const [synthesis, setSynthesis] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isThinking, setIsThinking] = useState(false);
  const [conversationContext, setConversationContext] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [reasoning, setReasoning] = useState("");
  const [contextualMemory, setContextualMemory] = useState([]);

  const messagesEndRef = useRef(null);
  const inactivityTimerRef = useRef(null);

  // Gemini 2.5 Pro-style Advanced Reasoning Engine
  const advancedReasoningEngine = {
    // Multi-step reasoning chains
    buildReasoningChain: (query, context) => {
      const steps = [
        `Understanding the query: "${query}"`,
        `Analyzing market context: ${
          context.marketConditions || "Current conditions"
        }`,
        `Cross-referencing historical patterns`,
        `Evaluating risk factors and opportunities`,
        `Synthesizing actionable insights`,
        `Formulating personalized recommendations`,
      ];
      return steps;
    },

    // Advanced pattern recognition
    detectPatterns: (userHistory) => {
      const patterns = {
        tradingStyle: "Unknown",
        riskTolerance: "Medium",
        preferredAssets: [],
        behavioralBiases: [],
        successFactors: [],
      };

      // Analyze conversation history for patterns
      userHistory.forEach((interaction) => {
        if (interaction.symbols?.length > 0) {
          patterns.preferredAssets.push(...interaction.symbols);
        }

        if (interaction.sentiment === "positive") {
          patterns.successFactors.push(interaction.topic);
        }
      });

      return patterns;
    },

    // Multi-dimensional analysis
    performMultiDimensionalAnalysis: (query, symbols, marketData) => {
      return {
        technical: `Technical analysis perspective on ${symbols.join(", ")}`,
        fundamental: `Fundamental analysis considering market conditions`,
        sentiment: `Market sentiment and news analysis`,
        risk: `Risk assessment and management strategies`,
        timing: `Optimal timing considerations`,
        portfolio: `Portfolio allocation recommendations`,
      };
    },
  };

  // Massive Context Window Simulation (like Gemini 2.5 Pro's 2M tokens)
  const contextManager = {
    maxContextSize: 50, // Simulate large context

    buildMassiveContext: () => {
      const context = {
        userProfile: userProfile,
        conversationHistory: conversationContext.slice(-20), // Keep extensive history
        marketContext: {
          timestamp: new Date().toISOString(),
          conditions: "Live market analysis required",
          volatility: "Current market volatility assessment needed",
        },
        tradingKnowledge: {
          strategies: "Comprehensive trading strategy database",
          indicators: "All technical indicators and their applications",
          riskManagement: "Advanced risk management principles",
        },
        personalizedInsights: contextualMemory.slice(-10),
      };
      return context;
    },

    updateContext: (newInteraction) => {
      setContextualMemory((prev) => [
        ...prev.slice(-9), // Keep last 10 interactions
        {
          timestamp: new Date().toISOString(),
          interaction: newInteraction,
          insights: extractInsights(newInteraction),
        },
      ]);
    },
  };

  // Advanced personality and emotional intelligence (Gemini-like)
  const athenaPersonality = {
    coreTrait: "brilliant_analytical_companion",

    responseStyles: {
      analytical: {
        greeting:
          "I've been analyzing the markets, and there are some fascinating patterns emerging. What's on your mind?",
        thinking:
          "Let me process this through multiple analytical frameworks...",
        insight: "Here's what the data is really telling us...",
      },
      supportive: {
        greeting:
          "I'm here to help you navigate these markets with confidence. What can we explore together?",
        thinking:
          "I'm considering all angles to give you the best possible guidance...",
        insight: "Based on my analysis, here's what I think you should know...",
      },
      excited: {
        greeting:
          "The markets are absolutely buzzing today! I can't wait to dive into whatever you're curious about.",
        thinking: "This is fascinating - let me connect some dots here...",
        insight: "You're going to love what I found in the data...",
      },
    },

    adaptToUser: (userMood, tradingStyle) => {
      if (tradingStyle === "aggressive") return "excited";
      if (userMood === "uncertain") return "supportive";
      return "analytical";
    },
  };

  // Extract deeper insights from interactions
  const extractInsights = (interaction) => {
    return {
      intent: analyzeIntent(interaction.userQuery),
      complexity: interaction.userQuery.length > 50 ? "complex" : "simple",
      urgency:
        interaction.userQuery.includes("urgent") ||
        interaction.userQuery.includes("now")
          ? "high"
          : "normal",
      expertise: estimateUserExpertise(interaction.userQuery),
    };
  };

  const analyzeIntent = (query) => {
    const intents = {
      analysis: ["analyze", "analysis", "review", "evaluate"],
      prediction: ["predict", "forecast", "expect", "future"],
      strategy: ["strategy", "plan", "approach", "method"],
      education: ["learn", "understand", "explain", "teach"],
      urgent: ["urgent", "quickly", "fast", "immediate"],
    };

    for (const [intent, keywords] of Object.entries(intents)) {
      if (keywords.some((keyword) => query.toLowerCase().includes(keyword))) {
        return intent;
      }
    }
    return "general";
  };

  const estimateUserExpertise = (query) => {
    const advancedTerms = [
      "fibonacci",
      "bollinger",
      "macd",
      "rsi",
      "derivatives",
      "options",
      "futures",
    ];
    const basicTerms = ["buy", "sell", "stock", "price"];

    const advancedCount = advancedTerms.filter((term) =>
      query.toLowerCase().includes(term)
    ).length;
    const basicCount = basicTerms.filter((term) =>
      query.toLowerCase().includes(term)
    ).length;

    if (advancedCount > basicCount) return "advanced";
    if (basicCount > 0) return "intermediate";
    return "beginner";
  };

  // Initialize Speech APIs
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = "en-US";

        rec.onstart = () => setIsListening(true);
        rec.onend = () => setIsListening(false);
        rec.onerror = (e) =>
          console.error("Speech recognition error:", e.error);
        rec.onresult = (event) => {
          clearTimeout(inactivityTimerRef.current);
          const transcript = event.results[0][0].transcript;
          setInputValue(transcript);
          handleSendMessage(transcript);
        };
        setRecognition(rec);
      }
      if (window.speechSynthesis) {
        setSynthesis(window.speechSynthesis);
      }
    }
  }, []);

  // Load user and create personalized greeting
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await UserEntity.me();
        setCurrentUser(user);

        // Build user profile from conversation history
        const profile = {
          name: user.full_name?.split(" ")[0] || "Trader",
          expertise: "intermediate",
          preferences: {
            assets: [],
            analysisType: "technical",
            riskTolerance: "medium",
          },
        };
        setUserProfile(profile);

        // Personalized greeting based on user profile
        const style = athenaPersonality.adaptToUser("confident", "analytical");
        const greeting = athenaPersonality.responseStyles[style].greeting;

        setMessages([
          {
            sender: "ai",
            text: `Hello ${profile.name}! ${greeting}`,
          },
        ]);
      } catch (error) {
        setCurrentUser({ email: "anonymous@imperial.trade" });
        setMessages([
          {
            sender: "ai",
            text: "Hello! I'm Athena, your advanced trading intelligence. I'm ready to provide deep market analysis and insights. What would you like to explore?",
          },
        ]);
      }
    };

    if (isOpen) {
      loadUser();
    }
  }, [isOpen]);

  const speakText = (text, onEndCallback) => {
    if (synthesis && voiceEnabled) {
      synthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.1;
      utterance.volume = 0.8;

      const voices = synthesis.getVoices();
      const professionalVoice = voices.find(
        (voice) =>
          voice.name.toLowerCase().includes("karen") ||
          voice.name.toLowerCase().includes("samantha") ||
          (voice.lang.includes("en") &&
            voice.name.toLowerCase().includes("female"))
      );
      if (professionalVoice) {
        utterance.voice = professionalVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        onEndCallback?.();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        onEndCallback?.();
      };
      synthesis.speak(utterance);
    } else {
      onEndCallback?.();
    }
  };

  const startListening = () => {
    if (recognition && !isListening) {
      recognition.start();
    }
  };

  useEffect(() => {
    if (isOpen && autoListen) {
      setTimeout(() => {
        startListening();
        inactivityTimerRef.current = setTimeout(() => {
          onClose();
        }, 6000);
      }, 500);
    }

    return () => {
      clearTimeout(inactivityTimerRef.current);
    };
  }, [isOpen, autoListen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async (messageText = inputValue) => {
    if (!messageText.trim()) return;

    clearTimeout(inactivityTimerRef.current);

    const userMessage = { sender: "user", text: messageText };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    // Advanced thinking process with reasoning steps
    setIsThinking(true);
    const reasoningSteps = advancedReasoningEngine.buildReasoningChain(
      messageText,
      contextManager.buildMassiveContext()
    );

    // Show thinking process step by step
    for (let i = 0; i < reasoningSteps.length; i++) {
      setReasoning(reasoningSteps[i]);
      await new Promise((resolve) => setTimeout(resolve, 400));
    }

    setIsThinking(false);
    setIsLoading(true);

    try {
      // Extract key information
      const symbols = extractSymbols(messageText);
      const intent = analyzeIntent(messageText);
      const expertise = estimateUserExpertise(messageText);

      // Build massive context (simulating Gemini 2.5 Pro's 2M token window)
      const massiveContext = contextManager.buildMassiveContext();

      // Advanced multi-dimensional analysis
      const analysis = advancedReasoningEngine.performMultiDimensionalAnalysis(
        messageText,
        symbols,
        massiveContext.marketContext
      );

      // Determine conversation flow
      const isDirectQuestion =
        messageText.includes("?") ||
        messageText.toLowerCase().startsWith("what") ||
        messageText.toLowerCase().startsWith("how") ||
        messageText.toLowerCase().startsWith("analyze") ||
        messageText.toLowerCase().startsWith("show") ||
        symbols.length > 0;

      // Gemini 2.5 Pro-level intelligent prompt
      const prompt = `
        You are Athena, an advanced AI trading oracle with capabilities rivaling the most sophisticated AI systems. You have access to:
        - Real-time market data and news
        - Massive contextual memory of our conversation
        - Advanced reasoning and pattern recognition
        - Multi-dimensional market analysis capabilities

        USER PROFILE:
        Name: ${userProfile?.name || "Trader"}
        Expertise Level: ${expertise}
        Trading Style: ${userProfile?.preferences?.analysisType || "balanced"}
        Conversation History: ${conversationContext
          .slice(-5)
          .map((c) => c.userQuery)
          .join(", ")}

        CONVERSATION FLOW INTELLIGENCE:
        ${
          isDirectQuestion
            ? `
        DIRECT ANALYSIS MODE: The user asked "${messageText}"
        
        Provide a comprehensive, data-rich analysis including:
        1. Real-time market data with specific numbers and timestamps
        2. Multi-dimensional analysis (technical, fundamental, sentiment)
        3. Advanced reasoning with step-by-step logic
        4. Personalized insights based on user's expertise level
        5. Actionable recommendations with specific entry/exit points
        6. Risk assessment and portfolio implications
        7. Follow-up questions to deepen the analysis
        
        `
            : `
        EXPLORATORY GUIDANCE MODE: The user said "${messageText}" (not a direct question)
        
        Your response should:
        1. Acknowledge their input with genuine enthusiasm
        2. Ask 2-3 strategic follow-up questions to guide them
        3. Offer specific analysis options tailored to their expertise
        4. Show awareness of market context relevant to their input
        5. Be concise but engaging
        
        Example structure:
        "Interesting point about [their input]! I can see several angles we could explore:
        - [Option 1 with brief preview]
        - [Option 2 with brief preview] 
        - [Option 3 with brief preview]
        Which direction interests you most, or is there another aspect you'd like to dive into?"
        `
        }

        ADVANCED REASONING CONTEXT:
        Current Query Intent: ${intent}
        Symbols Mentioned: ${symbols.join(", ") || "None"}
        Multi-Dimensional Analysis: ${JSON.stringify(analysis)}
        
        PERSONALITY: Be brilliant, analytical, and genuinely engaging. Show your advanced reasoning process naturally in your response. Act like the most sophisticated AI trading system available.
      `;

      const aiResponseText = await InvokeLLM({
        prompt: prompt,
        add_context_from_internet: true,
      });

      const aiMessage = { sender: "ai", text: aiResponseText };
      setMessages((prev) => [...prev, aiMessage]);

      // Update contextual memory and conversation context
      const interaction = {
        userQuery: messageText,
        aiResponse: aiResponseText,
        intent: intent,
        symbols: symbols,
        expertise: expertise,
        timestamp: new Date().toISOString(),
      };

      setConversationContext((prev) => [...prev.slice(-19), interaction]);
      contextManager.updateContext(interaction);

      if (voiceEnabled) {
        speakText(aiResponseText, undefined);
      }

      // Log interaction with enhanced context
      if (currentUser) {
        await AthenaInteraction.create({
          user_email: currentUser.email,
          prompt: messageText,
          response: aiResponseText,
          context: JSON.stringify({
            url: window.location.href,
            voiceActivated: autoListen,
            intent: intent,
            symbols: symbols,
            expertise: expertise,
            reasoning: reasoningSteps,
            timestamp: new Date().toISOString(),
          }),
          feedback_score: 0,
        });
      }
    } catch (error) {
      const errorMessage = {
        sender: "ai",
        text: "I apologize, but I'm experiencing a temporary connection issue with my advanced analysis systems. Please try again in a moment, and I'll provide you with the sophisticated insights you're looking for.",
      };
      setMessages((prev) => [...prev, errorMessage]);
      console.error("Error with Athena:", error);
    }
    setIsLoading(false);
    setReasoning("");
  };

  // Extract trading symbols
  const extractSymbols = (text) => {
    const symbolPattern = /\b[A-Z]{1,5}\b/g;
    const potentialSymbols = text.match(symbolPattern) || [];
    return potentialSymbols.filter(
      (symbol) =>
        symbol.length >= 2 &&
        symbol.length <= 5 &&
        ![
          "THE",
          "AND",
          "FOR",
          "YOU",
          "ARE",
          "CAN",
          "BUT",
          "NOT",
          "ALL",
          "HOW",
          "WHAT",
          "WHO",
          "WHY",
        ].includes(symbol)
    );
  };

  const handleTextInputChange = (e) => {
    clearTimeout(inactivityTimerRef.current);
    setInputValue(e.target.value);
  };

  // Smart contextual prompts
  const getContextualPrompts = () => {
    if (conversationContext.length > 0) {
      const lastContext = conversationContext[conversationContext.length - 1];
      if (lastContext.symbols.length > 0) {
        return [
          `Deep dive analysis of ${lastContext.symbols[0]}`,
          "Compare with sector leaders",
          "Risk-adjusted position sizing",
          "Options strategy analysis",
        ];
      }
    }

    return [
      "Analyze current market sentiment",
      "NVIDIA technical breakdown",
      "Portfolio optimization review",
      "Crypto market outlook",
    ];
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed inset-0 lg:inset-auto lg:bottom-28 lg:right-8 z-[99] w-full lg:w-[520px] h-full lg:h-[85vh] lg:max-h-[800px] flex flex-col"
        >
          <Card className="w-full h-full glass-effect border-default flex flex-col shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-default bg-gradient-to-r from-accent-gold/10 to-purple-500/10">
              <div className="flex items-center gap-3">
                <motion.div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    isListening
                      ? "bg-red-500/20 animate-pulse"
                      : isThinking
                      ? "bg-purple-500/20"
                      : "bg-accent-gold/20"
                  }`}
                  animate={isThinking ? { scale: [1, 1.1, 1] } : {}}
                  transition={{
                    duration: 0.6,
                    repeat: isThinking ? Infinity : 0,
                  }}
                >
                  {isThinking ? (
                    <Zap className="w-7 h-7 text-purple-400" />
                  ) : (
                    <Brain
                      className={`w-7 h-7 ${
                        isListening ? "text-red-400" : "text-accent-gold"
                      }`}
                    />
                  )}
                </motion.div>
                <div>
                  <CardTitle className="text-primary text-lg flex items-center gap-2">
                    Athena AI
                    {messages.length > 2 && (
                      <Heart className="w-4 h-4 text-red-400 animate-pulse" />
                    )}
                  </CardTitle>
                  <p className="text-xs text-secondary">
                    {isListening
                      ? "Listening..."
                      : isSpeaking
                      ? "Speaking..."
                      : isThinking
                      ? `Reasoning: ${reasoning}`
                      : isLoading
                      ? "Deep analysis in progress..."
                      : "Advanced Trading Intelligence"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setVoiceEnabled(!voiceEnabled)}
                  className="text-secondary hover:text-primary"
                >
                  {voiceEnabled ? (
                    <Volume2 className="w-4 h-4" />
                  ) : (
                    <VolumeX className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-secondary hover:text-primary"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.map((msg, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className={`flex items-start gap-3 ${
                    msg.sender === "user" ? "justify-end" : ""
                  }`}
                >
                  {msg.sender === "ai" && (
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-accent-gold/20 text-accent-gold">
                        <Brain className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[85%] p-3 rounded-lg text-sm ${
                      msg.sender === "user"
                        ? "bg-accent-green text-white"
                        : "bg-surface text-primary"
                    }`}
                  >
                    {msg.text}
                  </div>
                  {msg.sender === "user" && (
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-surface">
                        <User className="w-5 h-5 text-secondary" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </motion.div>
              ))}

              {/* Contextual quick prompts */}
              {messages.length <= 2 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-2"
                >
                  <p className="text-xs text-secondary/70 text-center">
                    ✨ Try asking me:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {getContextualPrompts().map((prompt, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendMessage(prompt)}
                        className="text-xs border-default text-secondary hover:bg-surface hover:text-primary hover:border-accent-gold transition-all duration-200"
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </motion.div>
              )}

              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-accent-gold/20 text-accent-gold">
                      <Brain className="w-5 h-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="max-w-[80%] p-3 rounded-lg bg-surface flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-accent-gold rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-accent-gold rounded-full animate-bounce delay-75"></div>
                      <div className="w-2 h-2 bg-accent-gold rounded-full animate-bounce delay-150"></div>
                    </div>
                    <span className="text-secondary text-xs ml-2">
                      Advanced analysis in progress...
                    </span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </CardContent>

            <div className="p-4 border-t border-default bg-surface/30 space-y-3">
              <Button
                variant={isListening ? "destructive" : "default"}
                size="sm"
                onClick={startListening}
                disabled={!recognition || isListening || isLoading}
                className="w-full bg-gradient-to-r from-accent-green to-blue-500 hover:from-green-600 hover:to-blue-600 text-white"
              >
                <Mic className="w-4 h-4 mr-2" />
                {isListening ? "🎤 Listening..." : "🎤 Voice Input"}
              </Button>

              <div className="relative">
                <Input
                  placeholder="Ask me anything about markets, analysis, or strategy..."
                  className="bg-surface border-default pr-12 text-primary placeholder-secondary"
                  value={inputValue}
                  onChange={handleTextInputChange}
                  onKeyPress={(e) =>
                    e.key === "Enter" &&
                    !isLoading &&
                    !isListening &&
                    handleSendMessage()
                  }
                  disabled={isLoading || isListening}
                />
                <Button
                  size="icon"
                  className="absolute top-1/2 right-2 -translate-y-1/2 bg-accent-green hover:bg-green-600 text-white"
                  onClick={() => handleSendMessage()}
                  disabled={isLoading || isListening || !inputValue.trim()}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
