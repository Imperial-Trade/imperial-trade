import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User } from '@/api/entities';
import { Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react';

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('social');
  const [error, setError] = useState('');

  // Password login form state
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  // Registration form state
  const [registerForm, setRegisterForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  });

  const handleSocialLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      await User.login();
    } catch (error) {
      console.error('Social login failed:', error);
      setError('Social login failed. Please try again.');
    }
    setIsLoading(false);
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // This would need to be implemented by Base44 platform
      // await User.login({ 
      //   email: loginForm.email, 
      //   password: loginForm.password,
      //   method: 'password'
      // });
      
      // For now, show message that this requires platform support
      setError('Password-based login requires Base44 platform support. Please use social login for now.');
      
    } catch (error) {
      setError('Login failed. Please check your credentials.');
    }
    setIsLoading(false);
  };

  const handlePasswordRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (registerForm.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }

    try {
      // This would need to be implemented by Base44 platform
      // await User.register({
      //   email: registerForm.email,
      //   password: registerForm.password,
      //   full_name: registerForm.fullName
      // });
      
      setError('Password-based registration requires Base44 platform support. Please use social login for now.');
      
    } catch (error) {
      setError('Registration failed. Please try again.');
    }
    setIsLoading(false);
  };

  return (
    <Card className="glass-effect border-default w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-primary">Welcome Back</CardTitle>
        <p className="text-secondary">Sign in to your trading account</p>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="social">Social Login</TabsTrigger>
            <TabsTrigger value="password">Email & Password</TabsTrigger>
          </TabsList>

          {/* Social Login Tab */}
          <TabsContent value="social" className="space-y-4">
            <Button
              onClick={handleSocialLogin}
              disabled={isLoading}
              className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 font-semibold py-3 flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-900 border-t-transparent" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </Button>
            
            <div className="text-center text-sm text-secondary">
              Secure and fast - no password required
            </div>
          </TabsContent>

          {/* Password Login Tab */}
          <TabsContent value="password">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Sign Up</TabsTrigger>
              </TabsList>

              {/* Login Form */}
              <TabsContent value="login">
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-secondary" />
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                      className="pl-10 bg-surface border-default"
                      required
                    />
                  </div>
                  
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-secondary" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                      className="pl-10 pr-10 bg-surface border-default"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-secondary hover:text-primary"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-accent-green hover:bg-green-500 text-white"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                        Signing In...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Registration Form */}
              <TabsContent value="register">
                <form onSubmit={handlePasswordRegister} className="space-y-4">
                  <Input
                    type="text"
                    placeholder="Full Name"
                    value={registerForm.fullName}
                    onChange={(e) => setRegisterForm({...registerForm, fullName: e.target.value})}
                    className="bg-surface border-default"
                    required
                  />
                  
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-5 h-5 text-secondary" />
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({...registerForm, email: e.target.value})}
                      className="pl-10 bg-surface border-default"
                      required
                    />
                  </div>
                  
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-5 h-5 text-secondary" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({...registerForm, password: e.target.value})}
                      className="pl-10 pr-10 bg-surface border-default"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-secondary hover:text-primary"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  <Input
                    type="password"
                    placeholder="Confirm Password"
                    value={registerForm.confirmPassword}
                    onChange={(e) => setRegisterForm({...registerForm, confirmPassword: e.target.value})}
                    className="bg-surface border-default"
                    required
                  />

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-accent-green hover:bg-green-500 text-white"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                        Creating Account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-accent-red" />
            <p className="text-sm text-accent-red">{error}</p>
          </div>
        )}

        <div className="mt-6 text-center">
          <p className="text-xs text-secondary">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </CardContent>
    </Card>
  );
}