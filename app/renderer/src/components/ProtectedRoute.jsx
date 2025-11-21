import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';

function ProtectedRoute({ children, requiredRole = null }) {
  const { currentUser } = useUser();

  // Si no hay usuario, redirigir al login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Si se requiere un rol específico y el usuario no lo tiene
  if (requiredRole && currentUser.rol !== requiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;

