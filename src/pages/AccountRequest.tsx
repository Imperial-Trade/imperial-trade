
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AccountRequest } from '@/api/entities';
import { User, Mail, Shield, MessageSquare, Send, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Crown } from 'lucide-react';

export default function AccountRequestPage() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    account_type: 'user',
    reason: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ type: '', message: '' });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (value) => {
    setFormData(prev => ({ ...prev, account_type: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.full_name || !formData.email || !formData.reason) {
      setStatus({ type: 'error', message: 'Please fill out all required fields.' });
      return;
    }

    setIsLoading(true);
    setStatus({ type: '', message: '' });

    try {
      await AccountRequest.create(formData);
      setStatus({ type: 'success', message: 'Your request has been submitted! You will receive an email once an admin has reviewed it.' });
      setFormData({ full_name: '', email: '', account_type: 'user', reason: '' });
    } catch (error) {
      console.error('Failed to submit account request:', error);
      setStatus({ type: 'error', message: 'There was an error submitting your request. Please try again later.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 bg-background overflow-hidden">
        <video autoPlay loop muted playsInline className="absolute z-0 w-auto min-w-full min-h-full max-w-none object-cover" style={{ filter: 'brightness(0.4)' }}>
            <source src="https://videos.pexels.com/video-files/3209828/3209828-hd_1920_1080_25fps.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] z-10"></div>

        <div className="relative z-20 max-w-lg w-full">
             <div className="flex items-center justify-center mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-surface/90 rounded-2xl flex items-center justify-center glow-effect-gold backdrop-blur-md shadow-2xl">
                    <Crown className="w-10 h-10 text-accent-gold" />
                    </div>
                    <div>
                    <h1 className="text-4xl font-bold imperial-tech-font drop-shadow-lg">IMPERIAL</h1>
                    <p className="text-lg text-white/90 drop-shadow-md">Trading Community</p>
                    </div>
                </div>
            </div>

            <Card className="glass-effect border-default">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-primary text-center">Request Community Access</CardTitle>
                    <p className="text-secondary text-center">Fill out the form below. An admin will review your request shortly.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                    {status.message && (
                        <div className={`p-3 rounded-md flex items-center gap-2 text-sm ${
                            status.type === 'success' 
                            ? 'bg-green-500/10 border border-green-500/20 text-green-300' 
                            : 'bg-red-500/10 border border-red-500/20 text-red-300'
                        }`}>
                            {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                            {status.message}
                        </div>
                    )}

                    {status.type !== 'success' && (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input name="full_name" placeholder="Full Name" value={formData.full_name} onChange={handleInputChange} className="pl-10 bg-white border-gray-300 text-gray-900" required />
                            </div>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <Input name="email" type="email" placeholder="Email Address" value={formData.email} onChange={handleInputChange} className="pl-10 bg-white border-gray-300 text-gray-900" required />
                            </div>
                            <div>
                                <Select onValueChange={handleSelectChange} defaultValue="user">
                                    <SelectTrigger className="w-full bg-white border-gray-300 text-gray-900">
                                        <div className="flex items-center gap-3">
                                            <Shield className="w-5 h-5 text-gray-400" />
                                            <SelectValue placeholder="Select account type" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="user">Standard Member</SelectItem>
                                        <SelectItem value="admin">Educator / IB Partner</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="relative">
                                <Textarea name="reason" placeholder="Briefly state why you want to join (e.g., 'Referred by John Doe', 'Interested in IB program', etc.)" value={formData.reason} onChange={handleInputChange} className="bg-white border-gray-300 text-gray-900" rows={3} required />
                            </div>
                            <Button type="submit" disabled={isLoading} className="w-full bg-accent-green hover:bg-green-500 text-white font-semibold py-3 h-12">
                                {isLoading ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" /> : <><Send className="w-4 h-4 mr-2" /> Submit Request</>}
                            </Button>
                        </form>
                    )}

                    <div className="pt-2">
                        <Link to={createPageUrl('AccessPortal')}>
                            <Button variant="outline" className="w-full border-white/20 text-white/80 hover:bg-white/10">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Login
                            </Button>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
      
      <style>{`
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
