'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { GoogleOAuth, type GoogleUser } from '@/lib/google-oauth';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  googleId?: string;
  googleEmail?: string;
}

export default function Settings() {
  const [user, setUser] = useState<User | null>(null);
  const [googleLinking, setGoogleLinking] = useState(false);
  const [linkingError, setLinkingError] = useState('');
  const [linkingSuccess, setLinkingSuccess] = useState('');
  const googleButtonRef = useRef<HTMLDivElement>(null);
  
  // Change password state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    // Get current user from localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleGoogleLink = useCallback(async (googleUser: GoogleUser) => {
    if (!user) return;
    
    setLinkingError('');
    setLinkingSuccess('');
    setGoogleLinking(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          googleId: googleUser.googleId,
          email: googleUser.email,
          name: googleUser.name,
          action: 'link',
          userId: user.id
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setLinkingSuccess('Google account linked successfully!');
        // Update user data in localStorage and state
        const updatedUser: User = { 
          ...user, 
          googleId: googleUser.googleId, 
          googleEmail: googleUser.email 
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      } else {
        setLinkingError(data.error || 'Failed to link Google account');
      }
    } catch {
      setLinkingError('An error occurred while linking your Google account');
    } finally {
      setGoogleLinking(false);
    }
  }, [user]);

  useEffect(() => {
    // Initialize Google button for linking
    const initializeGoogleButton = async () => {
      if (googleButtonRef.current && user && !user.googleId) {
        try {
          const googleOAuth = GoogleOAuth.getInstance();
          await googleOAuth.renderButton(googleButtonRef.current, handleGoogleLink);
        } catch {
          console.error('Failed to initialize Google button');
        }
      }
    };

    initializeGoogleButton();
  }, [user, handleGoogleLink]);



  const handleUnlinkGoogle = async () => {
    if (!user) return;
    
    setLinkingError('');
    setLinkingSuccess('');
    setGoogleLinking(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/google', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user.id
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setLinkingSuccess('Google account unlinked successfully!');
        // Update user data in localStorage and state
        const updatedUser: User = { ...user };
        delete updatedUser.googleId;
        delete updatedUser.googleEmail;
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
      } else {
        setLinkingError(data.error || 'Failed to unlink Google account');
      }
    } catch {
      setLinkingError('An error occurred while unlinking your Google account');
    } finally {
      setGoogleLinking(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setPasswordChanging(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordSuccess('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowChangePassword(false);
      } else {
        setPasswordError(data.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      setPasswordError('An error occurred while changing your password');
    } finally {
      setPasswordChanging(false);
    }
  };

  if (!user) {
    return (
      <div>
        <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Settings
        </h2>
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-8">
          <p className="text-slate-400 text-center">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
        Settings
      </h2>
      
      <div className="space-y-6">
        {/* Account Information */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Account Information</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-400">Name</label>
              <p className="text-white">{user.name}</p>
            </div>
            <div>
              <label className="text-sm text-slate-400">Email</label>
              <p className="text-white">{user.email}</p>
            </div>
            <div>
              <label className="text-sm text-slate-400">Role</label>
              <p className="text-white capitalize">{user.role}</p>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Security</h3>
          
          {passwordError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
              <p className="text-red-400 text-sm">{passwordError}</p>
            </div>
          )}
          
          {passwordSuccess && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-4">
              <p className="text-green-400 text-sm">{passwordSuccess}</p>
            </div>
          )}

          {!showChangePassword ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl">
                <div>
                  <p className="text-white font-medium">Password</p>
                  <p className="text-slate-400 text-sm">Change your account password</p>
                </div>
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl transition-colors"
                >
                  Change Password
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-slate-400 pr-12"
                    placeholder="Enter current password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showCurrentPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-slate-400 pr-12"
                    placeholder="Enter new password (min 6 characters)"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showNewPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-slate-400 pr-12"
                    placeholder="Confirm new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={passwordChanging}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {passwordChanging ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Changing...
                    </div>
                  ) : (
                    'Change Password'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePassword(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError('');
                  }}
                  className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Google Account Linking */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Google Account</h3>
          
          {linkingError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
              <p className="text-red-400 text-sm">{linkingError}</p>
            </div>
          )}
          
          {linkingSuccess && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-4">
              <p className="text-green-400 text-sm">{linkingSuccess}</p>
            </div>
          )}

          {user.googleId ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl">
                <div>
                  <p className="text-white font-medium">Google Account Linked</p>
                  <p className="text-slate-400 text-sm">{user.googleEmail}</p>
                </div>
                <div className="text-green-400">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <button
                onClick={handleUnlinkGoogle}
                disabled={googleLinking}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {googleLinking ? 'Unlinking...' : 'Unlink Google Account'}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-slate-400 text-sm">
                Link your Google account to enable single sign-on and faster login.
              </p>
              {googleLinking ? (
                <div className="w-full bg-slate-700/50 border border-slate-600 rounded-xl py-3 px-4 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  <span className="text-white">Linking Google account...</span>
                </div>
              ) : (
                <div ref={googleButtonRef} className="flex justify-start"></div>
              )}
            </div>
          )}
        </div>

        {/* Application Preferences */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Preferences</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl">
              <div>
                <p className="text-white font-medium">Theme</p>
                <p className="text-slate-400 text-sm">Dark theme (default)</p>
              </div>
              <div className="text-slate-500">
                <span className="text-sm">Coming soon</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl">
              <div>
                <p className="text-white font-medium">Notifications</p>
                <p className="text-slate-400 text-sm">System notifications and alerts</p>
              </div>
              <div className="text-slate-500">
                <span className="text-sm">Coming soon</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl">
              <div>
                <p className="text-white font-medium">Language</p>
                <p className="text-slate-400 text-sm">English (default)</p>
              </div>
              <div className="text-slate-500">
                <span className="text-sm">Coming soon</span>
              </div>
            </div>
          </div>
        </div>

        {/* Session Management */}
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Session</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-xl">
              <div>
                <p className="text-white font-medium">Current Session</p>
                <p className="text-slate-400 text-sm">Logged in as {user.email}</p>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem('token');
                  localStorage.removeItem('user');
                  window.location.reload();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
