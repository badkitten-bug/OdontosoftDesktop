import { useEffect, useId, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Lock, LogIn, ShieldCheck, User, UserPlus } from 'lucide-react';
import { login, existenUsuarios, crearPrimerAdmin, recuperarPassword, getUsuariosPublicos } from '../services/dbService';
import { useUser } from '../context/UserContext';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [modo, setModo] = useState('cargando'); // 'cargando' | 'login' | 'primer-admin'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState({ login: false, adminPwd: false, adminConfirm: false, recPwd: false, recConfirm: false });
  const [usuariosLogin, setUsuariosLogin] = useState([]); // lista pública para el selector de usuario

  // Estado del primer admin
  const [adminData, setAdminData] = useState({
    nombre: '',
    username: 'admin',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // Estado de recuperación de contraseña (2 pasos)
  const [recuperar, setRecuperar] = useState({ nombreClinica: '', selectedUser: '', newPassword: '', confirmPassword: '' });
  const [usuariosAdmin, setUsuariosAdmin] = useState([]); // paso 1 → lista de admins
  const [recuperado, setRecuperado] = useState(false);

  const { onLoginSuccess } = useUser();
  const navigate = useNavigate();

  const usernameId = useId();
  const passwordId = useId();
  const adminNombreId = useId();
  const adminUsernameId = useId();
  const adminEmailId = useId();
  const adminPasswordId = useId();
  const adminConfirmPasswordId = useId();
  const recClinicaId = useId();
  const recPasswordId = useId();
  const recConfirmId = useId();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [res, pub] = await Promise.all([existenUsuarios(), getUsuariosPublicos()]);
        if (cancelled) return;
        if (pub?.ok && pub.usuarios?.length) {
          setUsuariosLogin(pub.usuarios);
          // Si solo hay un usuario, pre-rellena el campo
          if (pub.usuarios.length === 1) setUsername(pub.usuarios[0].username);
        }
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

  const handleVerificarClinica = async (e) => {
    e.preventDefault();
    setError('');
    if (!recuperar.nombreClinica.trim()) return setError('Escribe el nombre de tu clínica');
    setLoading(true);
    try {
      const res = await recuperarPassword({ nombreClinica: recuperar.nombreClinica });
      if (res?.success && res.usuarios?.length) {
        setUsuariosAdmin(res.usuarios);
        setRecuperar((r) => ({ ...r, selectedUser: res.usuarios[0].username }));
      } else {
        setError(res?.error || 'El nombre de la clínica no coincide');
      }
    } catch (err) {
      setError(err?.message || 'Error al verificar');
    } finally {
      setLoading(false);
    }
  };

  const handleRecuperar = async (e) => {
    e.preventDefault();
    setError('');
    if (!recuperar.selectedUser) return setError('Selecciona un usuario');
    if (recuperar.newPassword.length < 8) return setError('La contraseña debe tener al menos 8 caracteres');
    if (!/[A-Z]/.test(recuperar.newPassword)) return setError('Debe incluir al menos una letra mayúscula');
    if (!/\d/.test(recuperar.newPassword)) return setError('Debe incluir al menos un número');
    if (recuperar.newPassword !== recuperar.confirmPassword) return setError('Las contraseñas no coinciden');
    setLoading(true);
    try {
      const res = await recuperarPassword({ nombreClinica: recuperar.nombreClinica, username: recuperar.selectedUser, newPassword: recuperar.newPassword });
      if (res?.success) {
        setRecuperado(true);
        setError('');
      } else {
        setError(res?.error || 'No se pudo restablecer la contraseña');
      }
    } catch (err) {
      setError(err?.message || 'Error al restablecer');
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
      <div className={`bg-white rounded-2xl shadow-xl w-full ${modo === 'primer-admin' ? 'p-6 max-w-lg' : 'p-8 max-w-md'}`}>
        <div className={`text-center ${modo === 'primer-admin' ? 'mb-4' : 'mb-8'}`}>
          <div className={`inline-flex items-center justify-center bg-blue-600 rounded-full mb-3 ${modo === 'primer-admin' ? 'w-12 h-12' : 'w-20 h-20'}`}>
            <span className={modo === 'primer-admin' ? 'text-2xl' : 'text-4xl'}>🦷</span>
          </div>
          <h1 className={`font-bold text-gray-800 mb-1 ${modo === 'primer-admin' ? 'text-xl' : 'text-3xl'}`}>OdontoSoft</h1>
          <p className="text-gray-600 text-sm">
            {modo === 'primer-admin' ? 'Configura tu cuenta de administrador' : modo === 'recuperar' ? 'Restablecer contraseña' : 'Sistema de Gestión Clínica'}
          </p>
        </div>

        {error && (
          <div className="alert alert-error mb-4">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {modo === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Selector de usuario estilo Facebook — solo si hay múltiples */}
            {usuariosLogin.length > 1 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Selecciona tu cuenta:</p>
                <div className="flex flex-wrap gap-2">
                  {usuariosLogin.map((u) => (
                    <button
                      key={u.username}
                      type="button"
                      onClick={() => { setUsername(u.username); setPassword(''); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm transition ${username === u.username ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}
                    >
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {u.nombre ? u.nombre[0].toUpperCase() : u.username[0].toUpperCase()}
                      </div>
                      <div className="text-left">
                        <p className="leading-tight">{u.nombre || u.username}</p>
                        {u.nombre && <p className="text-xs text-gray-400 leading-tight">@{u.username}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="form-control">
              <label className="label py-1" htmlFor={usernameId}>
                <span className="label-text font-medium">Usuario</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  id={usernameId}
                  type="text"
                  className="input input-bordered w-full pl-10 input-sm h-10"
                  placeholder="Ingresa tu usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label py-1" htmlFor={passwordId}>
                <span className="label-text font-medium">Contraseña</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  id={passwordId}
                  type={showPwd.login ? 'text' : 'password'}
                  className="input input-bordered w-full pl-10 pr-10 input-sm h-10"
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="button" tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowPwd((p) => ({ ...p, login: !p.login }))}>
                  {showPwd.login ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
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
                  <LogIn size={18} />
                  Iniciar Sesión
                </>
              )}
            </button>
            <div className="text-center pt-1">
              <button
                type="button"
                className="text-xs text-blue-500 hover:underline"
                onClick={() => { setModo('recuperar'); setError(''); setRecuperado(false); setRecuperar({ nombreClinica: '', newPassword: '', confirmPassword: '' }); }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          </form>

        ) : modo === 'recuperar' ? (
          <div className="space-y-4">
            {recuperado ? (
              <div className="text-center space-y-4">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 size={28} />
                </div>
                <p className="font-semibold text-gray-800">Contraseña restablecida</p>
                <p className="text-sm text-gray-500">
                  Ya puedes iniciar sesión con el usuario <strong>{recuperar.selectedUser}</strong>.
                </p>
                <button type="button" className="btn btn-primary w-full" onClick={() => { setModo('login'); setError(''); setUsername(recuperar.selectedUser); }}>
                  Ir al inicio de sesión
                </button>
              </div>
            ) : usuariosAdmin.length === 0 ? (
              /* Paso 1: verificar nombre de clínica */
              <form onSubmit={handleVerificarClinica} className="space-y-3">
                <div className="alert alert-info py-2 text-xs">
                  <KeyRound size={16} />
                  <span>Escribe el nombre de tu clínica para ver los usuarios disponibles.</span>
                </div>
                <div className="form-control">
                  <label className="label py-1" htmlFor={recClinicaId}>
                    <span className="label-text font-medium text-xs">Nombre de la clínica</span>
                  </label>
                  <input
                    id={recClinicaId}
                    type="text"
                    className="input input-bordered w-full input-sm h-10"
                    placeholder="Ej: Clínica Dental Sonrisa"
                    value={recuperar.nombreClinica}
                    onChange={(e) => setRecuperar({ ...recuperar, nombreClinica: e.target.value })}
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary w-full gap-2" disabled={loading}>
                  {loading ? <span className="loading loading-spinner"></span> : <KeyRound size={18} />}
                  Verificar clínica
                </button>
                <div className="text-center">
                  <button type="button" className="text-xs text-blue-500 hover:underline" onClick={() => { setModo('login'); setError(''); }}>
                    Volver al inicio de sesión
                  </button>
                </div>
              </form>
            ) : (
              /* Paso 2: seleccionar usuario y nueva contraseña */
              <form onSubmit={handleRecuperar} className="space-y-3">
                <div className="alert alert-success py-2 text-xs">
                  <CheckCircle2 size={16} />
                  <span>Clínica verificada. Selecciona tu usuario y pon una nueva contraseña.</span>
                </div>
                <div className="form-control">
                  <p className="label-text font-medium text-xs py-1">Tu usuario</p>
                  <div className="flex flex-col gap-2">
                    {usuariosAdmin.map((u) => (
                      <label key={u.username} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${recuperar.selectedUser === u.username ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input
                          type="radio"
                          name="selectedUser"
                          className="radio radio-primary radio-sm"
                          value={u.username}
                          checked={recuperar.selectedUser === u.username}
                          onChange={() => setRecuperar({ ...recuperar, selectedUser: u.username })}
                        />
                        <div>
                          <p className="font-semibold text-sm text-gray-800">{u.username}</p>
                          {u.nombre && <p className="text-xs text-gray-500">{u.nombre}</p>}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="form-control">
                    <label className="label py-1" htmlFor={recPasswordId}>
                      <span className="label-text font-medium text-xs">Nueva contraseña</span>
                    </label>
                    <div className="relative">
                      <input
                        id={recPasswordId}
                        type={showPwd.recPwd ? 'text' : 'password'}
                        className="input input-bordered w-full input-sm h-10 pr-10"
                        placeholder="Mín. 8, 1 MAY, 1 núm."
                        value={recuperar.newPassword}
                        onChange={(e) => setRecuperar({ ...recuperar, newPassword: e.target.value })}
                        required
                      />
                      <button type="button" tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowPwd((p) => ({ ...p, recPwd: !p.recPwd }))}>
                        {showPwd.recPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div className="form-control">
                    <label className="label py-1" htmlFor={recConfirmId}>
                      <span className="label-text font-medium text-xs">Confirmar</span>
                    </label>
                    <div className="relative">
                      <input
                        id={recConfirmId}
                        type={showPwd.recConfirm ? 'text' : 'password'}
                        className="input input-bordered w-full input-sm h-10 pr-10"
                        placeholder="Repite la contraseña"
                        value={recuperar.confirmPassword}
                        onChange={(e) => setRecuperar({ ...recuperar, confirmPassword: e.target.value })}
                        required
                      />
                      <button type="button" tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowPwd((p) => ({ ...p, recConfirm: !p.recConfirm }))}>
                        {showPwd.recConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary w-full gap-2" disabled={loading}>
                  {loading ? <span className="loading loading-spinner"></span> : <KeyRound size={18} />}
                  Restablecer contraseña
                </button>
                <div className="text-center">
                  <button type="button" className="text-xs text-blue-500 hover:underline" onClick={() => { setUsuariosAdmin([]); setError(''); }}>
                    ← Volver
                  </button>
                </div>
              </form>
            )}
          </div>
        ) : (
          <form onSubmit={handleCrearAdmin} className="space-y-3">
            <div className="alert alert-info py-2 text-xs">
              <ShieldCheck size={16} />
              <span>Primera vez: crea tu cuenta de administrador.</span>
            </div>

            {/* Nombre completo */}
            <div className="form-control">
              <label className="label py-1" htmlFor={adminNombreId}>
                <span className="label-text font-medium text-xs">Nombre completo</span>
              </label>
              <input
                id={adminNombreId}
                type="text"
                className="input input-bordered w-full input-sm h-10"
                placeholder="Ej: Dra. María Pérez"
                value={adminData.nombre}
                onChange={(e) => setAdminData({ ...adminData, nombre: e.target.value })}
                required
              />
            </div>

            {/* Usuario + Email en fila */}
            <div className="grid grid-cols-2 gap-3">
              <div className="form-control">
                <label className="label py-1" htmlFor={adminUsernameId}>
                  <span className="label-text font-medium text-xs">Usuario</span>
                </label>
                <input
                  id={adminUsernameId}
                  type="text"
                  className="input input-bordered w-full input-sm h-10"
                  value={adminData.username}
                  onChange={(e) => setAdminData({ ...adminData, username: e.target.value })}
                  required
                />
              </div>
              <div className="form-control">
                <label className="label py-1" htmlFor={adminEmailId}>
                  <span className="label-text font-medium text-xs">Email (opcional)</span>
                </label>
                <input
                  id={adminEmailId}
                  type="email"
                  className="input input-bordered w-full input-sm h-10"
                  placeholder="correo@ejemplo.com"
                  value={adminData.email}
                  onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                />
              </div>
            </div>

            {/* Contraseña + Confirmar en fila */}
            <div className="grid grid-cols-2 gap-3">
              <div className="form-control">
                <label className="label py-1" htmlFor={adminPasswordId}>
                  <span className="label-text font-medium text-xs">Contraseña</span>
                </label>
                <div className="relative">
                  <input
                    id={adminPasswordId}
                    type={showPwd.adminPwd ? 'text' : 'password'}
                    className="input input-bordered w-full input-sm h-10 pr-10"
                    placeholder="Mín. 8 car., 1 MAY, 1 núm."
                    value={adminData.password}
                    onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                    required
                    minLength={8}
                  />
                  <button type="button" tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowPwd((p) => ({ ...p, adminPwd: !p.adminPwd }))}>
                    {showPwd.adminPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="form-control">
                <label className="label py-1" htmlFor={adminConfirmPasswordId}>
                  <span className="label-text font-medium text-xs">Confirmar contraseña</span>
                </label>
                <div className="relative">
                  <input
                    id={adminConfirmPasswordId}
                    type={showPwd.adminConfirm ? 'text' : 'password'}
                    className="input input-bordered w-full input-sm h-10 pr-10"
                    placeholder="Repite la contraseña"
                    value={adminData.confirmPassword}
                    onChange={(e) => setAdminData({ ...adminData, confirmPassword: e.target.value })}
                    required
                    minLength={8}
                  />
                  <button type="button" tabIndex={-1} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowPwd((p) => ({ ...p, adminConfirm: !p.adminConfirm }))}>
                    {showPwd.adminConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full gap-2 mt-1" disabled={loading}>
              {loading ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Creando cuenta...
                </>
              ) : (
                <>
                  <UserPlus size={18} />
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
