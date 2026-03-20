import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Navigate } from 'react-router-dom';
import { PROGRAMS } from '../constants';

export default function Onboarding() {
  const { user, profile, refreshProfile } = useAuth();
  const [name, setName] = useState(user?.displayName || '');
  const [selectedProgram, setSelectedProgram] = useState('');
  const [loading, setLoading] = useState(false);
  const [preauthRole, setPreauthRole] = useState<string | null>(null);

  useEffect(() => {
    const checkPreauth = async () => {
      if (!user?.email) return;
      const isOwner = user.email === 'alyssabernadette.tuliao@neu.edu.ph';
      if (isOwner) {
        setPreauthRole('owner-admin');
        return;
      }
      try {
        const preauthDoc = await getDoc(doc(db, 'preauthorized_emails', user.email));
        if (preauthDoc.exists()) {
          setPreauthRole(preauthDoc.data().role);
        }
      } catch (e) {
        console.error('Pre-auth check failed:', e);
      }
    };
    checkPreauth();
  }, [user]);

  if (profile) return <Navigate to="/" replace />;

  const handleComplete = async () => {
    if (!user || !name || (!selectedProgram && !preauthRole)) return;
    setLoading(true);
    try {
      const role = preauthRole || 'student';
      
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        name: name,
        role,
        program: selectedProgram || 'N/A',
        isBlocked: false,
        createdAt: new Date().toISOString()
      });
      await refreshProfile();
    } catch (error) {
      console.error('Onboarding error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-[#151619] border border-white/5 rounded-3xl p-8 shadow-2xl"
      >
        <h2 className="text-2xl font-bold text-white mb-2">Welcome to CICS DocHub</h2>
        <p className="text-gray-400 text-sm mb-8">
          Please complete your profile to continue.
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#1A1B1E] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-600/50"
              placeholder="Enter your full name"
            />
          </div>

          {preauthRole ? (
            <div className="p-4 bg-blue-600/10 border border-blue-600/20 rounded-xl">
              <p className="text-xs text-blue-400 font-medium">
                You have been pre-authorized as <span className="font-bold uppercase tracking-widest">{preauthRole}</span>.
              </p>
              <p className="text-[10px] text-blue-400/60 mt-1">
                You can proceed directly to the dashboard.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Select Program</label>
              <div className="grid grid-cols-1 gap-3 max-h-[30vh] overflow-y-auto pr-2 custom-scrollbar">
                {PROGRAMS.map((program) => (
                  <button
                    key={program}
                    onClick={() => setSelectedProgram(program)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm ${
                      selectedProgram === program
                        ? 'bg-blue-600/10 border-blue-600 text-blue-500'
                        : 'bg-[#1A1B1E] border-white/5 text-gray-400 hover:border-white/10'
                    }`}
                  >
                    {program}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleComplete}
            disabled={!name || (!selectedProgram && !preauthRole) || loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? 'Setting up...' : 'Continue to Library'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
