import { useEffect, useId, useState } from 'react';
import { LogIn, Lock, User, AlertCircle, UserPlus, ShieldCheck } from 'lucide-react';
import { login, existenUsuarios, crearPrimerAdmin } from '../services/dbService';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [modo, setModo] = useState('cargando'); // 'cargando' | 'login' | 'primer-admin'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Estado del primer admin
  const [adminData, setAdminData] = useState({
    nombre: '',
    username: 'admin',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const { onLoginSuccess } = useUser();
  const navigate = useNavigate();

  const usernameId = useId();
  const passwordId = useId();
  const adminNombreId = useId();
  const adminUsernameId = useId();
  const adminEmailId = useId();
  const adminPasswordId = useId();
  const adminConfirmPasswordId = useId();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await existenUsuarios();
        if (cancelled) return;
        setModo(res?.existen ? 'login' : 'primer-admin');
      } catch (e) {
        console.error('Error al verificar usuarios:', e);
        if (!cancelled) setModo('login');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const resultado = await login(username, password);
      if (resultado?.success && resultado.usuario && resultado.sessionId) {
        onLoginSuccess(resultado.usuario, resultado.sessionId);
        navigate('/dashboard');
      } else {
        setError(resultado?.error || 'Usuario o contraseña incorrectos');
      }
    } catch (err) {
      console.error('Error al iniciar sesión:', err);
      setError('Error al conectar con el servidor. Por favor, intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleCrearAdmin = async (e) => {
    e.preventDefault();
    setError('');

    if (!adminData.nombre.trim()) return setError('El nombre es obligatorio');
    if (!adminData.username.trim()) return setError('El usuario es obligatorio');
    if (adminData.password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres');
    if (!/[A-Z]/.test(adminData.password)) return setError('La contraseña debe incluir al menos una letra mayúscula');
    if (!/\d/.test(adminData.password)) return setError('La contraseña debe incluir al menos un número');
    if (adminData.password !== adminData.confirmPassword) return setError('Las contraseñas no coinciden');

    setLoading(true);
    try {
      const res = await crearPrimerAdmin({
        nombre: adminData.nombre.trim(),
        username: adminData.username.trim(),
        email: adminData.email.trim() || null,
        password: adminData.password,
      });
      if (!res?.success) {
        setError('No se pudo crear el administrador');
        return;
      }
      // Login automático con las credenciales recién creadas
      const resultado = await login(adminData.username.trim(), adminData.password);
      if (resultado?.success && resultado.sessionId) {
        onLoginSuccess(resultado.usuario, resultado.sessionId);
        navigate('/dashboard');
      } else {
        setError('Administrador creado, pero no se pudo iniciar sesión. Intenta manualmente.');
        setModo('login');
      }
    } catch (err) {
      console.error('Error al crear primer admin:', err);
      setError(err?.message || 'Error al crear el administrador');
    } finally {
      setLoading(false);
    }
  };

  if (modo === 'cargando') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-full mb-4">
            <span className="text-4xl">🦷</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">OdontoSoft</h1>
          <p className="text-gray-600">
            {modo === 'primer-admin' ? 'Configura tu cuenta de administrador' : 'Sistema de Gestión Clínica'}
          </p>
        </div>

        {error && (
          <div className="alert alert-error mb-4">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {modo === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="form-control">
              <label className="label" htmlFor={usernameId}>
                <span className="label-text font-medium">Usuario</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  id={usernameId}
                  type="text"
                  className="input input-bordered w-full pl-10"
                  placeholder="Ingresa tu usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label" htmlFor={passwordId}>
                <span className="label-text font-medium">Contraseña</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  id={passwordId}
                  type="password"
                  className="input input-bordered w-full pl-10"
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full gap-2" disabled={loading}>
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
        ) : (
          <form onSubmit={handleCrearAdmin} className="space-y-4">
            <div className="alert alert-info text-sm">
              <ShieldCheck size={20} />
              <span>Es la primera vez que abres OdontoSoft. Crea la cuenta del administrador.</span>
            </div>

            <div className="form-control">
              <label className="label" htmlFor={adminNombreId}>
                <span className="label-text font-medium">Nombre completo</span>
              </label>
              <input
                id={adminNombreId}
                type="text"
                className="input input-bordered w-full"
                placeholder="Ej: Dra. María Pérez"
                value={adminData.nombre}
                onChange={(e) => setAdminData({ ...adminData, nombre: e.target.value })}
                required
              />
            </div>

            <div className="form-control">
              <label className="label" htmlFor={adminUsernameId}>
                <span className="label-text font-medium">Usuario</span>
              </label>
              <input
                id={adminUsernameId}
                type="text"
                className="input input-bordered w-full"
                value={adminData.username}
                onChange={(e) => setAdminData({ ...adminData, username: e.target.value })}
                required
              />
            </div>

            <div className="form-control">
              <label className="label" htmlFor={adminEmailId}>
                <span className="label-text font-medium">Email (opcional)</span>
              </label>
              <input
                id={adminEmailId}
                type="email"
                className="input input-bordered w-full"
                value={adminData.email}
                onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
              />
            </div>

            <div className="form-control">
              <label className="label" htmlFor={adminPasswordId}>
                <span className="label-text font-medium">Contraseña</span>
              </label>
              <input
                id={adminPasswordId}
                type="password"
                className="input input-bordered w-full"
                placeholder="Mín. 8 caracteres, 1 mayúscula y 1 número"
                value={adminData.password}
                onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                required
                minLength={8}
              />
            </div>

            <div className="form-control">
              <label className="label" htmlFor={adminConfirmPasswordId}>
                <span className="label-text font-medium">Confirmar contraseña</span>
              </label>
              <input
                id={adminConfirmPasswordId}
                type="password"
                className="input input-bordered w-full"
                value={adminData.confirmPassword}
                onChange={(e) => setAdminData({ ...adminData, confirmPassword: e.target.value })}
                required
                minLength={8}
              />
            </div>

            <button type="submit" className="btn btn-primary w-full gap-2" disabled={loading}>
              {loading ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Creando cuenta...
                </>
              ) : (
                <>
                  <UserPlus size={20} />
                  Crear administrador
                </>
              )}
            </button>
          </form>
        )}
      </div>
      </div>
    </div>
  );
}

export default Login;
