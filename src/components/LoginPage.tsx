import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { loginApi } from '../services/authService';
import { AppUser } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: AppUser) => void;
  initialError?: string | null;
  customLogoUrl?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  initialError,
  customLogoUrl
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError || null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await loginApi(email.trim(), password);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setErrorMessage(result.error || 'Invalid email or password');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-radial from-slate-50 via-slate-100 to-slate-200 px-4 py-12 relative overflow-hidden">
      {/* Background Decorative Rings */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-red-100/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-red-200/40 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-8 sm:p-10 relative z-10 animate-in fade-in duration-200">
        {/* Brand & Logo Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="mb-3">
            <BrandLogo 
              customLogoUrl={customLogoUrl} 
              allowUploadDirectly={false}
              size="lg"
            />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
            Sign In to Outreach Flow
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">
            Access your multi-channel sales campaigns, automated sequences, and leads.
          </p>
        </div>

        {/* Error Notification Banner */}
        {errorMessage && (
          <div 
            id="login-error-alert"
            className="mb-6 p-3.5 bg-red-50 border border-red-200/90 rounded-2xl flex items-start gap-3 animate-in shake duration-200"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="text-xs font-semibold text-red-800 leading-relaxed flex-1">
              {errorMessage}
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Work Email
            </label>
            <div className="relative">
              <input
                id="login-email-input"
                type="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                disabled={isLoading}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium disabled:opacity-60"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Password Field with Show/Hide Toggle */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Password
              </label>
            </div>
            <div className="relative">
              <input
                id="login-password-input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                disabled={isLoading}
                className="w-full pl-10 pr-11 py-2.5 bg-slate-50/70 border border-slate-300 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-medium disabled:opacity-60"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
              <button
                type="button"
                id="toggle-password-visibility"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3 top-2.5 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              id="login-submit-button"
              type="submit"
              disabled={isLoading || !email.trim() || !password}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-red-600 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm rounded-xl shadow-sm shadow-red-600/30 transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Security Footer Notice */}
        <div className="mt-8 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>Stateless 256-bit encrypted session security</span>
        </div>
      </div>
    </div>
  );
};
