import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { User as UserEntity } from '@/api/entities';

export default function SocialLoginButtons() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [error, setError] = useState('');

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    setError('');
    try {
        await UserEntity.login();
        // On success, the page will redirect, so no need to set loading to false.
    } catch (err) {
        console.error("Google login failed", err);
        setError('Google login failed. Please try again or use another method.');
        setIsGoogleLoading(false);
    }
  };

  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });

  // Registration form state
  const [registerForm, setRegisterForm] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Basic validation
    if (!loginForm.email || !loginForm.password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    try {
      // Try email/password login
      await UserEntity.login({
        email: loginForm.email,
        password: loginForm.password
      });
    } catch (error) {
      console.error('Email login failed:', error);
      setError('Invalid email or password. Please try again.');
    } finally {
        setIsLoading(false);
    }
  };

  const handleEmailRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validation
    if (!registerForm.fullName || !registerForm.email || !registerForm.password || !registerForm.confirmPassword) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.email)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    try {
      // Try to register new user
      await UserEntity.register({
        email: registerForm.email,
        password: registerForm.password,
        full_name: registerForm.fullName
      });
    } catch (error) {
      console.error('Registration failed:', error);
      setError('Registration failed. Email may already be in use.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
        {/* Google Login Button */}
        <Button
            variant="outline"
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading || isLoading}
            className="w-full h-12 text-base flex items-center justify-center gap-3 border-gray-300 hover:bg-gray-50 shadow-sm"
        >
            {isGoogleLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-900 border-t-transparent" />
            ) : (
                <>
                    <svg className="w-5 h-5" role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Google</title><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.02-2.37 1.62-3.82 1.62-4.51 0-8.15-3.64-8.15-8.15s3.64-8.15 8.15-8.15c2.47 0 4.01.98 4.9 1.9l2.73-2.73C18.74 1.05 15.98 0 12.48 0 5.88 0 0 5.88 0 12.48s5.88 12.48 12.48 12.48c6.92 0 12.02-4.82 12.02-12.02 0-.8-.08-1.58-.2-2.34z"/></svg>
                    <span className="text-gray-700 font-medium">Continue with Google</span>
                </>
            )}
        </Button>

        {/* Separator */}
        <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">Or continue with email</span>
            </div>
        </div>

        {/* Email/Password Section */}
      <Tabs value={activeTab} onValueChange={(tab) => { setActiveTab(tab); setError(''); }}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="login">Sign In</TabsTrigger>
          <TabsTrigger value="register">Sign Up</TabsTrigger>
        </TabsList>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Login Tab */}
        <TabsContent value="login">
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="email"
                placeholder="Email address"
                value={loginForm.email}
                onChange={(e) => setLoginForm(prev => ({...prev, email: e.target.value}))}
                className="pl-10 bg-white border-gray-300 text-gray-900"
                required
                disabled={isLoading || isGoogleLoading}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={loginForm.password}
                onChange={(e) => setLoginForm(prev => ({...prev, password: e.target.value}))}
                className="pl-10 pr-10 bg-white border-gray-300 text-gray-900"
                required
                disabled={isLoading || isGoogleLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <Button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 h-12"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
        </TabsContent>

        {/* Register Tab */}
        <TabsContent value="register">
          <form onSubmit={handleEmailRegister} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="text"
                placeholder="Full name"
                value={registerForm.fullName}
                onChange={(e) => setRegisterForm(prev => ({...prev, fullName: e.target.value}))}
                className="pl-10 bg-white border-gray-300 text-gray-900"
                required
                disabled={isLoading || isGoogleLoading}
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type="email"
                placeholder="Email address"
                value={registerForm.email}
                onChange={(e) => setRegisterForm(prev => ({...prev, email: e.target.value}))}
                className="pl-10 bg-white border-gray-300 text-gray-900"
                required
                disabled={isLoading || isGoogleLoading}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password (min. 8 characters)"
                value={registerForm.password}
                onChange={(e) => setRegisterForm(prev => ({...prev, password: e.target.value}))}
                className="pl-10 pr-10 bg-white border-gray-300 text-gray-900"
                required
                minLength={8}
                disabled={isLoading || isGoogleLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm password"
                value={registerForm.confirmPassword}
                onChange={(e) => setRegisterForm(prev => ({...prev, confirmPassword: e.target.value}))}
                className="pl-10 pr-10 bg-white border-gray-300 text-gray-900"
                required
                disabled={isLoading || isGoogleLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <Button
              type="submit"
              disabled={isLoading || isGoogleLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 h-12"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      {/* Benefits */}
      <div className="text-center space-y-2 pt-2">
        <p className="text-xs text-gray-600">
          ✓ Secure authentication • ✓ Instant access • ✓ No spam, ever
        </p>
        <p className="text-xs text-gray-500">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}