import React, { useState } from 'react';
import { ApiClient } from '../lib/api.ts';
import { User } from '../types/index.ts';
import { Lock, Mail, Building, UserPlus, LogIn, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { auth, googleProvider, signInWithPopup, syncUserToFirestore } from '../lib/firebase.ts';

interface LoginModalProps {
  isOpen: boolean;
  onSuccess: (user: User) => void;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onSuccess, onClose }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('mussamatembo3@gmail.com');
  const [password, setPassword] = useState('Password123!');
  const [orgName, setOrgName] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+255710000111');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;

      const res = await ApiClient.post('/api/v1/auth/firebase-login', {
        email: fbUser.email,
        name: fbUser.displayName || fbUser.email?.split('@')[0],
        uid: fbUser.uid,
      });

      ApiClient.setToken(res.token);

      // Persist to Firestore as required by system instructions
      await syncUserToFirestore({
        id: fbUser.uid,
        email: res.user.email,
        name: res.user.name,
        role: res.user.role,
        organizationId: res.user.organizationId,
      }).catch((e) => console.warn('Firestore user sync warning:', e));

      onSuccess(res.user);
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      setError(err.message || 'Google Authentication failed. Please check popup permissions.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        const res = await ApiClient.post('/api/v1/auth/register', {
          orgName,
          name,
          email,
          password,
          phone,
        });
        ApiClient.setToken(res.token);
        onSuccess(res.user);
      } else {
        const res = await ApiClient.post('/api/v1/auth/login', {
          email,
          password,
        });
        ApiClient.setToken(res.token);
        onSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600/20 text-indigo-400 mb-3 border border-indigo-500/30">
            {isRegister ? <UserPlus className="w-6 h-6" /> : <Lock className="w-6 h-6" />}
          </div>
          <h2 className="text-2xl font-bold text-white">
            {isRegister ? 'Register ISP Organization' : 'Sign In to XCLOUD.NET'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {isRegister
              ? 'Start your 30-day trial with 5 devices included'
              : 'Access your Hotspot Billing & Router Console'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg flex items-center gap-2 text-sm text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Real Google Sign-In with Firebase Auth */}
        <div className="mb-4">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-900 font-medium py-2.5 px-4 rounded-xl shadow-md border border-slate-200 transition cursor-pointer disabled:opacity-50"
          >
            {googleLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-slate-700" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>
              {googleLoading
                ? 'Authenticating with Google...'
                : 'Sign In with Google (Auto Auth Admin)'}
            </span>
          </button>
          <div className="flex items-center gap-1.5 justify-center mt-2 text-[11px] text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>mussamatembo3@gmail.com auto-authenticates as Special Admin</span>
          </div>
        </div>

        <div className="relative flex py-2 items-center mb-4">
          <div className="grow border-t border-slate-800"></div>
          <span className="shrink mx-3 text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
            or continue with credentials
          </span>
          <div className="grow border-t border-slate-800"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Organization / Business Name
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Serengeti Wi-Fi Networks"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-3 text-sm text-white focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Juma Kassim"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@isp.co.tz"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-3 text-sm text-white focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-3 text-sm text-white focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Phone Number (Tanzania)
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+255710000000"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              'Authenticating...'
            ) : isRegister ? (
              <>
                <UserPlus className="w-4 h-4" /> Register Organization
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" /> Sign In
              </>
            )}
          </button>
        </form>

        {/* Quick select presets */}
        {!isRegister && (
          <div className="mt-4 pt-4 border-t border-slate-800 text-center">
            <span className="text-xs font-semibold text-slate-400 block mb-2">
              Select Demo Role to Test Access:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('mussamatembo3@gmail.com')}
                className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                  email === 'mussamatembo3@gmail.com'
                    ? 'bg-purple-950/60 border-purple-500 text-purple-200'
                    : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300'
                }`}
              >
                <div className="text-[11px] font-bold text-white flex items-center justify-between">
                  <span>Special Admin</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-purple-900 text-purple-300 font-mono">
                    GLOBAL
                  </span>
                </div>
                <div className="text-[10px] text-purple-300/80 mt-0.5">
                  Global Router &amp; Omada Activity
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('admin@mussatelecom.tz')}
                className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                  email === 'admin@mussatelecom.tz'
                    ? 'bg-indigo-950/60 border-indigo-500 text-indigo-200'
                    : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300'
                }`}
              >
                <div className="text-[11px] font-bold text-white flex items-center justify-between">
                  <span>Org Admin</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-900 text-indigo-300 font-mono">
                    LOCAL
                  </span>
                </div>
                <div className="text-[10px] text-indigo-300/80 mt-0.5">
                  Tenant only (No Global Activity)
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('support@xcloud.net')}
                className={`p-2 rounded-lg border text-left transition cursor-pointer ${
                  email === 'support@xcloud.net'
                    ? 'bg-blue-950/60 border-blue-500 text-blue-200'
                    : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700 text-slate-300'
                }`}
              >
                <div className="text-[11px] font-bold text-white flex items-center justify-between">
                  <span>Staff</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-blue-900 text-blue-300 font-mono">
                    LOCAL
                  </span>
                </div>
                <div className="text-[10px] text-blue-300/80 mt-0.5">
                  Operations (No Global Activity)
                </div>
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
          >
            {isRegister
              ? 'Already registered? Sign In instead'
              : "Don't have an organization? Register here"}
          </button>
        </div>
      </div>
    </div>
  );
};
