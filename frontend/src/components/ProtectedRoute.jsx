import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin) {
    try {
      const user = JSON.parse(userStr || '{}');
      if (!user.isAdmin) {
        return <Navigate to="/" replace />;
      }
    } catch (e) {
      return <Navigate to="/login" replace />;
    }
  }

  return children;
}
