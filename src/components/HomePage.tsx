'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from './auth/AuthModal';
import Dashboard from './Dashboard';
import { 
  CubeIcon, 
  ClipboardDocumentListIcon, 
  TruckIcon, 
  DocumentTextIcon,
  ArrowRightIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

export default function HomePage() {
  const { user } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const handleSignIn = () => {
    setAuthModalOpen(true);
  };

  const handleRequestInvite = () => {
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

      {/* Header / Navigation */}
      <header className="relative z-10">
        <nav className="mx-auto max-w-7xl flex items-center justify-between p-6">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
              <CubeIcon className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              TsvStock
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRequestInvite}
              className="px-4 py-2 rounded-xl border border-cyan-500/30 text-slate-200 hover:bg-cyan-500/10 transition-all"
              aria-label="Request an invite"
            >
              Request Invite
            </button>
            <button
              onClick={handleSignIn}
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105"
              aria-label="Sign in"
            >
              Sign In
            </button>
          </div>
        </nav>
      </header>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center min-h-[70vh] text-center px-6">
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
              The Future of
            </span>
            <br />
            <span className="text-white">Inventory Management</span>
          </h1>

          <p className="text-lg md:text-2xl text-slate-300 mb-8 max-w-3xl">
            Real-time stock visibility, barcode-powered operations, automated invoicing, and smart warehouse locations.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={handleSignIn}
              className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-xl font-semibold text-lg transition-all duration-200 transform hover:scale-105 shadow-lg shadow-cyan-500/25"
            >
              Access System
            </button>
            <button
              onClick={handleRequestInvite}
              className="px-8 py-4 rounded-xl border border-cyan-500/30 text-slate-200 hover:bg-cyan-500/10 transition-all text-lg inline-flex items-center gap-2"
            >
              Request Invite
              <ArrowRightIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-5 text-sm text-gray-400 inline-flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-cyan-400" />
            <p>Enterprise-grade security • Invite-only access</p>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="max-w-6xl mx-auto px-6 py-10">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
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
              description="Advanced order tracking with live updates similar to leading carriers."
            />
            <FeatureCard
              icon={<DocumentTextIcon className="h-8 w-8" />}
              title="Auto Invoicing"
              description="Automated invoice generation with TsvStock branding and printable formats."
            />
            <FeatureCard
              icon={<ClipboardDocumentListIcon className="h-8 w-8" />}
              title="Warehouse Management"
              description="Complete location tracking and product placement optimization."
            />
          </div>
        </section>

        {/* How it Works */}
        <section className="max-w-6xl mx-auto px-6 pb-8">
          <h3 className="text-2xl md:text-3xl font-semibold text-center mb-10 text-white">How it works</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <StepCard step="1" title="Scan & Receive" desc="Use barcode scanning to receive inventory instantly and assign warehouse locations." />
            <StepCard step="2" title="Pick & Pack" desc="Guided picking lists and packing flows reduce errors and speed up fulfillment." />
            <StepCard step="3" title="Invoice & Track" desc="Generate invoices automatically and track orders until delivered." />
          </div>
        </section>

        {/* Stats */}
        <section className="max-w-6xl mx-auto px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <Stat value="99.9%" label="Stock Accuracy" />
            <Stat value="3x" label="Faster Picking" />
            <Stat value="-40%" label="Fewer Errors" />
            <Stat value="24/7" label="Real-time Sync" />
          </div>
        </section>

        {/* CTA Strip */}
        <section className="max-w-6xl mx-auto px-6 pb-16">
          <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/40 backdrop-blur p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-xl md:text-2xl font-semibold">Ready to streamline your operations?</h4>
              <p className="text-slate-300">Join TsvStock and manage your inventory like a pro.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleRequestInvite} className="px-5 py-3 rounded-xl border border-cyan-500/30 text-slate-200 hover:bg-cyan-500/10 transition-all">Request Invite</button>
              <button onClick={handleSignIn} className="px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-xl font-semibold">Sign In</button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/60 bg-black/20">
        <div className="max-w-6xl mx-auto px-6 py-8 text-sm text-slate-400 flex flex-col md:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} TsvStock. All rights reserved.</p>
          <div className="flex gap-4">
            <a className="hover:text-slate-300" href="#features">Features</a>
            <a className="hover:text-slate-300" href="#">Privacy</a>
            <a className="hover:text-slate-300" href="#">Terms</a>
          </div>
        </div>
      </footer>

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

function StepCard({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-700/40 rounded-2xl p-6">
      <div className="mb-3 inline-flex items-center justify-center w-10 h-10 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
        {step}
      </div>
      <h4 className="text-lg font-semibold text-white mb-2">{title}</h4>
      <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-slate-700/40 bg-slate-900/40 backdrop-blur p-6 text-center">
      <div className="text-3xl font-bold text-white">{value}</div>
      <div className="text-slate-400 mt-1 text-sm">{label}</div>
    </div>
  );
}
