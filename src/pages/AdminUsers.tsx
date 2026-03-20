import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, where, orderBy, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { UserProfile, UserRole, DownloadLog } from '../types';
import Layout from '../components/Layout';
import { Search, UserX, UserCheck, Mail, GraduationCap, ShieldAlert, Users, Shield, ShieldCheck, ChevronDown, TrendingUp, Sparkles, Archive, Trash2, Eye, EyeOff, Plus, X, Download, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { PROGRAMS } from '../constants';

export default function AdminUsers() {
  const { profile: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [logs, setLogs] = useState<DownloadLog[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userInsight, setUserInsight] = useState<string>('Analyzing user engagement patterns...');
  const [showPreauth, setShowPreauth] = useState(false);
  const [preauthorizedEmails, setPreauthorizedEmails] = useState<any[]>([]);
  const [newPreauthEmail, setNewPreauthEmail] = useState('');
  const [newPreauthRole, setNewPreauthRole] = useState<'admin' | 'student' | 'owner-admin'>('admin');
  const [newPreauthProgram, setNewPreauthProgram] = useState('');

  const isOwner = currentUser?.role === 'owner-admin' || currentUser?.email === 'alyssabernadette.tuliao@neu.edu.ph';
  const isAdmin = currentUser?.role === 'admin' || isOwner;

  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const unsubscribeUsers = onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ ...d.data() } as UserProfile)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    const unsubscribeLogs = onSnapshot(collection(db, 'logs'), (snapshot) => {
      setLogs(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DownloadLog)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'logs');
    });

    const unsubscribeDocs = onSnapshot(collection(db, 'documents'), (snapshot) => {
      setDocuments(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'documents');
    });

    const unsubscribePreauth = onSnapshot(collection(db, 'preauthorized_emails'), (snap) => {
      setPreauthorizedEmails(snap.docs.map(d => d.data()));
    });

    return () => {
      unsubscribeUsers();
      unsubscribeLogs();
      unsubscribeDocs();
      unsubscribePreauth();
    };
  }, [currentUser]);

  // Smart User Insights
  useEffect(() => {
    const generateUserInsights = () => {
      if (users.length === 0) {
        setUserInsight('User database is initializing. Insights will appear as students register.');
        return;
      }
      
      const students = users.filter(u => u.role === 'student');
      const blockedCount = users.filter(u => u.isBlocked).length;
      const admins = users.filter(u => u.role === 'admin' || u.role === 'owner-admin').length;
      
      const programCounts = students.reduce((acc, u) => ({ ...acc, [u.program || 'Other']: (acc[u.program || 'Other'] || 0) + 1 }), {} as Record<string, number>);
      const topProgram = Object.entries(programCounts).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] || 'N/A';

      const insights = [];
      
      // Insight 1: Growth
      insights.push(`The user base is growing steadily, with ${students.length} students currently onboarded.`);

      // Insight 2: Distribution
      if (topProgram !== 'N/A') {
        insights.push(`${topProgram} students are the most active group, representing the largest segment of the community.`);
      }

      // Insight 3: Security
      if (blockedCount > 0) {
        insights.push(`System integrity is maintained with ${blockedCount} restricted accounts.`);
      } else {
        insights.push(`User engagement is healthy with zero restricted accounts detected.`);
      }

      setUserInsight(insights.join(' '));
    };

    generateUserInsights();
  }, [users.length]);

  const toggleBlock = async (user: UserProfile) => {
    if (user.role === 'owner-admin' || user.email === 'alyssabernadette.tuliao@neu.edu.ph') return; // Cannot block owner
    if (user.role === 'admin' && !isOwner) return; // Regular admin cannot block other admins
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isBlocked: !user.isBlocked
      });
    } catch (error) {
      console.error('Error toggling block status:', error);
    }
  };

  const changeRole = async (user: UserProfile, newRole: UserRole) => {
    // Only owner can change owner roles or promote to owner
    if (user.role === 'owner-admin' && !isOwner) return;
    if (newRole === 'owner-admin' && !isOwner) return;
    
    // Regular admin cannot change the hardcoded owner's role
    if (user.email === 'alyssabernadette.tuliao@neu.edu.ph' && !isOwner) return;
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        role: newRole
      });
    } catch (error) {
      console.error('Error changing role:', error);
    }
  };

  const changeProgram = async (user: UserProfile, newProgram: string) => {
    // Only owner or admin can change programs
    if (!isOwner && !isAdmin) return;
    
    // Regular admin cannot change the hardcoded owner's program
    if (user.email === 'alyssabernadette.tuliao@neu.edu.ph' && !isOwner) return;
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        program: newProgram
      });
    } catch (error) {
      console.error('Error changing program:', error);
    }
  };

  const toggleArchive = async (user: UserProfile) => {
    if (user.role === 'owner-admin' || user.email === 'alyssabernadette.tuliao@neu.edu.ph') return;
    
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        isArchived: !user.isArchived
      });
    } catch (error) {
      console.error('Error toggling archive status:', error);
    }
  };

  const deleteUser = async (user: UserProfile) => {
    if (!isOwner) return;
    if (user.role === 'owner-admin') return;
    
    if (!window.confirm(`Are you sure you want to PERMANENTLY delete ${user.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', user.uid));
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleAddPreauth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPreauthEmail) return;
    try {
      await setDoc(doc(db, 'preauthorized_emails', newPreauthEmail), {
        email: newPreauthEmail,
        role: newPreauthRole,
        program: newPreauthRole === 'student' ? newPreauthProgram : null,
        addedBy: currentUser?.uid,
        addedAt: new Date().toISOString()
      });
      setNewPreauthEmail('');
      setNewPreauthProgram('');
    } catch (error) {
      console.error('Pre-auth add error:', error);
    }
  };

  const handleRemovePreauth = async (email: string) => {
    try {
      await deleteDoc(doc(db, 'preauthorized_emails', email));
    } catch (error) {
      console.error('Pre-auth remove error:', error);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.name || '').toLowerCase().includes(search.toLowerCase()) || 
                         (u.email || '').toLowerCase().includes(search.toLowerCase());
    const matchesArchived = showArchived ? true : !u.isArchived;
    return matchesSearch && matchesArchived;
  });

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
            <p className="text-gray-500">Manage access and roles for CICS DocHub users</p>
          </div>
          {isOwner && (
            <button
              onClick={() => setShowPreauth(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-5 h-5" />
              Add Authorized User
            </button>
          )}
        </header>

        <div className="mb-12 bg-emerald-600/10 border border-emerald-600/20 rounded-3xl p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center">
              <TrendingUp className="w-3 h-3 text-white" />
            </div>
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Smart User Insights</span>
          </div>
          <p className="text-sm text-emerald-200/70 leading-relaxed italic">
            "{userInsight}"
          </p>
        </div>

        <div className="mb-12 flex flex-col sm:flex-row gap-4">
          <div className="relative group flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#151619] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-600/50 transition-all"
            />
          </div>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={cn(
              "px-6 py-4 rounded-2xl border font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
              showArchived 
                ? "bg-blue-600/10 border-blue-600 text-blue-500" 
                : "bg-[#151619] border-white/5 text-gray-500 hover:text-gray-400"
            )}
          >
            {showArchived ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {showArchived ? 'Showing Archived' : 'Show Archived'}
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-[#151619] rounded-2xl animate-pulse border border-white/5" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredUsers.map((user) => {
                const isTargetOwner = user.role === 'owner-admin' || user.email === 'alyssabernadette.tuliao@neu.edu.ph';
                const canManage = isOwner || (isAdmin && !isTargetOwner);

                return (
                  <motion.div
                    key={user.uid}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => setSelectedUser(user)}
                    className={cn(
                      "bg-[#151619] border rounded-2xl p-4 sm:p-6 flex flex-col lg:flex-row items-center justify-between gap-6 transition-all cursor-pointer hover:bg-white/[0.02] group/card",
                      user.isBlocked ? "border-red-500/20 opacity-70" : "border-white/5",
                      user.isArchived ? "border-amber-500/20 grayscale-[0.5]" : "",
                      isTargetOwner ? "border-blue-500/30" : ""
                    )}
                  >
                    <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0 w-full">
                      <div className={cn(
                        "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-bold text-base sm:text-lg shrink-0",
                        isTargetOwner ? "bg-blue-600 text-white" : 
                        user.isBlocked ? "bg-red-500/10 text-red-500" : 
                        user.isArchived ? "bg-amber-500/10 text-amber-500" : "bg-blue-600/10 text-blue-500"
                      )}>
                        {user.name?.[0] || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                          <h3 className="text-base sm:text-lg font-bold text-white truncate">{user.name}</h3>
                          <div className="flex flex-wrap gap-1.5">
                            {(user.role === 'owner-admin' || user.email === 'alyssabernadette.tuliao@neu.edu.ph') && (
                              <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-blue-500 uppercase tracking-widest bg-blue-500/10 px-2 py-1 rounded-lg">
                                <ShieldCheck className="w-3 h-3" />
                                Owner
                              </span>
                            )}
                            {user.role === 'admin' && user.email !== 'alyssabernadette.tuliao@neu.edu.ph' && (
                              <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded-lg">
                                <Shield className="w-3 h-3" />
                                Admin
                              </span>
                            )}
                            {user.role === 'student' && (
                              <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-lg">
                                <GraduationCap className="w-3 h-3" />
                                Student
                              </span>
                            )}
                            {user.isBlocked && (
                              <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-red-500 uppercase tracking-widest bg-red-500/10 px-2 py-1 rounded-lg">
                                <ShieldAlert className="w-3 h-3" />
                                Blocked
                              </span>
                            )}
                            {user.isArchived && (
                              <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-bold text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-1 rounded-lg">
                                <Archive className="w-3 h-3" />
                                Archived
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-x-4 gap-y-1 text-[10px] sm:text-xs text-gray-500 font-medium">
                          <div className="flex items-center gap-1.5 truncate">
                            <Mail className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{user.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                            {user.program || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-row items-center gap-3 w-full lg:w-auto" onClick={(e) => e.stopPropagation()}>
                      {canManage && !isTargetOwner && (
                        <>
                          <div className="relative group/select flex-1 lg:flex-none min-w-[120px] sm:min-w-[140px]">
                            <select
                              value={user.role}
                              onChange={(e) => changeRole(user, e.target.value as UserRole)}
                              className="w-full appearance-none bg-[#1A1B1E] border border-white/5 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-blue-600/50 cursor-pointer pr-10"
                            >
                              <option value="student">Student</option>
                              <option value="admin">Admin</option>
                              {isOwner && <option value="owner-admin">Owner</option>}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                          </div>

                          <div className="relative group/select flex-1 lg:flex-none min-w-[120px] sm:min-w-[140px]">
                            <select
                              value={user.program || ''}
                              onChange={(e) => changeProgram(user, e.target.value)}
                              className="w-full appearance-none bg-[#1A1B1E] border border-white/5 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-blue-600/50 cursor-pointer pr-10"
                            >
                              <option value="">No Program</option>
                              {PROGRAMS.map(p => (
                                <option key={p} value={p}>{p.split(' - ').pop()}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                          </div>

                          <button
                            onClick={() => toggleBlock(user)}
                            title={user.isBlocked ? "Unblock User" : "Block User"}
                            className={cn(
                              "flex-1 lg:flex-none flex items-center justify-center p-3 rounded-xl transition-all active:scale-[0.98]",
                              user.isBlocked
                                ? "bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600/20"
                                : "bg-red-600/10 text-red-500 hover:bg-red-600/20"
                            )}
                          >
                            {user.isBlocked ? <UserCheck className="w-5 h-5" /> : <UserX className="w-5 h-5" />}
                          </button>

                          <button
                            onClick={() => toggleArchive(user)}
                            title={user.isArchived ? "Restore User" : "Archive User"}
                            className={cn(
                              "flex-1 lg:flex-none flex items-center justify-center p-3 rounded-xl transition-all active:scale-[0.98]",
                              user.isArchived
                                ? "bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600/20"
                                : "bg-amber-600/10 text-amber-500 hover:bg-amber-600/20"
                            )}
                          >
                            <Archive className="w-5 h-5" />
                          </button>

                          {isOwner && (
                            <button
                              onClick={() => deleteUser(user)}
                              title="Delete User"
                              className="flex-1 lg:flex-none flex items-center justify-center p-3 rounded-xl bg-red-600/10 text-red-500 hover:bg-red-600/20 transition-all active:scale-[0.98]"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {!loading && filteredUsers.length === 0 && (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-600">
              <Users className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No users found</h3>
            <p className="text-gray-500">Try adjusting your search criteria</p>
          </div>
        )}

        <AnimatePresence>
          {selectedUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedUser(null)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-[#151619] border border-white/10 rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
              >
                {/* Modal Header */}
                <div className="p-6 sm:p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl",
                      selectedUser.role === 'owner-admin' ? "bg-blue-600 text-white" : "bg-blue-600/10 text-blue-500"
                    )}>
                      {selectedUser.name?.[0] || '?'}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{selectedUser.name}</h2>
                      <p className="text-xs text-gray-500">{selectedUser.email}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedUser(null)}
                    className="p-2 hover:bg-white/5 rounded-xl text-gray-500 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {/* Account Info */}
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Account Information</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                          <span className="text-xs text-gray-500">Role</span>
                          <span className="text-xs font-bold text-white capitalize">{selectedUser.role?.replace('-admin', ' Admin')}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                          <span className="text-xs text-gray-500">Program</span>
                          <span className="text-xs font-bold text-white">{selectedUser.program || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                          <span className="text-xs text-gray-500">Status</span>
                          <div className="flex items-center gap-2">
                            {selectedUser.isBlocked ? (
                              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest bg-red-500/10 px-2 py-1 rounded-lg">Blocked</span>
                            ) : selectedUser.isArchived ? (
                              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-1 rounded-lg">Archived</span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded-lg">Active</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                          <span className="text-xs text-gray-500">Joined</span>
                          <span className="text-xs font-bold text-white">
                            {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Engagement Overview</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 bg-blue-600/5 border border-blue-600/10 rounded-2xl">
                          <Download className="w-5 h-5 text-blue-500 mb-2" />
                          <p className="text-2xl font-bold text-white">
                            {logs.filter(l => l.userId === selectedUser.uid).length}
                          </p>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Downloads</p>
                        </div>
                        <div className="p-4 bg-emerald-600/5 border border-emerald-600/10 rounded-2xl">
                          <TrendingUp className="w-5 h-5 text-emerald-500 mb-2" />
                          <p className="text-2xl font-bold text-white">
                            {Math.round((logs.filter(l => l.userId === selectedUser.uid).length / (logs.length || 1)) * 100)}%
                          </p>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Share</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Download History */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Download History</h3>
                      <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                        {logs.filter(l => l.userId === selectedUser.uid).length} Total
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {logs
                        .filter(l => l.userId === selectedUser.uid)
                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                        .map((log, idx) => {
                          const doc = documents.find(d => d.id === log.documentId);
                          return (
                            <div key={log.id || idx} className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl group hover:bg-white/[0.04] transition-all">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-500">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                                    {doc?.title || 'Unknown Document'}
                                  </p>
                                  <p className="text-[10px] text-gray-600">
                                    {doc?.category || 'General'} • {doc?.fileSize || '0 KB'}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                  {new Date(log.timestamp).toLocaleDateString()}
                                </p>
                                <p className="text-[9px] text-gray-700">
                                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      {logs.filter(l => l.userId === selectedUser.uid).length === 0 && (
                        <div className="text-center py-12 bg-white/[0.01] border border-dashed border-white/5 rounded-2xl">
                          <Download className="w-8 h-8 text-gray-800 mx-auto mb-3" />
                          <p className="text-xs text-gray-600 italic">No download history found for this user</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-6 bg-white/[0.02] border-t border-white/5 flex justify-end">
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="px-6 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs font-bold transition-all"
                  >
                    Close Details
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showPreauth && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPreauth(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-[#151619] border border-white/10 rounded-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-white">Add Authorized User</h2>
                  <button onClick={() => setShowPreauth(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-500">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleAddPreauth} className="space-y-6 mb-12">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="email"
                        required
                        value={newPreauthEmail}
                        onChange={(e) => setNewPreauthEmail(e.target.value)}
                        placeholder="user@neu.edu.ph"
                        className="w-full bg-[#1A1B1E] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-gray-700 focus:outline-none focus:border-blue-600/50 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Assign Role</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(['admin', 'student', 'owner-admin'] as const).map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setNewPreauthRole(role)}
                          className={cn(
                            "py-4 rounded-2xl border font-bold text-[10px] uppercase tracking-widest transition-all",
                            newPreauthRole === role
                              ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20"
                              : "bg-[#1A1B1E] border-white/5 text-gray-500 hover:text-gray-400"
                          )}
                        >
                          {role.replace('-admin', '')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {newPreauthRole === 'student' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Program</label>
                      <div className="relative group">
                        <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 group-focus-within:text-blue-500 transition-colors" />
                        <select
                          required
                          value={newPreauthProgram}
                          onChange={(e) => setNewPreauthProgram(e.target.value)}
                          className="w-full bg-[#1A1B1E] border border-white/5 rounded-2xl pl-12 pr-10 py-4 text-white appearance-none focus:outline-none focus:border-blue-600/50 transition-all"
                        >
                          <option value="">Select Program</option>
                          {PROGRAMS.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 pointer-events-none" />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-gray-200 transition-all active:scale-[0.98] mt-4"
                  >
                    Authorize Email
                  </button>
                </form>

                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-widest">Authorized Emails</h3>
                  <div className="space-y-2">
                    {preauthorizedEmails.map((pre) => (
                      <div key={pre.email} className="flex items-center justify-between p-4 bg-[#1A1B1E] rounded-2xl border border-white/5 group">
                        <div>
                          <p className="text-sm font-bold text-white">{pre.email}</p>
                          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">{pre.role}</p>
                        </div>
                        <button
                          onClick={() => handleRemovePreauth(pre.email)}
                          className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {preauthorizedEmails.length === 0 && (
                      <p className="text-center py-8 text-gray-600 text-sm italic">No authorized emails yet</p>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
