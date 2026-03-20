import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { AuthGuard } from './components/AuthGuard';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Library from './pages/Library';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import Blocked from './pages/Blocked';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/blocked" element={<Blocked />} />
          
          <Route path="/onboarding" element={
            <AuthGuard>
              <Onboarding />
            </AuthGuard>
          } />

          <Route path="/" element={
            <AuthGuard>
              <Library />
            </AuthGuard>
          } />

          <Route path="/admin" element={
            <AuthGuard requireAdmin>
              <AdminDashboard />
            </AuthGuard>
          } />

          <Route path="/admin/users" element={
            <AuthGuard requireAdmin>
              <AdminUsers />
            </AuthGuard>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
