import React, { useState } from 'react';
import {
  IonPage,
  IonContent,
  IonSpinner,
  IonModal,
  useIonRouter
} from '@ionic/react';
import { supabase } from '../services/supabaseCliente';

export const Login: React.FC = () => {
  const router = useIonRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });

  const [cargando, setCargando] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [tipoModal, setTipoModal] = useState<'cargando' | 'exito' | 'error'>('cargando');
  const [errorLogin, setErrorLogin] = useState<string | null>(null);

  const roles = [
    { label: 'Dueño', email: 'dueno@restaurante.com' },
    { label: 'Supervisor', email: 'supervisor@restaurante.com' },
    { label: 'Mozo', email: 'mozo@restaurante.com' },
    { label: 'Cocinero', email: 'cocinero@restaurante.com' },
    { label: 'Cantinero', email: 'cantinero@restaurante.com' },
    { label: 'Cliente', email: 'cliente@restaurante.com' }
  ];

  const cargarAccesoRapido = (correoPrueba: string) => {
    setEmail(correoPrueba);
    setPassword('123456');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });

    if (!email || !password || password.length < 6) return;

    setCargando(true);
    setMostrarModal(true);
    setTipoModal('cargando');
    setErrorLogin(null);

    try {
      // 1. Login contra Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      console.log('auth signIn ->', { data, error }); // TEMPORAL: sacar cuando funcione

      if (error || !data.user) {
        setErrorLogin(error?.message ?? 'Email o contraseña incorrectos.');
        setTipoModal('error');
        setCargando(false);
        return;
      }

      // 2. Buscamos el perfil real en la tabla `usuarios`
      const { data: usuario, error: errorPerfil } = await supabase
        .from('usuarios')
        .select('perfil, estado, nombres')
        .eq('id', data.user.id)
        .single();

      console.log('perfil ->', { usuario, errorPerfil }); // TEMPORAL: sacar cuando funcione

      if (errorPerfil || !usuario) {
        await supabase.auth.signOut();
        setErrorLogin('No se encontró un perfil en la tabla usuarios para este usuario.');
        setTipoModal('error');
        setCargando(false);
        return;
      }

      if (usuario.perfil === 'cliente_registrado' && usuario.estado !== 'aprobado') {
        await supabase.auth.signOut();
        setErrorLogin(
          usuario.estado === 'rechazado'
            ? 'Tu registro fue rechazado por el restaurante.'
            : 'Tu cuenta todavía está pendiente de aprobación.'
        );
        setTipoModal('error');
        setCargando(false);
        return;
      }

      setTipoModal('exito');

      setTimeout(() => {
        setMostrarModal(false);
        setCargando(false);
        const esAdmin = usuario.perfil === 'dueño' || usuario.perfil === 'supervisor';
        router.push(esAdmin ? '/admin' : '/home', 'forward', 'replace');
      }, 1000);

    } catch (err) {
      console.error('login catch ->', err); // TEMPORAL: sacar cuando funcione
      setErrorLogin('Error al conectar con el servidor.');
      setTipoModal('error');
      setCargando(false);
    }
  };

  return (
    <IonPage>
      <IonContent style={{ '--background': '#f4f4f5' } as React.CSSProperties}>
        <div style={{
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '24px 16px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>

          {/* LOGO / CABECERA */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', letterSpacing: '2px', color: '#a1a1aa', textTransform: 'uppercase' }}>
              Restaurante
            </span>
            <h1 style={{ fontSize: '24px', fontWeight: '400', color: '#18181b', margin: '4px 0 0 0' }}>
              Acceso al Sistema
            </h1>
          </div>

          {/* TARJETA DE LOGIN */}
          <div style={{
            width: '100%',
            maxWidth: '380px',
            backgroundColor: '#ffffff',
            padding: '32px 24px',
            borderRadius: '16px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
            border: '1px solid #e4e4e7'
          }}>
            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#71717a', marginBottom: '6px', letterSpacing: '0.5px' }}>
                  EMAIL
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
                  placeholder="usuario@ejemplo.com"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    backgroundColor: '#fafafa',
                    border: '1px solid #e4e4e7',
                    borderRadius: '10px',
                    fontSize: '14px',
                    color: '#18181b',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {touched.email && !email && (
                  <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                    Ingrese un correo válido
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#71717a', marginBottom: '6px', letterSpacing: '0.5px' }}>
                  CONTRASEÑA
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    backgroundColor: '#fafafa',
                    border: '1px solid #e4e4e7',
                    borderRadius: '10px',
                    fontSize: '14px',
                    color: '#18181b',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {touched.password && password.length < 6 && (
                  <span style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px', display: 'block' }}>
                    Mínimo 6 caracteres
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={cargando}
                style={{
                  width: '100%',
                  marginTop: '8px',
                  backgroundColor: '#18181b',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '500',
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  opacity: cargando ? 0.6 : 1
                }}
              >
                Ingresar
              </button>
            </form>

            {/* SEPARADOR */}
            <div style={{ margin: '24px 0 16px 0', textAlign: 'center', borderBottom: '1px solid #f4f4f5', lineHeight: '0.1em' }}>
              <span style={{ backgroundColor: '#ffffff', padding: '0 8px', fontSize: '10px', color: '#a1a1aa', letterSpacing: '1px' }}>
                INGRESO RÁPIDO
              </span>
            </div>

            {/* BOTONES DE ACCESO RÁPIDO */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {roles.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => cargarAccesoRapido(item.email)}
                  style={{
                    padding: '8px 4px',
                    fontSize: '12px',
                    fontWeight: '400',
                    color: '#3f3f46',
                    backgroundColor: '#fafafa',
                    border: '1px solid #e4e4e7',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* FOOTER */}
          <footer style={{ marginTop: '32px', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: '#a1a1aa', letterSpacing: '1px', textTransform: 'uppercase' }}>
              EQUIPO BRANCA
            </span>
          </footer>

        </div>

        {/* MODAL */}
        <IonModal isOpen={mostrarModal} backdropDismiss={false} style={{ '--height': 'auto', '--border-radius': '16px' } as React.CSSProperties}>
          <div style={{ padding: '32px 24px', textAlign: 'center', backgroundColor: '#ffffff' }}>
            {tipoModal === 'cargando' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <IonSpinner name="crescent" color="dark" style={{ width: '32px', height: '32px', marginBottom: '16px' }} />
                <p style={{ fontSize: '14px', fontWeight: '500', color: '#18181b', margin: 0 }}>Validando credenciales...</p>
              </div>
            )}

            {tipoModal === 'exito' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '40px', height: '40px', backgroundColor: '#18181b', color: '#ffffff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', marginBottom: '12px' }}>✓</div>
                <p style={{ fontSize: '14px', fontWeight: '500', color: '#18181b', margin: 0 }}>Ingreso exitoso</p>
              </div>
            )}

            {tipoModal === 'error' && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#18181b', marginBottom: '4px' }}>Error de acceso</p>
                <p style={{ fontSize: '12px', color: '#71717a', marginBottom: '20px' }}>{errorLogin}</p>
                <button
                  type="button"
                  onClick={() => setMostrarModal(false)}
                  style={{ backgroundColor: '#18181b', color: '#ffffff', fontSize: '12px', padding: '8px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}
                >
                  Entendido
                </button>
              </div>
            )}
          </div>
        </IonModal>
      </IonContent>
    </IonPage>
  );
};

