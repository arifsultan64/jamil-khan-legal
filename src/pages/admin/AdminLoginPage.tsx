import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { usePortal } from '../../contexts/PortalAuthContext';
import { usePageSeo } from '../../utils/seo';
import { GoogleConnectButton } from '../../components/admin/GoogleConnectButton';

export const AdminLoginPage: React.FC = () => {
  const {
    user,
    isAdmin,
    adminChecked,
    sessionWarning,
    signInWithGoogle,
    signInWithEmail,
    sendAdminPasswordReset,
    logout,
  } = usePortal();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetMode, setResetMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  usePageSeo({
    title: 'Administrator Sign In | Jameel Khan',
    description: 'Private administrator authentication for Jameel Khan Legal Research & Publications.',
    canonicalPath: '/admin/login',
  });

  useEffect(() => {
    if (adminChecked && user && isAdmin) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [adminChecked, user, isAdmin, navigate]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setInfoMsg('');
    try {
      if (resetMode) {
        await sendAdminPasswordReset(email);
        setInfoMsg('Password reset email dispatched if the administrator email is registered.');
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/operation-not-allowed') {
        setErrorMsg(
          'Email/Password sign-in is not yet enabled in Firebase Console -> Authentication -> Sign-in method. Please use Google Sign-In below or enable Email/Password in Firebase Console.'
        );
      } else {
        setErrorMsg(err?.message || 'Authentication failed. Check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] flex flex-col justify-center px-4 py-12">
      <div className="max-w-md w-full mx-auto bg-white border border-slate-200 rounded-md p-8">
        <div className="pb-6 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-[#164937] mb-2">
            <ShieldCheck className="w-4 h-4" />
            Restricted Access
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#0F2342]">
            Administrator Sign In
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Private publishing console for Jameel Khan. Public registration is disabled.
          </p>
        </div>

        {sessionWarning && (
          <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{sessionWarning}</span>
          </div>
        )}

        {adminChecked && user && !isAdmin && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md space-y-3">
            <p className="text-xs font-semibold text-red-900">
              Unauthorized Account ({user.email})
            </p>
            <p className="text-xs text-red-800 leading-relaxed">
              This account is not listed in the authorized administrators registry. Only verified administrator accounts may access the CMS.
            </p>
            <button
              type="button"
              onClick={() => logout()}
              className="px-3.5 py-2 text-xs font-medium text-white bg-red-800 rounded cursor-pointer"
            >
              Sign Out and Switch Account
            </button>
          </div>
        )}

        {/* Primary Verified Google Sign-In (also links Google Drive) */}
        <GoogleConnectButton
          onClick={handleGoogleSignIn}
          disabled={loading}
          label="Sign in with Google & Link Drive"
          className="w-full py-3"
        />

        <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
          <div className="flex-1 h-px bg-slate-200" />
          <span>or Email &amp; Password</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div>
            <label htmlFor="admin-email" className="block text-xs font-medium text-slate-700 mb-1">
              Administrator Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="admin-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@domain.com"
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0F2342]"
              />
            </div>
          </div>

          {!resetMode && (
            <div>
              <label htmlFor="admin-password" className="block text-xs font-medium text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="admin-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0F2342]"
                />
              </div>
            </div>
          )}

          {errorMsg && <p className="text-xs text-red-700 leading-relaxed">{errorMsg}</p>}
          {infoMsg && <p className="text-xs text-[#164937] leading-relaxed">{infoMsg}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 text-sm font-medium text-[#0F2342] bg-[#F4F0E8] border border-slate-300 rounded-md hover:border-[#0F2342] transition-colors disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Processing...' : resetMode ? 'Send Password Reset Email' : 'Sign In with Email'}
          </button>

          <div className="flex items-center justify-between text-xs pt-2">
            <button
              type="button"
              onClick={() => {
                setResetMode((r) => !r);
                setErrorMsg('');
                setInfoMsg('');
              }}
              className="text-slate-600 hover:text-[#0F2342] cursor-pointer"
            >
              {resetMode ? 'Back to Sign In' : 'Forgot password?'}
            </button>
            <Link to="/" className="text-[#0F2342] font-medium hover:underline">
              &larr; Return to Public Portal
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
