import React, { useState } from 'react';
import { IonContent, IonPage, IonInput, useIonRouter } from '@ionic/react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import './Home.css';
import { supabase } from "../services/Supabasecliente";

const Home: React.FC = () => {
  const router = useIonRouter();
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loadingLogin, setLoadingLogin] = useState<boolean>(false);
  const [nombreAnon, setNombreAnon] = useState<string>('');
  const [fotoAnon, setFotoAnon] = useState<string | null>(null);
  const [loadingAnon, setLoadingAnon] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showError = (msg: string) => {
    setErrorMessage(msg);
  };

  // Inicio de sesión directo en BD (mail/clave), estado y redirección por perfil
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      showError('Por favor completá todos los campos.');
      return;
    }

    setLoadingLogin(true);
    setIsSuccess(false);

    try {
      const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .eq('clave', password)
        .maybeSingle();

      if (error) throw error;

      if (!usuario) {
        setLoadingLogin(false);
        showError('Correo o contraseña incorrectos.');
        return;
      }

      // Validación de aprobación del cliente
      if (usuario.perfil === 'cliente_registrado') {
        if (usuario.estado === 'pendiente') {
          setLoadingLogin(false);
          showError('Tu cuenta aún está pendiente de aprobación por el supervisor.');
          return;
        }
        if (usuario.estado === 'rechazado') {
          setLoadingLogin(false);
          showError('Tu solicitud de registro fue rechazada.');
          return;
        }
      }

      // Guardado de la sesión en almacenamiento local
      localStorage.setItem('user_id', usuario.id);
      localStorage.setItem('user_perfil', usuario.perfil);
      localStorage.setItem('user_nombre', `${usuario.nombre} ${usuario.apellido || ''}`.trim());

      setIsSuccess(true);

      // Redirección hacia la ruta que corresponde según el rol del usuario
      setTimeout(() => {
        setLoadingLogin(false);
        setIsSuccess(false);

        switch (usuario.perfil) {
          case 'cocinero':
          case 'bartender':
            router.push('/cocina');
            break;
          case 'mozo':
            router.push('/mozo');
            break;
          case 'metro':
          case 'supervisor':
          case 'dueno':
            router.push('/admin');
            break;
          default:
            router.push('/home-cliente');
            break;
        }
      }, 1500);

    } catch (err: any) {
      console.error('Error al iniciar sesión:', err);
      setLoadingLogin(false);
      setIsSuccess(false);
      showError('Error de conexión con el servidor.');
    }
  };

  // Captura de imagen desde la cámara
  const takePhoto = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera
      });

      if (image.base64String) {
        setFotoAnon(`data:image/jpeg;base64,${image.base64String}`);
      }
    } catch (error) {
      console.log('Cámara cancelada o no disponible:', error);
    }
  };

  // Registro e ingreso temporal para usuarios anónimos
  const handleAnonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombreAnon) {
      showError('Ingresá tu nombre para continuar.');
      return;
    }

    if (!fotoAnon) {
      showError('Por favor sacate una foto antes de ingresar.');
      return;
    }

    setLoadingAnon(true);
    setIsSuccess(false);

    try {
      const { data: clienteAnon, error: dbError } = await supabase
        .from('clientes_anonimos')
        .insert([
          {
            nombre: nombreAnon,
            foto_url: fotoAnon 
          }
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      localStorage.setItem('user_id', clienteAnon.id);
      localStorage.setItem('user_perfil', 'cliente_anonimo');
      localStorage.setItem('user_nombre', clienteAnon.nombre);

      setIsSuccess(true);
      setTimeout(() => {
        setLoadingAnon(false);
        setIsSuccess(false);
        router.push('/home-cliente');
      }, 1500);

    } catch (err: any) {
      console.error('Error al ingresar como anónimo:', err);
      setLoadingAnon(false);
      setIsSuccess(false);
      showError('Error al registrar anónimo: ' + (err.message || 'Verificá tu conexión.'));
    }
  };

  return (
    <IonPage>
      <IonContent className="home-content" fullscreen>
        <main className="home-container">
          
          <header className="retro-header">
            <div className="logo-container">
              <img 
                src="img/logo-branca.png" 
                alt="Logo Restaurante Branca" 
                className="retro-logo" 
              />
            </div>
          </header>

          <section className="section-hero">
            <h2 className="hero-title">Especialidades de la casa & Sabor de antaño</h2>
          </section>

          <div className="card-flipper-container">
            <div className={`card-inner ${isFlipped ? 'is-flipped' : ''}`}>
              
              <div className="card-face card-front">
                <form onSubmit={handleLoginSubmit} className="form-login">
                  <h2 className="form-title">Iniciar Sesión</h2>

                  <div className="form-group">
                    <label htmlFor="mail" className="retro-label">Mail</label>
                    <IonInput
                      id="mail"
                      type="email"
                      className="retro-input"
                      placeholder="bruce@hotmail.com"
                      value={email}
                      disabled={isFlipped || loadingLogin}
                      onIonInput={(e) => setEmail(e.detail.value!)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="contraseña" className="retro-label">Contraseña</label>
                    <IonInput
                      id="contraseña"
                      type="password"
                      className="retro-input"
                      placeholder="*********"
                      value={password}
                      disabled={isFlipped || loadingLogin}
                      onIonInput={(e) => setPassword(e.detail.value!)}
                      required
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="retro-btn btn-yellow"
                    disabled={loadingLogin}
                  >
                    Ingresar
                  </button>
                </form>

                <button 
                  type="button" 
                  className="btn-flip-trigger"
                  onClick={() => setIsFlipped(true)}
                  disabled={loadingLogin}
                >
                  Entrar sin cuenta (Invitado)
                </button>
              </div>

              <div className="card-face card-back">
                <form onSubmit={handleAnonSubmit} className="form-anon">
                  <h2 className="form-title">Acceso Invitado</h2>

                  <div className="form-group">
                    <label htmlFor="nombreAnon" className="retro-label">Tu Nombre</label>
                    <IonInput
                      id="nombreAnon"
                      type="text"
                      className="retro-input"
                      placeholder="Ej: Bruce"
                      value={nombreAnon}
                      disabled={!isFlipped || loadingAnon}
                      onIonInput={(e) => setNombreAnon(e.detail.value!)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="retro-label">Foto de Ingreso</label>
                    <button 
                      type="button" 
                      className="retro-btn btn-green"
                      onClick={takePhoto}
                      disabled={loadingAnon}
                    >
                      {fotoAnon ? '✔ Foto Tomada' : 'Tomar Foto'}
                    </button>
                  </div>

                  <button 
                    type="submit" 
                    className="retro-btn btn-yellow"
                    disabled={loadingAnon}
                  >
                    Ingresar como Anónimo
                  </button>
                </form>

                <button 
                  type="button" 
                  className="btn-flip-trigger"
                  onClick={() => setIsFlipped(false)}
                  disabled={loadingAnon}
                >
                  Volver a Iniciar Sesión
                </button>
              </div>

            </div>
          </div>

          <div className="registro-container">
            <a onClick={() => router.push('/registro')} className="retro-link">
              ¿No tenés cuenta? Registrate acá
            </a>
          </div>

        </main>

        {(loadingLogin || loadingAnon) && (
          <div className="retro-modal-overlay">
            <div className="retro-modal-box">
              {isSuccess ? (
                <>
                  <div style={{ fontSize: '3rem', color: '#4CAF50', marginBottom: '8px' }}>✔</div>
                  <h3 className="retro-modal-title" style={{ color: '#4CAF50' }}>¡ACCESO OK!</h3>
                  <p className="retro-modal-text">Entrando...</p>
                </>
              ) : (
                <>
                  <div className="retro-spinner"></div>
                  <h3 className="retro-modal-title">VALIDANDO...</h3>
                  <p className="retro-modal-text">Verificando credenciales</p>
                </>
              )}
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="retro-modal-overlay">
            <div className="retro-modal-box error-box">
              <h3 className="retro-modal-title">¡ERROR!</h3>
              <p className="retro-modal-text">{errorMessage}</p>
              <button 
                className="retro-btn btn-yellow"
                onClick={() => setErrorMessage(null)}
              >
                ENTENDIDO
              </button>
            </div>
          </div>
        )}

      </IonContent>
    </IonPage>
  );
};

export default Home;