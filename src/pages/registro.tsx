import React, { useState } from 'react';
import { IonContent, IonPage, IonInput, useIonRouter } from '@ionic/react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import './Registro.css';
import { supabase } from '../services/supabaseCliente';

const Registro: React.FC = () => {
  const router = useIonRouter();

  const [nombre, setNombre] = useState<string>('');
  const [apellido, setApellido] = useState<string>('');
  const [dni, setDni] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [clave, setClave] = useState<string>('');
  const [foto, setFoto] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showError = (msg: string) => {
    setErrorMessage(msg);
  };

  // Tomar foto del cliente
  const takePhoto = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera
      });

      if (image.base64String) {
        setFoto(`data:image/jpeg;base64,${image.base64String}`);
      }
    } catch (error) {
      console.log('Cámara cancelada o no disponible:', error);
    }
  };

  // Enviar formulario de registro
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre.trim() || !apellido.trim() || !dni.trim() || !email.trim() || !clave.trim()) {
      showError('Por favor completá todos los campos.');
      return;
    }

    if (!foto) {
      showError('Por favor sacate una foto de perfil.');
      return;
    }

    setLoading(true);
    setIsSuccess(false);

    try {
      // 1. Verificar si el correo ya existe
      const { data: usuarioExistente } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (usuarioExistente) {
        setLoading(false);
        showError('El correo electrónico ya se encuentra registrado.');
        return;
      }

      // 2. Registrar usuario en estado PENDIENTE
      const { error: insertError } = await supabase
        .from('usuarios')
        .insert([
          {
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            dni: dni.trim(),
            email: email.trim().toLowerCase(),
            clave: clave,
            foto_url: foto,
            perfil: 'cliente_registrado',
            estado: 'pendiente' // Requiere aprobación del supervisor / dueño
          }
        ]);

      if (insertError) throw insertError;

      // 3. Mostrar modal de éxito
      setIsSuccess(true);

      // 4. Redirigir al Home tras 3 segundos
      setTimeout(() => {
        setLoading(false);
        setIsSuccess(false);
        router.push('/home');
      }, 3000);

    } catch (err: any) {
      console.error('Error al registrar usuario:', err);
      setLoading(false);
      setIsSuccess(false);
      showError('Error al registrar cuenta: ' + (err.message || 'Verificá tu conexión.'));
    }
  };

  return (
    <IonPage>
      <IonContent className="registro-content" fullscreen>
        <main className="registro-container">
          
          <header className="retro-header">
            <div className="logo-container">
              <img 
                src="img/logo-branca.png" 
                alt="Logo Restaurante Branca" 
                className="retro-logo" 
              />
            </div>
          </header>

          <div className="retro-card">
            <form onSubmit={handleRegisterSubmit} className="form-registro">
              <h2 className="form-title">Crear Cuenta</h2>

              <div className="form-group">
                <label htmlFor="nombre" className="retro-label">Nombre</label>
                <IonInput
                  id="nombre"
                  type="text"
                  className="retro-input"
                  placeholder="Ej: Bruce"
                  value={nombre}
                  disabled={loading}
                  onIonInput={(e) => setNombre(e.detail.value!)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="apellido" className="retro-label">Apellido</label>
                <IonInput
                  id="apellido"
                  type="text"
                  className="retro-input"
                  placeholder="Ej: Wayne"
                  value={apellido}
                  disabled={loading}
                  onIonInput={(e) => setApellido(e.detail.value!)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="dni" className="retro-label">DNI / Documento</label>
                <IonInput
                  id="dni"
                  type="number"
                  className="retro-input"
                  placeholder="12345678"
                  value={dni}
                  disabled={loading}
                  onIonInput={(e) => setDni(e.detail.value!)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email" className="retro-label">Mail</label>
                <IonInput
                  id="email"
                  type="email"
                  className="retro-input"
                  placeholder="bruce@hotmail.com"
                  value={email}
                  disabled={loading}
                  onIonInput={(e) => setEmail(e.detail.value!)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="clave" className="retro-label">Contraseña</label>
                <IonInput
                  id="clave"
                  type="password"
                  className="retro-input"
                  placeholder="*********"
                  value={clave}
                  disabled={loading}
                  onIonInput={(e) => setClave(e.detail.value!)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="retro-label">Foto Perfil</label>
                <button 
                  type="button" 
                  className="retro-btn btn-green"
                  onClick={takePhoto}
                  disabled={loading}
                >
                  {foto ? '✔ Foto Tomada' : 'Tomar Foto'}
                </button>
              </div>

              <button 
                type="submit" 
                className="retro-btn btn-yellow"
                disabled={loading}
              >
                Enviar Solicitud
              </button>
            </form>

            <button 
              type="button" 
              className="btn-flip-trigger"
              onClick={() => router.push('/home')}
              disabled={loading}
            >
              Volver al Iniciar Sesión
            </button>
          </div>

        </main>

        {/* Modal Carga / Éxito */}
        {loading && (
          <div className="retro-modal-overlay">
            <div className="retro-modal-box">
              {isSuccess ? (
                <>
                  <div style={{ fontSize: '3rem', color: '#4CAF50', marginBottom: '8px' }}>✔</div>
                  <h3 className="retro-modal-title" style={{ color: '#4CAF50' }}>¡SOLICITUD ENVIADA!</h3>
                  <p className="retro-modal-text">Tu cuenta está pendiente de aprobación por el supervisor.</p>
                </>
              ) : (
                <>
                  <div className="retro-spinner"></div>
                  <h3 className="retro-modal-title">REGISTRANDO...</h3>
                  <p className="retro-modal-text">Enviando solicitud</p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Modal Error */}
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

export default Registro;