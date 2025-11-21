import { useState } from 'react';
import { LogIn, Lock, User, AlertCircle } from 'lucide-react';
import { login } from '../services/dbService';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { updateUser } = useUser();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const resultado = await login(username, password);
      
      if (resultado.success && resultado.usuario) {
        updateUser(resultado.usuario);
        navigate('/dashboard');
      } else {
        setError(resultado.error || 'Usuario o contraseña incorrectos');
      }
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      setError('Error al conectar con el servidor. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-4">
            <span className="text-4xl">🦷</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">OdontoSoft</h1>
          <p className="text-gray-600">Sistema de Gestión Clínica</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Usuario</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                className="input input-bordered w-full pl-10"
                placeholder="Ingresa tu usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Contraseña</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="password"
                className="input input-bordered w-full pl-10"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className={`btn btn-primary w-full gap-2 ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading loading-spinner"></span>
                Iniciando sesión...
              </>
            ) : (
              <>
                <LogIn size={20} />
                Iniciar Sesión
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Usuario por defecto: <strong>admin</strong> / Contraseña: <strong>admin</strong></p>
        </div>
      </div>
    </div>
  );
}

export default Login;

