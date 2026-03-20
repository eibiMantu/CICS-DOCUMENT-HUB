import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { Navigate, useLocation } from 'react-router-dom';
import { Globe, AlertCircle, ExternalLink, HelpCircle, RefreshCw, ShieldCheck } from 'lucide-react';

export default function Login() {
  const { user, profile, login, loading, authError } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isWebView, setIsWebView] = useState(false);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const location = useLocation();

  const displayError = error || authError;

  useEffect(() => {
    const ua = window.navigator.userAgent;
    const isMessenger = ua.indexOf('Messenger') > -1 || ua.indexOf('FBAN') > -1 || ua.indexOf('FBAV') > -1;
    const isInstagram = ua.indexOf('Instagram') > -1;
    const isLine = ua.indexOf('Line') > -1;
    const isWhatsApp = ua.indexOf('WhatsApp') > -1;
    
    if (isMessenger || isInstagram || isLine || isWhatsApp) {
      setIsWebView(true);
    }
  }, []);

  // Redirect if already logged in
  if (!loading && user) {
    if (profile) {
      const from = location.state?.from?.pathname || '/';
      return <Navigate to={from} replace />;
    } else {
      return <Navigate to="/onboarding" replace />;
    }
  }

  const handleLogin = async () => {
    setError(null);
    try {
      await login();
    } catch (err: any) {
      console.error('Login error detail:', err);
      if (err.code === 'auth/popup-blocked') {
        setError('Login popup was blocked. Please allow popups for this site or tap "Open in Browser" if you are inside an app.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError('Login request was cancelled. Please try again.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Login window was closed before completion. Please try again.');
      } else if (err.message?.includes('disallowed_useragent') || err.code === 'auth/web-storage-unsupported') {
        setError('Google blocks login inside apps like Messenger. You MUST open this in your phone\'s browser (Chrome/Safari) to sign in.');
      } else if (err.code === 'auth/internal-error' || err.message?.includes('400')) {
        setError('Connection error (400). This usually means the app URL needs to be authorized in Firebase. Try the "Troubleshoot" button below.');
      } else {
        setError(err.message || 'Failed to sign in. Please ensure you are using a stable connection.');
      }
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <span className="text-white text-3xl font-bold">C</span>
            </div>
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full border-4 border-[#050505] flex items-center justify-center">
              <ShieldCheck className="w-3 h-3 text-white" />
            </div>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-2">CICS DocHub</h1>
        <p className="text-gray-400 mb-12">Digital Repository for College Excellence</p>

        <AnimatePresence>
          {isWebView && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-6 bg-amber-500/10 border border-amber-500/20 rounded-3xl text-left overflow-hidden"
            >
              <div className="flex items-center gap-3 text-amber-500 mb-3">
                <AlertCircle className="w-5 h-5" />
                <span className="font-bold text-sm uppercase tracking-wider">Action Required</span>
              </div>
              <p className="text-sm text-amber-200/70 leading-relaxed mb-4">
                Google blocks login inside apps like Messenger or Instagram for security. To sign in, you <span className="text-amber-500 font-bold">must</span> open this page in your phone's default browser.
              </p>
              <button 
                onClick={() => window.open(window.location.href, '_blank')}
                className="w-full flex items-center justify-center gap-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 py-3 rounded-xl text-xs font-bold transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                Open in Chrome / Safari
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-[#151619] border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          {displayError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm text-left">
              <div className="flex items-center gap-2 mb-2 font-bold">
                <AlertCircle className="w-4 h-4" />
                <span>Login Error</span>
              </div>
              <p className="text-xs opacity-80 leading-relaxed">{displayError}</p>
              <button 
                onClick={() => setShowTroubleshooting(!showTroubleshooting)}
                className="mt-3 text-[10px] font-bold uppercase tracking-widest text-red-400 flex items-center gap-1 hover:text-red-300 transition-colors"
              >
                <HelpCircle className="w-3 h-3" />
                {showTroubleshooting ? 'Hide Help' : 'Troubleshoot'}
              </button>
            </div>
          )}

          <AnimatePresence>
            {showTroubleshooting && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 bg-white/5 rounded-xl text-left space-y-3 overflow-hidden"
              >
                <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Common Fixes:</h4>
                <ul className="text-[10px] text-gray-500 space-y-2 list-disc pl-4">
                  <li>Tap the <span className="text-white">"..."</span> icon and select <span className="text-white">"Open in Browser"</span>.</li>
                  <li>Ensure you are using your <span className="text-blue-500">@neu.edu.ph</span> account.</li>
                  <li>If you see "Error 400", the Admin needs to authorize this URL in Firebase.</li>
                </ul>
                <button 
                  onClick={handleRefresh}
                  className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white py-2 rounded-lg text-[10px] font-bold transition-all"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reload Page
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mb-8 text-left">
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                University Email
              </label>
              <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                @neu.edu.ph
              </span>
            </div>
            <div className="relative">
              <input
                type="email"
                disabled
                value="student.name@neu.edu.ph"
                className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-gray-600 text-sm italic"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] rounded-xl pointer-events-none">
                <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Login via Google below</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center gap-3"
          >
            <Globe className="w-5 h-5" />
            {loading ? 'Signing in...' : 'Sign in with NEU Account'}
          </button>

          <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/5">
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Access is restricted to <span className="text-white font-bold">@neu.edu.ph</span> email addresses. 
              New users will be automatically registered as <span className="text-blue-500 font-bold">Students</span>.
            </p>
          </div>
        </div>

        <p className="mt-8 text-[10px] text-gray-600 uppercase tracking-[0.2em] font-medium">
          College of Information and Computing Studies
        </p>
      </motion.div>
    </div>
  );
}
