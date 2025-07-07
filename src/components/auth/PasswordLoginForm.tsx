import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff, Mail, Lock, User, AlertCircle } from 'lucide-react';

export default function PasswordLoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('login');
  const [error, setError] = useState('');

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

  const handleLogin = async (e) => {
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
      // THIS WOULD NEED BASE44 PLATFORM SUPPORT
      // await User.login({ 
      //   email: loginForm.email, 
      //   password: loginForm.password,
      //   method: 'password'
      // });
      
      setError('❌ Password-based login requires Base44 platform support. This is currently not available.');
      
    } catch (error) {
      setError('Login failed. Please check your credentials.');
    }
    setIsLoading(false);
  };

  const handleRegister = async (e) => {
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
      // THIS WOULD NEED BASE44 PLATFORM SUPPORT
      // await User.register({
      //   email: registerForm.email,
      //   password: registerForm.password,
      //   full_name: registerForm.fullName
      // });
      
      setError('❌ Password-based registration requires Base44 platform support. This is currently not available.');
      
    } catch (error) {
      setError('Registration failed. Please try again.');
    }
    setIsLoading(false);
  };

  return (
    <Card className="bg-white/95 backdrop-blur-md border border-white/20 shadow-2xl w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-gray-900">
          {activeTab === 'login' ? 'Welcome Back' : 'Create Account'}
        </CardTitle>
        <p className="text-gray-600">
          {activeTab === 'login' ? 'Sign in to your account' : 'Join our trading community'}
        </p>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
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
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm(prev => ({...prev, email: e.target.value}))}
                    className="pl-10 bg-white border-gray-300 text-gray-900"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({...prev, password: e.target.value}))}
                    className="pl-10 pr-10 bg-white border-gray-300 text-gray-900"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input type="checkbox" className="rounded border-gray-300 text-green-600 mr-2" />
                  <span className="text-sm text-gray-600">Remember me</span>
                </label>
                <a href="#" className="text-sm text-green-600 hover:text-green-500">
                  Forgot password?
                </a>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
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
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Enter your full name"
                    value={registerForm.fullName}
                    onChange={(e) => setRegisterForm(prev => ({...prev, fullName: e.target.value}))}
                    className="pl-10 bg-white border-gray-300 text-gray-900"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm(prev => ({...prev, email: e.target.value}))}
                    className="pl-10 bg-white border-gray-300 text-gray-900"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm(prev => ({...prev, password: e.target.value}))}
                    className="pl-10 pr-10 bg-white border-gray-300 text-gray-900"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500">Must be at least 8 characters long</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={registerForm.confirmPassword}
                    onChange={(e) => setRegisterForm(prev => ({...prev, confirmPassword: e.target.value}))}
                    className="pl-10 pr-10 bg-white border-gray-300 text-gray-900"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-green-600 mr-2" required />
                <label className="text-sm text-gray-600">
                  I agree to the <a href="#" className="text-green-600 hover:text-green-500">Terms of Service</a> and <a href="#" className="text-green-600 hover:text-green-500">Privacy Policy</a>
                </label>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3"
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

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Secure login powered by Imperial Trading Community
          </p>
        </div>
      </CardContent>
    </Card>
  );
}