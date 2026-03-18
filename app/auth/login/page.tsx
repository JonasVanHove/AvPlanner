// =====================================================
// Auth - Login Page
// =====================================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LoginForm } from '@/components/auth/login-form';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // User already logged in, redirect
        const savedRedirect = localStorage.getItem('redirectAfterLogin');
        if (savedRedirect) {
          localStorage.removeItem('redirectAfterLogin');
          router.push(savedRedirect);
        } else {
          router.push('/');
        }
        return;
      }

      // Get saved redirect URL if any
      const saved = localStorage.getItem('redirectAfterLogin');
      setRedirectUrl(saved);
      setIsLoading(false);
    };

    checkAuth();
  }, [router]);

  const handleLoginSuccess = () => {
    // Get the saved redirect URL
    const savedRedirect = localStorage.getItem('redirectAfterLogin');
    localStorage.removeItem('redirectAfterLogin');
    
    // Redirect to saved URL or home
    router.push(savedRedirect || '/');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">AvPlanner</h1>
          <p className="text-slate-600">Login to your account</p>
          {redirectUrl && (
            <p className="text-sm text-slate-500 mt-2">
              You'll be redirected to {redirectUrl}
            </p>
          )}
        </div>
        
        <LoginFormWithRedirect onSuccess={handleLoginSuccess} />
        
        <div className="mt-6 text-center">
          <p className="text-slate-600">
            Don't have an account?{' '}
            <button
              onClick={() => router.push('/auth/signup')}
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// Wrapper component that handles login with redirect
function LoginFormWithRedirect({ onSuccess }: { onSuccess: () => void }) {
  const [showForm, setShowForm] = useState(true);

  const handleClose = () => {
    onSuccess();
  };

  return (
    <div>
      <LoginForm 
        onClose={handleClose}
        onSwitchToRegister={() => {
          // Store redirect for signup flow
        }}
        onSwitchToForgotPassword={() => {
          // Handle forgot password
        }}
      />
    </div>
  );
}
