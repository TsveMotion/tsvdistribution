'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { GoogleOAuth, type GoogleUser } from '@/lib/google-oauth';

interface LoginFormProps {
  onSuccess: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, loginWithGoogle } = useAuth();
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const googleOAuth = GoogleOAuth.getInstance();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        onSuccess();
      } else {
        setError('Invalid email or password');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (googleUser: GoogleUser) => {
    setError('');
    setGoogleLoading(true);

    try {
      const result = await loginWithGoogle(googleUser.googleId, googleUser.email, googleUser.name);
      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || 'Google login failed');
      }
    } catch (_error) {
      setError('An error occurred during Google login. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    const initializeGoogleButton = async () => {
      if (googleButtonRef.current) {
        try {
          await googleOAuth.renderButton(googleButtonRef.current, handleGoogleSuccess);
        } catch (_error) {
          console.error('Failed to initialize Google button:', _error);
        }
      }
    };

    initializeGoogleButton();
  }, []); // Simplified dependencies since handleGoogleSuccess is stable

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-cyan-500/20 rounded-2xl p-8 shadow-2xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Welcome Back
        </h2>
        <p className="text-slate-400 mt-2">Sign in to access TsvDistribution</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-slate-400"
            placeholder="Enter your email"
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-slate-400 pr-12"
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
            >
              {showPassword ? (
                <EyeSlashIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Signing in...
            </div>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-slate-900 text-slate-400">Or continue with</span>
          </div>
        </div>
        
        <div className="mt-6">
          {googleLoading ? (
            <div className="w-full bg-slate-800/50 border border-slate-600 rounded-xl py-3 px-4 flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              <span className="text-white">Signing in with Google...</span>
            </div>
          ) : (
            <div ref={googleButtonRef} className="w-full flex justify-center"></div>
          )}
        </div>
      </div>

      <div className="mt-6 text-center">
        <p className="text-slate-400 text-sm">
          🔒 Invite Only System - Contact administrator for access
        </p>
      </div>
    </div>
  );
}
