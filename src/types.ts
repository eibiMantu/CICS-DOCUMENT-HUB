export type UserRole = 'owner-admin' | 'admin' | 'student';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  program?: string;
  isBlocked?: boolean;
  isArchived?: boolean;
  createdAt: string;
}

export interface DocumentMetadata {
  id: string;
  title: string;
  description: string;
  category: string;
  fileUrl: string;
  fileSize: string;
  uploadedBy: string;
  createdAt: string;
  downloadCount: number;
  allowedPrograms: string[];
  isArchived?: boolean;
}

export interface DownloadLog {
  id: string;
  userId: string;
  documentId: string;
  timestamp: string;
}
