import { motion } from 'motion/react';

export default function Blocked() {
  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-[#151619] border border-white/5 rounded-3xl p-8 text-center shadow-2xl"
      >
        <div className="w-16 h-16 bg-red-600/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Account Restricted</h2>
        <p className="text-gray-400 mb-8">
          Your account has been blocked by the administrator. You no longer have access to download documents.
        </p>
        <p className="text-sm text-gray-500">
          Please contact the CICS administration for more information.
        </p>
      </motion.div>
    </div>
  );
}
