import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, getDocs, where, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { DocumentMetadata, DownloadLog } from '../types';
import Layout from '../components/Layout';
import { Upload, FileText, Users, Download, Database, Plus, X, Search, TrendingUp, ShieldCheck, Mail, Trash2, Archive, ArchiveRestore, Eye, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatBytes } from '../lib/utils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { startOfDay, subDays, format, isAfter, startOfWeek, startOfMonth } from 'date-fns';
import { PROGRAMS, CATEGORIES } from '../constants';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [logs, setLogs] = useState<DownloadLog[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [statsPeriod, setStatsPeriod] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Custom'>('Daily');
  const [systemInsight, setSystemInsight] = useState<string>('Analyzing system engagement data...');
  const [docSearch, setDocSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [editingDocVisibility, setEditingDocVisibility] = useState<DocumentMetadata | null>(null);
  const [tempAllowedPrograms, setTempAllowedPrograms] = useState<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const getProgramCode = (p: string) => {
    if (p.includes(' - ')) return p.split(' - ').pop();
    // Fallback for old names
    if (p.includes('Computer Science')) return 'BSCS';
    if (p.includes('Information Technology')) return 'BSIT';
    if (p.includes('Information System')) return 'BSIS';
    if (p.includes('Library and Information Science')) return 'BLIS';
    if (p.includes('Digital Animation')) return 'BSEMC-DAT';
    if (p.includes('Game Development')) return 'BSEMC-GD';
    return p;
  };

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Curriculum');
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>(PROGRAMS);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile?.email === 'alyssabernadette.tuliao@neu.edu.ph' && profile?.role !== 'owner-admin') {
      updateDoc(doc(db, 'users', profile.uid), { role: 'owner-admin' })
        .catch(err => console.error('Error fixing owner role:', err));
    }
  }, [profile]);

  useEffect(() => {
    if (!profile) return;

    const unsubDocs = onSnapshot(collection(db, 'documents'), (snap) => {
      setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() } as DocumentMetadata)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'documents');
    });

    const unsubLogs = onSnapshot(collection(db, 'logs'), (snap) => {
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as DownloadLog)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'logs');
    });

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    setLoading(false);
    return () => { unsubDocs(); unsubLogs(); unsubUsers(); };
  }, [profile]);

  const generateInsights = () => {
    if (documents.length === 0 && logs.length === 0) {
      setSystemInsight('System data is initializing. Insights will appear as users interact with the hub.');
      return;
    }

    const recentLogs = logs.filter(l => new Date(l.timestamp).getTime() > subDays(new Date(), 1).getTime());
    const activeUsers = users.filter(u => !u.isBlocked).length;
    
    const categoryCounts = documents.reduce((acc, d) => ({ ...acc, [d.category]: (acc[d.category] || 0) + 1 }), {} as Record<string, number>);
    const topCategory = Object.entries(categoryCounts).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] || 'General';

    const insights = [];
    
    // Insight 1: Engagement
    if (recentLogs.length > 5) {
      insights.push(`High engagement detected with ${recentLogs.length} downloads in the last 24 hours.`);
    } else if (recentLogs.length > 0) {
      insights.push(`Steady activity observed with ${recentLogs.length} recent document retrievals.`);
    } else {
      insights.push(`System is stable. Total repository engagement stands at ${logs.length} downloads.`);
    }

    // Insight 2: Repository Health
    insights.push(`${topCategory} remains the primary focus of the repository, comprising ${categoryCounts[topCategory] || 0} documents.`);

    // Insight 3: User Base
    if (activeUsers > 0) {
      insights.push(`The user community is active with ${activeUsers} verified accounts currently onboarded.`);
    }

    setSystemInsight(insights.join(' '));
  };

  useEffect(() => {
    generateInsights();
  }, [documents.length, logs.length, users.length]);

  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title || !category) return;

    const cloudName = (process.env.VITE_CLOUDINARY_CLOUD_NAME || (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME || '').trim();
    const uploadPreset = (process.env.VITE_CLOUDINARY_UPLOAD_PRESET || (import.meta as any).env?.VITE_CLOUDINARY_UPLOAD_PRESET || '').trim();

    // Strict validation to help the user
    if (!cloudName || cloudName === 'YOUR_CLOUD_NAME' || cloudName === 'undefined' || cloudName === '') {
      setUploadError('Cloudinary Cloud Name is missing. Please add VITE_CLOUDINARY_CLOUD_NAME to your Secrets.');
      return;
    }
    
    // Cloud names are usually strings, API keys are usually numbers. 
    // If it's just numbers, it's likely the wrong value.
    if (/^\d+$/.test(cloudName)) {
      setUploadError('Invalid Cloud Name. You might have entered your "API Key" instead of your "Cloud Name". Please check your Cloudinary Dashboard.');
      return;
    }

    if (!uploadPreset || uploadPreset === 'YOUR_PRESET' || uploadPreset === 'undefined' || uploadPreset === '') {
      setUploadError('Cloudinary Upload Preset is missing. Please add VITE_CLOUDINARY_UPLOAD_PRESET to your Secrets.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Use XMLHttpRequest for progress tracking
      const url = await new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName.trim()}/upload`);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const progress = (event.loaded / event.total) * 100;
            setUploadProgress(progress);
          }
        };

        xhr.onload = () => {
          let response;
          try {
            response = JSON.parse(xhr.responseText);
          } catch (e) {
            reject(new Error('Invalid response from upload server.'));
            return;
          }

          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(response.secure_url);
          } else {
            const errorMsg = response.error?.message || 'Upload failed';
            if (errorMsg === 'Unknown API key') {
              reject(new Error('Invalid Cloudinary Cloud Name. Please check VITE_CLOUDINARY_CLOUD_NAME in your Secrets.'));
            } else if (errorMsg.includes('disabled')) {
              reject(new Error('Your Cloudinary Cloud Name is disabled. This usually means the name is incorrect or your account needs email verification. Please check your Cloudinary Dashboard and your email.'));
            } else {
              reject(new Error(errorMsg));
            }
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.onabort = () => reject(new Error('Upload cancelled'));

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', 'cics_docs');
        
        xhr.send(formData);
        
        // Handle cancellation
        controller.signal.addEventListener('abort', () => {
          xhr.abort();
        });
      });
      
      await addDoc(collection(db, 'documents'), {
        title,
        description,
        category,
        allowedPrograms: selectedPrograms,
        fileUrl: url,
        fileSize: formatBytes(file.size),
        size: file.size,
        uploadedBy: profile?.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        downloadCount: 0,
        isArchived: false
      });

      setShowUpload(false);
      setTitle('');
      setDescription('');
      setFile(null);
      setSelectedPrograms(PROGRAMS);
      setUploadProgress(0);
    } catch (error: any) {
      console.error('Upload process error:', error);
      const mask = (str: string) => str ? `${str.substring(0, 4)}****` : 'missing';
      const debugInfo = `(Debug: cloud=${mask(cloudName)}, preset=${mask(uploadPreset)})`;
      
      if (error.message === 'Upload cancelled') {
        setUploadError('Upload was cancelled.');
      } else {
        setUploadError(`${error.message || 'Upload failed'} ${debugInfo}`);
      }
    } finally {
      setUploading(false);
      abortControllerRef.current = null;
    }
  };

  const handleArchive = async (docId: string, isArchived: boolean) => {
    try {
      await updateDoc(doc(db, 'documents', docId), {
        isArchived: !isArchived,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `documents/${docId}`);
    }
  };

  const handleUpdateVisibility = async () => {
    if (!editingDocVisibility) return;
    try {
      await updateDoc(doc(db, 'documents', editingDocVisibility.id), {
        allowedPrograms: tempAllowedPrograms,
        updatedAt: serverTimestamp()
      });
      setEditingDocVisibility(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `documents/${editingDocVisibility.id}`);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!window.confirm('Are you sure you want to delete this document? This action cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'documents', docId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `documents/${docId}`);
    }
  };

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  // Stats calculation
  const getFilteredLogs = () => {
    const now = new Date();
    let startDate = startOfDay(subDays(now, 7));
    if (statsPeriod === 'Weekly') startDate = startOfWeek(now);
    if (statsPeriod === 'Monthly') startDate = startOfMonth(now);
    
    return logs.filter(log => isAfter(new Date(log.timestamp), startDate));
  };

  const chartData = Array.from({ length: statsPeriod === 'Monthly' ? 30 : statsPeriod === 'Weekly' ? 7 : 7 }).map((_, i) => {
    const daysToSub = (statsPeriod === 'Monthly' ? 29 : statsPeriod === 'Weekly' ? 6 : 6) - i;
    const date = subDays(new Date(), daysToSub);
    const dateStr = format(date, statsPeriod === 'Monthly' ? 'MMM dd' : 'EEE');
    const dayLogs = logs.filter(log => format(new Date(log.timestamp), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));
    const dayLogins = users.filter(u => u.createdAt && format(new Date(u.createdAt), 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'));
    
    return {
      name: dateStr,
      downloads: dayLogs.length,
      logins: dayLogins.length
    };
  });

  const getStats = () => {
    const filteredLogs = getFilteredLogs();
    const totalDownloads = filteredLogs.length;
    const activeUsers = users.filter(u => !u.isBlocked).length;
    const activeFiles = documents.filter(d => !d.isArchived).length;
    
    return [
      { label: 'Active Users', value: activeUsers.toLocaleString(), change: 'Real-time', icon: Users, color: 'text-blue-500' },
      { label: 'Active Files', value: activeFiles.toLocaleString(), change: 'Viewable', icon: Eye, color: 'text-indigo-500' },
      { label: 'Doc Downloads', value: totalDownloads.toLocaleString(), change: 'Total', icon: Download, color: 'text-emerald-500' },
      { label: 'Repository Size', value: formatBytes(documents.reduce((acc, d) => acc + (d.size || 0), 0)), change: 'Total', icon: Database, color: 'text-orange-500' },
    ];
  };

  const stats = getStats();

  const cloudNameValue = (process.env.VITE_CLOUDINARY_CLOUD_NAME || (import.meta as any).env?.VITE_CLOUDINARY_CLOUD_NAME || '').trim();

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-12">
          <div className="flex flex-col md:flex-row md:items-center gap-6 w-full lg:w-auto">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">DocHub System Monitor</h1>
              <p className="text-gray-500">Real-time engagement tracking for CICS DocHub</p>
            </div>
            
            <div className="bg-[#151619] border border-white/5 rounded-2xl p-4 flex items-center gap-6 shrink-0">
              <div className="space-y-1">
                <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">Cloud Name</p>
                <div className="flex items-center gap-1.5">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    (!cloudNameValue || cloudNameValue === 'YOUR_CLOUD_NAME' || cloudNameValue === '') ? "bg-red-500" : 
                    /^\d+$/.test(cloudNameValue) ? "bg-yellow-500" : "bg-emerald-500"
                  )} />
                  <span className="text-[10px] font-bold text-white">
                    {(!cloudNameValue || cloudNameValue === 'YOUR_CLOUD_NAME' || cloudNameValue === '') ? "Missing" : 
                     /^\d+$/.test(cloudNameValue) ? "Invalid (API Key?)" : "Connected"}
                  </span>
                </div>
              </div>
              <div className="w-px h-8 bg-white/5" />
              <div className="space-y-1">
                <p className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">System Status</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-white">Online</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-1 bg-[#151619] p-1 rounded-xl border border-white/5 w-full sm:w-auto overflow-x-auto no-scrollbar shrink-0">
            {['Daily', 'Weekly', 'Monthly'].map(p => (
              <button
                key={p}
                onClick={() => setStatsPeriod(p as any)}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-bold transition-all flex-1 sm:flex-none whitespace-nowrap",
                  statsPeriod === p ? "bg-white/10 text-white" : "text-gray-600 hover:text-gray-400"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-[#151619] border border-white/5 rounded-3xl p-6 sm:p-8 relative overflow-hidden group">
              <div className="flex items-start justify-between mb-4">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5", stat.color)}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <span className={cn("text-xs font-bold px-2 py-1 rounded-lg bg-white/5", 
                  stat.change.startsWith('+') ? 'text-emerald-500' : 'text-gray-500'
                )}>
                  {stat.change}
                </span>
              </div>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">{stat.label}</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</h3>
            </div>
          ))}

          {/* Smart Insights Card */}
          <div className="bg-emerald-600/10 border border-emerald-600/20 rounded-3xl p-6 sm:p-8 sm:col-span-2 lg:col-span-1 relative group">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-3 h-3 text-white" />
                </div>
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">System Insights</span>
              </div>
            </div>
            <p className="text-sm leading-relaxed italic text-emerald-200/70">
              "{systemInsight}"
            </p>
          </div>
        </div>

        {/* Document Management Section */}
        <div className="bg-[#151619] border border-white/5 rounded-3xl p-8 mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Document Repository</h3>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Manage system documents, visibility, and archiving</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                <input
                  type="text"
                  placeholder="Search repository..."
                  value={docSearch}
                  onChange={(e) => setDocSearch(e.target.value)}
                  className="w-full bg-[#1A1B1E] border border-white/5 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-blue-600/50"
                />
              </div>
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                  showArchived ? "bg-blue-600 text-white" : "bg-white/5 text-gray-500 hover:text-gray-300"
                )}
              >
                {showArchived ? 'Hide Archived' : 'Show Archived'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="pb-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Document</th>
                  <th className="pb-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Category</th>
                  <th className="pb-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Visibility</th>
                  <th className="pb-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Downloads</th>
                  <th className="pb-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Status</th>
                  <th className="pb-4 text-[10px] font-bold text-gray-600 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {documents
                  .filter(d => {
                    const matchesSearch = d.title.toLowerCase().includes(docSearch.toLowerCase());
                    const matchesArchived = showArchived || !d.isArchived;
                    return matchesSearch && matchesArchived;
                  })
                  .map(docData => (
                    <tr key={docData.id} className="group hover:bg-white/[0.02] transition-colors">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-600/10 flex items-center justify-center text-blue-500">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white line-clamp-1">{docData.title}</p>
                            <p className="text-[10px] text-gray-600">{docData.fileSize}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-lg">
                          {docData.category}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex flex-wrap gap-1 max-w-[120px] items-center">
                          {docData.allowedPrograms?.length === PROGRAMS.length ? (
                            <span className="text-[10px] font-bold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded">ALL</span>
                          ) : (
                            docData.allowedPrograms?.map(p => (
                              <span key={p} className="text-[10px] font-bold text-gray-400 bg-white/5 px-1.5 py-0.5 rounded" title={p}>
                                {getProgramCode(p)}
                              </span>
                            ))
                          )}
                          <button 
                            onClick={() => {
                              setEditingDocVisibility(docData);
                              // Normalize to current PROGRAMS list
                              const current = (docData.allowedPrograms || []).map(p => {
                                const found = PROGRAMS.find(curr => curr.includes(p) || p.includes(curr));
                                return found || p;
                              }).filter(p => PROGRAMS.includes(p));
                              setTempAllowedPrograms(current);
                            }}
                            className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-blue-500 transition-colors ml-auto"
                            title="Edit Visibility"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Download className="w-3 h-3" />
                          <span className="text-xs font-bold">{docData.downloadCount || 0}</span>
                        </div>
                      </td>
                      <td className="py-4">
                        {docData.isArchived ? (
                          <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Archive className="w-3 h-3" />
                            Archived
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
                            <ShieldCheck className="w-3 h-3" />
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              const downloadUrl = docData.fileUrl.includes('cloudinary.com') 
                                ? docData.fileUrl.replace('/upload/', '/upload/fl_attachment/')
                                : docData.fileUrl;
                              window.open(downloadUrl, '_blank');
                            }}
                            title="View/Download"
                            className="p-2 rounded-lg hover:bg-white/5 text-gray-600 hover:text-blue-500 transition-all"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleArchive(docData.id, !!docData.isArchived)}
                            title={docData.isArchived ? "Unarchive" : "Archive"}
                            className="p-2 rounded-lg hover:bg-white/5 text-gray-600 hover:text-orange-500 transition-all"
                          >
                            {docData.isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDelete(docData.id)}
                            title="Delete"
                            className="p-2 rounded-lg hover:bg-white/5 text-gray-600 hover:text-red-500 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                {documents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-600 italic text-xs">
                      No documents found in the repository.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* Visibility Edit Modal */}
      <AnimatePresence>
        {editingDocVisibility && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingDocVisibility(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Edit Visibility</h3>
                  <p className="text-xs text-gray-500 line-clamp-1">{editingDocVisibility.title}</p>
                </div>
                <button
                  onClick={() => setEditingDocVisibility(null)}
                  className="p-2 hover:bg-white/5 rounded-xl text-gray-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      Program Visibility
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (tempAllowedPrograms.length === PROGRAMS.length) {
                          setTempAllowedPrograms([]);
                        } else {
                          setTempAllowedPrograms([...PROGRAMS]);
                        }
                      }}
                      className="text-[10px] font-bold text-blue-500 hover:text-blue-400 transition-colors"
                    >
                      {tempAllowedPrograms.length === PROGRAMS.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {PROGRAMS.map(program => (
                      <label
                        key={program}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer",
                          tempAllowedPrograms.includes(program)
                            ? "bg-blue-500/10 border-blue-500/50 text-blue-500"
                            : "bg-white/5 border-transparent text-gray-500 hover:bg-white/10"
                        )}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={tempAllowedPrograms.includes(program)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTempAllowedPrograms([...tempAllowedPrograms, program]);
                            } else {
                              setTempAllowedPrograms(tempAllowedPrograms.filter(p => p !== program));
                            }
                          }}
                        />
                        <span className="text-[10px] font-bold">{program}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white/[0.02] border-t border-white/5 flex gap-3">
                <button
                  onClick={() => setEditingDocVisibility(null)}
                  className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-gray-500 hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateVisibility}
                  className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/20 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2 bg-[#151619] border border-white/5 rounded-3xl p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold text-white mb-1">Engagement Flow</h3>
                <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Comparing login frequency vs document retrieval</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-600" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">User Logins</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Doc Downloads</span>
                </div>
              </div>
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorLogins" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDownloads" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis dataKey="name" stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#151619', border: '1px solid #ffffff10', borderRadius: '12px' }}
                    itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="logins" stroke="#2563EB" fillOpacity={1} fill="url(#colorLogins)" strokeWidth={3} />
                  <Area type="monotone" dataKey="downloads" stroke="#10B981" fillOpacity={1} fill="url(#colorDownloads)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#151619] border border-white/5 rounded-3xl p-8 flex flex-col">
            <h3 className="text-xl font-bold text-white mb-6">Quick Actions</h3>
            <div className="space-y-4">
              <button
                onClick={() => setShowUpload(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-lg shadow-blue-600/20"
              >
                <Plus className="w-5 h-5" />
                Upload New Document
              </button>
            </div>
            
            <div className="mt-8 pt-8 border-t border-white/5">
              <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Recent Activity</h4>
              <div className="space-y-4 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                {logs.slice(0, 5).map(log => {
                  const user = users.find(u => u.uid === log.userId);
                  const doc = documents.find(d => d.id === log.documentId);
                  return (
                    <div key={log.id} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                        <Download className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-white font-bold truncate">
                          {user?.name || 'Unknown User'}
                        </p>
                        <p className="text-[10px] text-gray-500 truncate">
                          Downloaded {doc?.title || 'a document'}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {logs.length === 0 && (
                  <p className="text-[10px] text-gray-600 italic">No recent activity</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Upload Modal */}
        <AnimatePresence>
          {showUpload && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowUpload(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-lg bg-[#151619] border border-white/10 rounded-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-white">Upload Document</h2>
                  <button onClick={() => setShowUpload(false)} className="p-2 hover:bg-white/5 rounded-full text-gray-500">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleUpload} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Document Title</label>
                    <input
                      type="text"
                      required
                      disabled={uploading}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-[#1A1B1E] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-600/50 disabled:opacity-50"
                      placeholder="e.g. BSIT Curriculum 2024"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Category</label>
                    <select
                      value={category}
                      disabled={uploading}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-[#1A1B1E] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-600/50 disabled:opacity-50"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Program Visibility</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => setSelectedPrograms(PROGRAMS)}
                        className="text-[10px] font-bold text-blue-500 hover:text-blue-400 disabled:opacity-50"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => setSelectedPrograms([])}
                        className="text-[10px] font-bold text-gray-500 hover:text-gray-400 disabled:opacity-50"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                      {PROGRAMS.map(p => (
                        <label key={p} className={cn(
                          "flex items-center gap-3 p-3 bg-[#1A1B1E] border border-white/5 rounded-xl cursor-pointer hover:border-white/10 transition-all",
                          uploading && "opacity-50 cursor-not-allowed"
                        )}>
                          <input
                            type="checkbox"
                            disabled={uploading}
                            checked={selectedPrograms.includes(p)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPrograms([...selectedPrograms, p]);
                              } else {
                                setSelectedPrograms(selectedPrograms.filter(prog => prog !== p));
                              }
                            }}
                            className="w-4 h-4 rounded border-white/10 bg-black text-blue-600 focus:ring-blue-600 focus:ring-offset-0"
                          />
                          <span className="text-xs text-gray-400">{p}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Description</label>
                    <textarea
                      value={description}
                      disabled={uploading}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-[#1A1B1E] border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-600/50 h-24 resize-none disabled:opacity-50"
                      placeholder="Briefly describe the document contents..."
                    />
                  </div>

                  <div 
                    onClick={() => !uploading && fileInputRef.current?.click()}
                    onDragOver={(e) => !uploading && handleDragOver(e)}
                    onDragLeave={(e) => !uploading && handleDragLeave(e)}
                    onDrop={(e) => !uploading && handleDrop(e)}
                    className={cn(
                      "border-2 border-dashed rounded-2xl p-8 text-center transition-all group",
                      !uploading && "cursor-pointer",
                      isDragging 
                        ? "border-blue-500 bg-blue-600/10" 
                        : "border-white/5 hover:border-blue-600/30",
                      uploading && "opacity-50 cursor-not-allowed grayscale"
                    )}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      disabled={uploading}
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="hidden"
                      accept=".pdf"
                    />
                    {file ? (
                      <div className="flex items-center justify-center gap-3 text-blue-500">
                        <FileText className="w-8 h-8" />
                        <div className="text-left">
                          <p className="text-sm font-bold truncate max-w-[200px]">{file.name}</p>
                          <p className="text-[10px] opacity-60">{formatBytes(file.size)}</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <Upload className={cn(
                          "w-10 h-10 mx-auto mb-4 transition-colors",
                          isDragging ? "text-blue-500" : "text-gray-700 group-hover:text-blue-500"
                        )} />
                        <p className="text-sm text-gray-500 font-medium">
                          {isDragging ? 'Drop it here!' : 'Click or drag a PDF document here'}
                        </p>
                        <p className="text-[10px] text-gray-700 mt-1 uppercase tracking-widest font-bold">Max size 10MB</p>
                      </>
                    )}
                  </div>

                  {uploadError && (
                    <div className="space-y-4">
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-bold leading-relaxed">
                        {uploadError}
                      </div>
                      <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Cloudinary Setup Helper</p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-gray-600">Cloud Name:</span>
                            <span className="text-white font-mono">{(process.env.VITE_CLOUDINARY_CLOUD_NAME || '').substring(0, 4)}****</span>
                          </div>
                          <div className="flex justify-between text-[10px]">
                            <span className="text-gray-600">Upload Preset:</span>
                            <span className="text-white font-mono">{(process.env.VITE_CLOUDINARY_UPLOAD_PRESET || '').substring(0, 4)}****</span>
                          </div>
                        </div>
                        <p className="text-[9px] text-gray-500 leading-relaxed">
                          Your Cloud Name is usually a short string like <code className="text-blue-400">dxy123abc</code>. 
                          If it shows <code className="text-white">1***</code>, it is likely a placeholder. 
                          Find it on your <a href="https://cloudinary.com/console" target="_blank" rel="noreferrer" className="text-blue-500 underline">Cloudinary Dashboard</a>.
                        </p>
                      </div>
                    </div>
                  )}

                  {uploading && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                          <span>Uploading...</span>
                          <span>{Math.round(uploadProgress)}%</span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadProgress}%` }}
                            className="bg-blue-600 h-full"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={cancelUpload}
                        className="w-full py-2 text-[10px] font-bold text-red-500 uppercase tracking-widest hover:text-red-400 transition-colors"
                      >
                        Cancel Upload
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={uploading || !file || !title}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {uploading ? `Uploading (${Math.round(uploadProgress)}%)` : 'Confirm Upload'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
