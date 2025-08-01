'use client';

import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import LoginForm from './LoginForm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login';
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  if (!isOpen) return null;

  const handleSuccess = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative max-w-md w-full">
        <button
          onClick={onClose}
          className="absolute -top-4 -right-4 bg-slate-800 hover:bg-slate-700 text-white rounded-full p-2 transition-colors z-10"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
        
        <LoginForm onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
