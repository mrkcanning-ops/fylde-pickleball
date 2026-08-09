'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';

export default function WelcomePage() {
  const router = useRouter();
  const { user, userType, loginAsGuest, loginClubMember, isLoading } = useAuth();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && user && userType) {
      router.push('/');
    }
  }, [user, userType, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-xl text-gray-300">Loading...</div>
      </div>
    );
  }

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await loginClubMember(loginUsername, loginPassword);
      router.push('/');
    } catch (err) {
      setError(err.error || 'Login failed');
      setIsSubmitting(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (signupPassword !== signupPasswordConfirm) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: signupUsername,
          password: signupPassword,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw err;
      }

      const data = await res.json();
      // Auto-login after signup
      await loginClubMember(signupUsername, signupPassword);
      router.push('/');
    } catch (err) {
      setError(err.error || 'Signup failed');
      setIsSubmitting(false);
    }
  };

  const handleGuestClick = () => {
    loginAsGuest();
    router.push('/');
  };

  const handleViewStandingsClick = () => {
    router.push('/view-standings');
  };

  return (
    <>
    <div 
      className="relative isolate min-h-screen overflow-hidden text-white antialiased"
      style={{
        background: `
          radial-gradient(circle at 50% 18%, rgba(85, 140, 255, 0.20), transparent 28%),
          radial-gradient(circle at 86% 14%, rgba(255,255,255,0.16), transparent 12%),
          linear-gradient(180deg, #031022 0%, #041228 28%, #05101f 100%)
        `
      }}
    >
      {/* Court lines and grain texture */}
      <div className="absolute inset-0 pointer-events-none">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.05), rgba(255,255,255,0.05)) 50% 70% / 62% 1px no-repeat,
              linear-gradient(rgba(255,255,255,0.05), rgba(255,255,255,0.05)) 50% 84% / 88% 1px no-repeat,
              linear-gradient(rgba(255,255,255,0.05), rgba(255,255,255,0.05)) 15% 77% / 1px 24% no-repeat,
              linear-gradient(rgba(255,255,255,0.05), rgba(255,255,255,0.05)) 85% 77% / 1px 24% no-repeat,
              linear-gradient(135deg, transparent 0 76%, rgba(255,255,255,0.15) 76% 77%, transparent 77% 100%)
            `,
            opacity: 1
          }}
        />
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(rgba(255,255,255,0.6) 0.55px, transparent 0.6px)`,
            backgroundSize: '8px 8px',
            mixBlendMode: 'soft-light'
          }}
        />
      </div>

      {/* Spotlight effect */}
      <div className="absolute right-6 top-28 h-28 w-28 rounded-full opacity-90" style={{
        background: 'radial-gradient(circle, rgba(255,255,255,0.80) 0%, rgba(255,255,255,0.15) 35%, rgba(255,255,255,0) 68%)',
        filter: 'blur(2px)'
      }}></div>

      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-10 pt-8">
        {/* Main Section */}
        <section className="relative flex-1 overflow-hidden rounded-[28px] border border-white/8 px-6 pb-10 pt-8 shadow-lg"
          style={{
            background: 'linear-gradient(180deg,rgba(6,25,56,0.96),rgba(3,14,30,0.98))'
          }}
        >
          {/* Decorative elements */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-0 top-0 h-48 bg-[radial-gradient(circle_at_50%_10%,rgba(84,137,255,0.26),transparent_58%)]"></div>
            <div className="absolute right-0 top-0 h-64 w-40 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0))] opacity-30"></div>
            <div className="absolute bottom-16 left-[-18%] h-40 w-72 rotate-[-24deg] rounded-full border border-white/18"></div>
            <div className="absolute right-[-12%] top-[42%] h-52 w-40 bg-[radial-gradient(circle,rgba(255,59,59,0.22),transparent_65%)] opacity-60"></div>
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Logo */}
            <div className="relative mb-7 mt-2 h-44 w-full max-w-xs">
              <div className="absolute left-1/2 top-1/2 h-[180px] w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-full" 
                style={{
                  background: 'radial-gradient(circle, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.88) 24%, rgba(255,255,255,0.38) 52%, rgba(255,255,255,0.10) 72%, rgba(255,255,255,0) 84%)',
                  filter: 'blur(10px)'
                }}
              />
              <img
                src="/fcp-logo.jpeg"
                alt="Fylde Coast Pickleball logo"
                className="relative z-10 mx-auto max-h-40 w-auto object-contain drop-shadow-lg"
              />
            </div>

            <p className="mb-2 text-base font-semibold uppercase tracking-wider text-white/90">
              Welcome to
            </p>

            <h1 className="text-5xl leading-tight font-extrabold uppercase tracking-tight text-white drop-shadow-lg mb-5">
              Fylde<br />Pickleball Club
            </h1>

            {/* Divider */}
            <div className="flex w-full max-w-xs items-center gap-3 mb-5">
              <div className="h-px flex-1 bg-red-500/80"></div>
              <div className="text-red-500 text-lg">★</div>
              <div className="h-px flex-1 bg-red-500/80"></div>
            </div>

            <p className="max-w-xs text-sm leading-6 text-white/78 mb-8">
              League nights, fixtures and standings in one place
            </p>

            {/* Buttons */}
            <div className="w-full space-y-4">
              <button
                onClick={() => setShowLoginModal(true)}
                className="group flex min-h-16 w-full items-center justify-between rounded-[18px] border border-blue-300/20 bg-blue-600 px-5 text-white shadow-lg transition duration-200 hover:bg-blue-700 active:scale-95 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/18 to-white/2 pointer-events-none"></div>
                <span className="relative flex items-center gap-4">
                  <svg className="h-7 w-7 text-white/95" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16 11a4 4 0 1 0-3.999-4A4 4 0 0 0 16 11Zm-8 1a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm8 1c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4ZM8 14c-.29 0-.62.02-.97.05C4.79 14.23 1 15.29 1 17.5V19h6v-2c0-1.16.59-2.18 1.58-3A7.09 7.09 0 0 0 8 14Z"/>
                  </svg>
                  <span className="text-base font-semibold tracking-tight">Club Member</span>
                </span>
                <svg className="relative h-6 w-6 text-white/90 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </button>

              <button
                onClick={handleGuestClick}
                className="group flex min-h-16 w-full items-center justify-between rounded-[18px] border border-emerald-200/20 bg-green-600 px-5 text-white shadow-lg transition duration-200 hover:bg-green-700 active:scale-95 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/18 to-white/2 pointer-events-none"></div>
                <span className="relative flex items-center gap-4">
                  <svg className="h-7 w-7 text-white/95" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12Zm0 2c-4 0-8 2-8 4.5V21h16v-2.5C20 16 16 14 12 14Z"/>
                  </svg>
                  <span className="text-base font-semibold tracking-tight">Guest Access</span>
                </span>
                <svg className="relative h-6 w-6 text-white/90 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </button>

              <button
                onClick={handleViewStandingsClick}
                className="group flex min-h-16 w-full items-center justify-between rounded-[18px] border border-white/14 bg-slate-900/75 px-5 text-white shadow-lg transition duration-200 hover:bg-slate-800 active:scale-95 relative overflow-hidden backdrop-blur-sm"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
                <span className="relative flex items-center gap-4">
                  <svg className="h-7 w-7 text-white/95" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 4V2H6v2H2v3a5 5 0 0 0 5 5h.1A6 6 0 0 0 11 15.92V18H8v2h8v-2h-3v-2.08A6 6 0 0 0 16.9 12H17a5 5 0 0 0 5-5V4ZM4 7V6h2v3a3 3 0 0 1-2-2Zm16 0a3 3 0 0 1-2 2V6h2Z"/>
                  </svg>
                  <span className="text-base font-semibold tracking-tight">View Standings</span>
                </span>
                <svg className="relative h-6 w-6 text-white/90 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="m9 18 6-6-6-6"/>
                </svg>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>

    {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-6">Club Member Login</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-900 text-red-200 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Username</label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-blue-500"
                  disabled={isSubmitting}
                />
              </div>

              <div className="pt-4 space-y-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  {isSubmitting ? 'Logging in...' : 'Login'}
                </button>

                <p className="text-gray-300">Don't have an account?</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowLoginModal(false);
                    setShowSignupModal(true);
                    setError('');
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  Create Account
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowLoginModal(false);
                    setError('');
                  }}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Signup Modal */}
      {showSignupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-6">Create Account</h2>

            {error && (
              <div className="mb-4 p-3 bg-red-900 text-red-200 rounded">
                {error}
              </div>
            )}

            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Username</label>
                <input
                  type="text"
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-green-500"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Password</label>
                <input
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-green-500"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Confirm Password</label>
                <input
                  type="password"
                  value={signupPasswordConfirm}
                  onChange={(e) => setSignupPasswordConfirm(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:border-green-500"
                  disabled={isSubmitting}
                />
              </div>

              <div className="pt-4 space-y-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  {isSubmitting ? 'Creating Account...' : 'Create Account'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowSignupModal(false);
                    setShowLoginModal(true);
                    setError('');
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  Back to Login
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowSignupModal(false);
                    setError('');
                  }}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
  </>
  );
}
