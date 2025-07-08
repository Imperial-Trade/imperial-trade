
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  User,
  Mail,
  Shield,
  Send,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Crown,
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useAccountRequestForm } from "@/hooks/useAccountRequestForm";
import { HoneypotField } from "@/components/security/HoneypotField";
import { ValidationFeedback } from "@/components/security/ValidationFeedback";
import { AccountRequest } from "@/api/entities";

export default function AccountRequestPage() {
  const [status, setStatus] = useState({ type: "", message: "" });
  const { form, onSubmit, canSubmit, isSubmitting } = useAccountRequestForm();

  const handleFormSubmit = async (data: any) => {
    try {
      await AccountRequest.create(data);
      setStatus({
        type: "success",
        message: "Your request has been submitted! You will receive an email once an admin has reviewed it.",
      });
      form.reset();
    } catch (error) {
      console.error("Failed to submit account request:", error);
      setStatus({
        type: "error",
        message: "There was an error submitting your request. Please try again later.",
      });
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 bg-background overflow-hidden">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute z-0 w-auto min-w-full min-h-full max-w-none object-cover"
        style={{ filter: "brightness(0.4)" }}
      >
        <source
          src="https://videos.pexels.com/video-files/3209828/3209828-hd_1920_1080_25fps.mp4"
          type="video/mp4"
        />
      </video>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] z-10"></div>

      <div className="relative z-20 max-w-2xl w-full">
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-surface/90 rounded-2xl flex items-center justify-center glow-effect-gold backdrop-blur-md shadow-2xl">
              <Crown className="w-10 h-10 text-accent-gold" />
            </div>
            <div>
              <h1 className="text-4xl font-bold imperial-tech-font drop-shadow-lg">
                IMPERIAL
              </h1>
              <p className="text-lg text-white/90 drop-shadow-md">
                Trading Community
              </p>
            </div>
          </div>
        </div>

        <Card className="glass-effect border-default">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-primary text-center">
              Request Community Access
            </CardTitle>
            <p className="text-secondary text-center text-white">
              Fill out the form below. An admin will review your request shortly.
            </p>
          </CardHeader>
          <CardContent>
            {status.message && (
              <div
                className={`p-3 rounded-md flex items-center gap-2 text-sm mb-6 ${
                  status.type === "success"
                    ? "bg-green-500/10 border border-green-500/20 text-green-300"
                    : "bg-red-500/10 border border-red-500/20 text-red-300"
                }`}
              >
                {status.type === "success" ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
                {status.message}
              </div>
            )}

            {status.type !== "success" && (
              <div className="account-request-form-container">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleFormSubmit)} className="form-grid">
                    <HoneypotField form={form} />
                    
                    <div className="form-fields">
                      <FormField
                        control={form.control}
                        name="full_name"
                        render={({ field, fieldState }) => (
                          <FormItem>
                            <FormLabel className="text-white">Full Name</FormLabel>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Enter your full name"
                                  className="pl-10 bg-white border-gray-300 text-gray-900"
                                />
                              </FormControl>
                            </div>
                            <ValidationFeedback
                              error={fieldState.error}
                              isValid={!fieldState.error}
                              value={field.value}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field, fieldState }) => (
                          <FormItem>
                            <FormLabel className="text-white">Email Address</FormLabel>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                              <FormControl>
                                <Input
                                  {...field}
                                  type="email"
                                  placeholder="Enter your email address"
                                  className="pl-10 bg-white border-gray-300 text-gray-900"
                                />
                              </FormControl>
                            </div>
                            <ValidationFeedback
                              error={fieldState.error}
                              isValid={!fieldState.error}
                              value={field.value}
                            />
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="account_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-white">Account Type</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                                  <div className="flex items-center gap-3">
                                    <Shield className="w-5 h-5 text-gray-400" />
                                    <SelectValue placeholder="Select account type" />
                                  </div>
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="user">Standard Member</SelectItem>
                                <SelectItem value="admin">Educator / IB Partner</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="reason"
                        render={({ field, fieldState }) => (
                          <FormItem>
                            <FormLabel className="text-white">
                              Why do you want to join? (10-500 characters)
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Briefly state why you want to join (e.g., 'Referred by John Doe', 'Interested in IB program', etc.)"
                                className="bg-white border-gray-300 text-gray-900"
                                rows={3}
                              />
                            </FormControl>
                            <div className="flex justify-between items-center">
                              <ValidationFeedback
                                error={fieldState.error}
                                isValid={!fieldState.error}
                                value={field.value}
                              />
                              <span className="text-xs text-gray-400">
                                {field.value?.length || 0}/500
                              </span>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="form-actions">
                      <Button
                        type="submit"
                        disabled={isSubmitting || !canSubmit}
                        className="w-full bg-accent-green hover:bg-green-500 text-white font-semibold py-3 h-12"
                      >
                        {isSubmitting ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" /> Submit Request
                          </>
                        )}
                      </Button>
                      
                      {!canSubmit && (
                        <p className="text-sm text-yellow-400 text-center mt-2">
                          Rate limit reached. Please wait before submitting another request.
                        </p>
                      )}
                    </div>
                  </form>
                </Form>
              </div>
            )}

            <div className="pt-4">
              <Link to={createPageUrl("AccessPortal")}>
                <Button
                  variant="outline"
                  className="w-full border-white/20 text-white/80 hover:bg-white/10"
                >
                  Go to Login
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <style>{`
        /* Form Grid Layout */
        .account-request-form-container {
          width: 100%;
        }
        
        .form-grid {
          display: grid;
          grid-template-areas: 
            "fields"
            "actions";
          gap: 1.5rem;
        }
        
        .form-fields {
          grid-area: fields;
          display: grid;
          gap: 1.5rem;
        }
        
        .form-actions {
          grid-area: actions;
        }

        @media (min-width: 768px) {
          .form-grid {
            grid-template-areas: 
              "fields fields"
              "actions actions";
            grid-template-columns: 1fr 1fr;
          }
          
          .form-fields {
            grid-column: span 2;
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
          }
          
          .form-fields > *:nth-child(3),
          .form-fields > *:nth-child(4) {
            grid-column: span 2;
          }
        }

        /* AI Tech Font Styles */
        .imperial-tech-font {
          font-family: 'Orbitron', 'Courier New', monospace;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          background: linear-gradient(135deg, #e6d3b3, #c09a58);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: 0 0 20px rgba(192, 154, 88, 0.4);
          position: relative;
        }

        .imperial-tech-font::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(192, 154, 88, 0.3), transparent);
          animation: tech-scan 3s infinite;
          pointer-events: none;
        }

        @keyframes tech-scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        /* Load Orbitron font */
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
      `}</style>
    </div>
  );
}
