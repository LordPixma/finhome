'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import TextLogo from '@/components/TextLogo';
import Footer from '@/components/Footer';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsLoading(true);

    try {
      await api.requestPasswordReset(email);
      setMessage('If the email exists, a reset link has been sent. Please check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link');
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
            <p className="text-gray-600">Reset your password</p>
          </div>

          <div className="bg-black rounded-2xl shadow-2xl p-8 border border-gray-800">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Forgot password</h2>
              <p className="text-gray-400">Enter your email and we'll send you a reset link</p>
            </div>

            {message && (
              <div className="mb-6 bg-green-900/30 border border-green-500/50 text-green-200 px-4 py-3 rounded-lg">
                {message}
              </div>
            )}
            {error && (
              <div className="mb-6 bg-red-900/30 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder-gray-500"
                  placeholder="you@example.com"
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 focus:ring-4 focus:ring-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? 'Sending…' : 'Send reset link'}
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
