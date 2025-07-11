'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { setAuthToken, setUser, isAuthenticated } from '@/lib/auth';

export default function AuthPage() {
  const [showLogin, setShowLogin] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';

  useEffect(() => {
    // If already authenticated, redirect immediately
    if (isAuthenticated()) {
      router.push(redirectTo);
    }
  }, [router, redirectTo]);

  const handleAuthSuccess = (token: string, user: any) => {
    // Store auth data
    setAuthToken(token);
    setUser(user);
    
    // Redirect to original destination or home
    router.push(redirectTo);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {showLogin ? (
          <LoginForm
            onSuccess={handleAuthSuccess}
            onRegisterClick={() => setShowLogin(false)}
          />
        ) : (
          <RegisterForm
            onSuccess={handleAuthSuccess}
            onLoginClick={() => setShowLogin(true)}
          />
        )}
      </div>
    </div>
  );
}