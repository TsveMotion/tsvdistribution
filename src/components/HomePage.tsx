'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from './auth/AuthModal';
import Dashboard from './Dashboard';
import { 
  CubeIcon, 
  ClipboardDocumentListIcon, 
  TruckIcon, 
  DocumentTextIcon
} from '@heroicons/react/24/outline';

export default function HomePage() {
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleSignIn = () => {
    setAuthModalOpen(true);
  };

  if (user) {
    return <Dashboard />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between p-6">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
            <CubeIcon className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            TsvDistribution
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleSignIn}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
        <h1 className="text-6xl md:text-8xl font-bold mb-6">
          <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
            Future of
          </span>
          <br />
          <span className="text-white">Inventory</span>
        </h1>
        
        <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-3xl">
          Exclusive inventory management solution with real-time tracking, 
          automated invoicing, and intelligent warehouse optimization.
        </p>

        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <button
            onClick={handleSignIn}
            className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg shadow-cyan-500/25"
          >
            Access System
          </button>
        </div>
        <div className="mt-4 text-sm text-gray-400">
          <p>🔒 Invite Only Access</p>
        </div>
      </div>

      {/* Features Grid */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 pb-20">
        <h2 className="text-4xl font-bold text-center mb-16 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Powerful Features
        </h2>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={<CubeIcon className="h-8 w-8" />}
            title="Smart Inventory"
            description="Real-time product tracking with intelligent stock level management and location mapping."
          />
          <FeatureCard
            icon={<TruckIcon className="h-8 w-8" />}
            title="Order Tracking"
            description="Advanced order tracking system similar to Everi, Royal Mail, and Track17 with live updates."
          />
          <FeatureCard
            icon={<DocumentTextIcon className="h-8 w-8" />}
            title="Auto Invoicing"
            description="Automated invoice generation with TsvDistribution branding and printable formats."
          />
          <FeatureCard
            icon={<ClipboardDocumentListIcon className="h-8 w-8" />}
            title="Warehouse Management"
            description="Complete warehouse location tracking and product placement optimization."
          />
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode="login"
      />
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 hover:border-cyan-500/30 transition-all duration-300 transform hover:scale-105">
      <div className="text-cyan-400 mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-3 text-white">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
