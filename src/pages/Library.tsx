import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp, increment, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import { DocumentMetadata } from '../types';
import Layout from '../components/Layout';
import { Search, Download, FileText, Filter, X, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { PROGRAMS } from '../constants';

const CATEGORIES = ['All', 'Curriculum', 'Manual', 'Forms', 'Guide', 'Academic'];

export default function Library() {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [activeTab, setActiveTab] = useState<'all' | 'my-downloads'>('all');
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState<string>('');

  useEffect(() => {
    if (profile) {
      if (profile.program && !selectedProgram) {
        setSelectedProgram(profile.program);
      } else if (!profile.program && !selectedProgram && (profile.role === 'admin' || profile.role === 'owner-admin')) {
        setSelectedProgram('All Programs');
      }
    }
  }, [profile]);

  useEffect(() => {
    if (!profile) return;

    // Use a simple query and filter client-side to handle missing fields (like isArchived)
    // and complex visibility logic (like "All Programs") reliably.
    const q = query(collection(db, 'documents'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DocumentMetadata));
      setDocuments(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'documents');
    });

    return () => {
      unsubscribe();
    };
  }, [profile?.uid]);

  // Derived state for downloads
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);
  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, 'logs'), where('userId', '==', profile.uid));
    return onSnapshot(q, (snap) => {
      setDownloadedIds(Array.from(new Set(snap.docs.map(d => d.data().documentId))));
    });
  }, [profile?.uid]);

  const myDownloads = documents.filter(d => downloadedIds.includes(d.id));
  const currentDocs = activeTab === 'all' ? documents : myDownloads;

  const filteredDocs = currentDocs.filter(doc => {
    const matchesSearch = (doc.title || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All' || doc.category === category;
    
    // Visibility check
    const isAdmin = profile?.role === 'admin' || profile?.role === 'owner-admin';
    
    // A document is visible if:
    // 1. User is Admin/Owner AND no specific program is selected for "view as"
    // 2. OR (Document is NOT archived AND user's program is allowed)
    const isNotArchived = doc.isArchived !== true;
    const isVisibleToProgram = selectedProgram === 'All Programs' || 
                               !doc.allowedPrograms || 
                               doc.allowedPrograms.length === 0 || 
                               (selectedProgram && doc.allowedPrograms?.includes(selectedProgram));
    
    // If admin, they see exactly what a student in the selected program sees.
    // However, "All Programs" view shows everything that isn't archived.
    const matchesVisibility = isNotArchived && isVisibleToProgram;

    return matchesSearch && matchesCategory && matchesVisibility;
  });

  const handleDownload = async (docData: DocumentMetadata) => {
    if (profile?.isBlocked) {
      setShowBlockedModal(true);
      return;
    }

    try {
      // Log the download
      await addDoc(collection(db, 'logs'), {
        userId: profile?.uid,
        documentId: docData.id,
        timestamp: new Date().toISOString()
      });

      // Increment download count
      await updateDoc(doc(db, 'documents', docData.id), {
        downloadCount: increment(1)
      });

      // Extract extension from URL
      const urlParts = docData.fileUrl.split('.');
      const extension = urlParts.length > 1 ? urlParts[urlParts.length - 1].split('?')[0] : 'pdf';

      // Use direct URL to avoid 401 errors from Cloudinary transformations (like fl_attachment)
      // if the user has "Strict Transformations" enabled in their dashboard.
      const downloadUrl = docData.fileUrl;

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      // Note: download attribute only works for same-origin or with Content-Disposition header
      link.setAttribute('download', `${docData.title}.${extension}`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'logs/documents');
    }
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <h1 className="text-3xl font-bold text-white mb-2">Digital Library</h1>
          <div className="flex items-center gap-2 text-gray-500">
            <span>Resources for</span>
            {(profile?.role === 'admin' || profile?.role === 'owner-admin') ? (
              <div className="relative inline-block">
                <select
                  value={selectedProgram}
                  onChange={(e) => setSelectedProgram(e.target.value)}
                  className="bg-transparent border-b border-gray-700 text-blue-500 font-bold focus:outline-none focus:border-blue-500 cursor-pointer pr-4 appearance-none"
                >
                  <option value="All Programs" className="bg-[#0A0B0D]">All Programs</option>
                  {PROGRAMS.map(p => (
                    <option key={p} value={p} className="bg-[#0A0B0D]">{p.split(' - ').pop()}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" />
              </div>
            ) : (
              <span className="text-blue-500 font-bold">
                {selectedProgram ? selectedProgram.split(' - ').pop() : 'your program'}
              </span>
            )}
            <span>students</span>
          </div>
        </header>

        <div className="flex gap-1 bg-[#151619] p-1 rounded-xl border border-white/5 mb-8 w-fit">
          <button
            onClick={() => setActiveTab('all')}
            className={cn(
              "px-6 py-2 rounded-lg text-xs font-bold transition-all",
              activeTab === 'all' ? "bg-white/10 text-white" : "text-gray-600 hover:text-gray-400"
            )}
          >
            All Documents
          </button>
          <button
            onClick={() => setActiveTab('my-downloads')}
            className={cn(
              "px-6 py-2 rounded-lg text-xs font-bold transition-all",
              activeTab === 'my-downloads' ? "bg-white/10 text-white" : "text-gray-600 hover:text-gray-400"
            )}
          >
            My Downloads
          </button>
        </div>

        <div className="flex flex-col gap-6 mb-12">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Search by title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#151619] border border-white/5 rounded-2xl pl-12 pr-4 py-4 text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-600/50 transition-all"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  "px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                  category === cat
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "bg-[#151619] border border-white/5 text-gray-500 hover:text-gray-300 hover:border-white/10"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-48 bg-[#151619] rounded-3xl animate-pulse border border-white/5" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredDocs.map((doc) => (
                <motion.div
                  key={doc.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-[#151619] border border-white/5 rounded-3xl p-6 hover:border-blue-600/30 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4">
                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-lg">
                      {doc.fileSize}
                    </span>
                  </div>

                  <div className="mb-6">
                    <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-500 mb-4 group-hover:scale-110 transition-transform">
                      <FileText className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-2 block">
                      {doc.category}
                    </span>
                    <h3 className="text-lg font-bold text-white mb-2 line-clamp-1">{doc.title}</h3>
                    <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                      {doc.description}
                    </p>
                    {doc.allowedPrograms && doc.allowedPrograms.length > 0 && doc.allowedPrograms.length < PROGRAMS.length && (
                      <div className="mt-4 flex flex-wrap gap-1">
                        <span className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">Available for:</span>
                        {doc.allowedPrograms.map((p, idx) => (
                          <span key={p} className="text-[8px] font-bold text-blue-500 uppercase tracking-widest">
                            {p.split(' - ').pop()}{idx < doc.allowedPrograms.length - 1 ? ',' : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-white/5">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Download className="w-4 h-4" />
                      <span className="text-xs font-semibold">{doc.downloadCount || 0}</span>
                    </div>
                    <button
                      onClick={() => handleDownload(doc)}
                      className="flex items-center gap-2 text-blue-500 hover:text-blue-400 font-bold text-sm transition-colors"
                    >
                      Download
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {!loading && filteredDocs.length === 0 && (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-600">
              <Search className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No documents found</h3>
            <p className="text-gray-500">Try adjusting your search or category filters</p>
          </div>
        )}

        {/* Blocked Modal */}
        <AnimatePresence>
          {showBlockedModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowBlockedModal(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-sm bg-[#151619] border border-red-500/20 rounded-3xl p-8 text-center shadow-2xl"
              >
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6">
                  <X className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Your account is restricted</h2>
                <p className="text-gray-500 mb-8">
                  Your access has been restricted by the administrator. Downloads are currently disabled for your account.
                </p>
                <button
                  onClick={() => setShowBlockedModal(false)}
                  className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-4 rounded-xl transition-all"
                >
                  Close
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
