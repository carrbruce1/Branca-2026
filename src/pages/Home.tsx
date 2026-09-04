import React, { useState } from 'react';
import { IonContent, IonPage, IonInput, useIonRouter } from '@ionic/react';
import './Home.css';

const Home: React.FC = () => {
  const router = useIonRouter();
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [nombreAnon, setNombreAnon] = useState<string>('');
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login con:', email, password);
  };

  const handleAnonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Ingreso anónimo:', nombreAnon);
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
              
              {/* FRENTE: LOGIN */}
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
                      onIonInput={(e) => setPassword(e.detail.value!)}
                      required
                    />
                  </div>

                  <button type="submit" className="retro-btn btn-yellow">
                    Ingresar
                  </button>
                </form>

                <button 
                  type="button" 
                  className="btn-flip-trigger"
                  onClick={() => setIsFlipped(true)}
                >
                  Entrar sin cuenta (Invitado)
                </button>
              </div>

              {/* ATRÁS: ACCESO INVITADO */}
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
                      onIonInput={(e) => setNombreAnon(e.detail.value!)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="retro-label">Foto de Ingreso</label>
                    <button type="button" className="retro-btn btn-green">
                      Tomar Foto
                    </button>
                  </div>

                  <button type="submit" className="retro-btn btn-yellow">
                    Ingresar como Anónimo
                  </button>
                </form>

                <button 
                  type="button" 
                  className="btn-flip-trigger"
                  onClick={() => setIsFlipped(false)}
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
      </IonContent>
    </IonPage>
  );
};

export default Home;