import { Routes, Route, Navigate } from 'react-router-dom';
import { UserProvider, useUser } from './context/UserContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import WelcomeWizard from './components/WelcomeWizard';
import Dashboard from './pages/Dashboard';
import Calendario from './pages/Calendario';
import Pacientes from './pages/Pacientes';
import Odontologos from './pages/Odontologos';
import Horarios from './pages/Horarios';
import Citas from './pages/Citas';
import Tratamientos from './pages/Tratamientos';
import Facturacion from './pages/Facturacion';
import Almacen from './pages/Almacen';
import HistoriasClinicas from './pages/HistoriasClinicas';
import PlanesTratamiento from './pages/PlanesTratamiento';
import Prescripciones from './pages/Prescripciones';
import Usuarios from './pages/Usuarios';
import Promociones from './pages/Promociones';
import Backups from './pages/Backups';
import Configuracion from './pages/Configuracion';
import Reportes from './pages/Reportes';
import Licencia from './pages/Licencia';

function AppContent() {
  const { currentUser, hydrating, setupCompletado } = useUser();

  // Mientras se valida la sesión guardada, mostrar splash
  if (hydrating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  // Si hay usuario admin pero el setup aún no se completó, mostrar wizard
  if (currentUser && !setupCompletado && currentUser.rol === 'admin') {
    return <WelcomeWizard />;
  }

  // Si no hay usuario, mostrar solo login
  if (!currentUser) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Si hay usuario, mostrar la aplicación completa
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/calendario" element={<ProtectedRoute><Calendario /></ProtectedRoute>} />
            <Route path="/pacientes" element={<ProtectedRoute><Pacientes /></ProtectedRoute>} />
            <Route path="/odontologos" element={<ProtectedRoute requiredRole="admin"><Odontologos /></ProtectedRoute>} />
            <Route path="/horarios" element={<ProtectedRoute requiredRole="admin"><Horarios /></ProtectedRoute>} />
            <Route path="/citas" element={<ProtectedRoute><Citas /></ProtectedRoute>} />
            <Route path="/tratamientos" element={<ProtectedRoute><Tratamientos /></ProtectedRoute>} />
            <Route path="/planes-tratamiento" element={<ProtectedRoute><PlanesTratamiento /></ProtectedRoute>} />
            <Route path="/prescripciones" element={<ProtectedRoute><Prescripciones /></ProtectedRoute>} />
            <Route path="/facturacion" element={<ProtectedRoute><Facturacion /></ProtectedRoute>} />
            <Route path="/almacen" element={<ProtectedRoute><Almacen /></ProtectedRoute>} />
            <Route path="/historias" element={<ProtectedRoute><HistoriasClinicas /></ProtectedRoute>} />
            <Route path="/usuarios" element={<ProtectedRoute requiredRole="admin"><Usuarios /></ProtectedRoute>} />
            <Route path="/promociones" element={<ProtectedRoute><Promociones /></ProtectedRoute>} />
            <Route path="/backups" element={<ProtectedRoute requiredRole="admin"><Backups /></ProtectedRoute>} />
            <Route path="/configuracion" element={<ProtectedRoute requiredRole="admin"><Configuracion /></ProtectedRoute>} />
            <Route path="/reportes" element={<ProtectedRoute><Reportes /></ProtectedRoute>} />
            <Route path="/licencia" element={<ProtectedRoute requiredRole="admin"><Licencia /></ProtectedRoute>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}

export default App;

