'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import TextLogo from '@/components/TextLogo';
import Footer from '@/components/Footer';

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!token) {
      setError('Invalid or missing reset token');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await api.resetPassword(token, password);
      setMessage('Your password has been reset successfully. You can now sign in.');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <TextLogo size="lg" variant="dark" className="mx-auto mb-2" />
            <p className="text-gray-600">Create a new password</p>
          </div>

          <div className="bg-black rounded-2xl shadow-2xl p-8 border border-gray-800">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Reset password</h2>
              <p className="text-gray-400">Enter and confirm your new password</p>
            </div>

            {message && (
              <div className="mb-6 bg-green-900/30 border border-green-500/50 text-green-200 px-4 py-3 rounded-lg">
                {message} <Link href="/login" className="underline text-green-300 ml-1">Sign in</Link>
              </div>
            )}
            {error && (
              <div className="mb-6 bg-red-900/30 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder-gray-500"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm password
                </label>
                <input
                  id="confirm"
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder-gray-500"
                  placeholder="••••••••"
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !token}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? 'Resetting…' : 'Reset password'}
              </button>
          
              <div className="text-center text-sm text-gray-400">
                <Link href="/login" className="text-blue-400 hover:text-blue-300">Back to login</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}
