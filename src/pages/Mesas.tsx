import { useCallback, useRef, useState } from 'react';
import { IonContent, IonPage, useIonRouter, useIonViewWillEnter, useIonViewWillLeave } from '@ionic/react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { supabase } from '../services/Supabasecliente';
import { cambiarDisponibilidad, crearMesa, imagenQrMesa, listarMesas, nombresTipo, tiposMesa, validarMesa, type DatosMesa, type Mesa } from '../services/mesas';
import './Mesas.css';

const formularioVacio: DatosMesa = { numero: '', cantidad_comensales: '', tipo: 'estandar', foto_url: '' };

export default function Mesas() {
  const router = useIonRouter();
  const [autorizado, setAutorizado] = useState(false);
  const [ocupado, setOcupado] = useState('Verificando permisos…');
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [datos, setDatos] = useState<DatosMesa>({ ...formularioVacio });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState('');
  const [exito, setExito] = useState(false);
  const [mesaQr, setMesaQr] = useState<Mesa | null>(null);
  const visible = useRef(true);
  const operando = useRef(false);

  const reportar = useCallback((texto: string) => {
    setExito(false);
    setMensaje(texto);
    void Haptics.notification({ type: NotificationType.Error }).catch(() => undefined);
  }, []);

  const cargar = useCallback(async () => {
    if (operando.current) return;
    operando.current = true;
    setOcupado('Cargando mesas…');
    try {
      const listado = await listarMesas();
      if (visible.current) setMesas(listado);
    } catch (error) {
      if (visible.current) reportar(error instanceof Error ? error.message : 'No se pudieron cargar las mesas.');
    } finally {
      operando.current = false;
      if (visible.current) setOcupado('');
    }
  }, [reportar]);

  useIonViewWillEnter(() => {
    visible.current = true;
    setAutorizado(false);
    setMesas([]);
    setMensaje('');
    setOcupado('Verificando permisos…');
    void (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) throw new Error('Iniciá sesión como dueño o supervisor para gestionar mesas.');
        const { data: perfil, error: errorPerfil } = await supabase.from('usuarios').select('perfil').eq('id', data.user.id).single();
        if (errorPerfil || !perfil || !['dueno', 'supervisor'].includes(perfil.perfil)) {
          throw new Error('Solo el dueño o supervisor puede gestionar mesas.');
        }
        if (!visible.current) return;
        setAutorizado(true);
        await cargar();
      } catch (error) {
        if (visible.current) reportar(error instanceof Error ? error.message : 'No se pudieron verificar los permisos.');
      } finally {
        if (visible.current) setOcupado('');
      }
    })();
  }, [cargar, reportar]);

  useIonViewWillLeave(() => {
    visible.current = false;
    setMesaQr(null);
    setDatos(prev => ({ ...prev, foto_url: '' }));
  });

  async function tomarFoto() {
    if (operando.current) return;
    operando.current = true;
    setOcupado('Abriendo la cámara…');
    try {
      const imagen = await Camera.getPhoto({ source: CameraSource.Camera, resultType: CameraResultType.Base64, quality: 70, width: 1000, height: 1000, correctOrientation: true });
      if (imagen.base64String && visible.current) {
        setDatos(prev => ({ ...prev, foto_url: `data:image/${imagen.format};base64,${imagen.base64String}` }));
        setErrores(prev => ({ ...prev, foto_url: '' }));
      }
    } catch (error) {
      if (visible.current && !/cancel/i.test(error instanceof Error ? error.message : '')) reportar('No se pudo tomar la foto. Revisá el permiso de cámara.');
    } finally {
      operando.current = false;
      if (visible.current) setOcupado('');
    }
  }

  async function guardar(event: React.FormEvent) {
    event.preventDefault();
    if (!autorizado || operando.current) return;
    const fallos = validarMesa(datos);
    setErrores(fallos);
    if (Object.keys(fallos).length) {
      reportar('Revisá los campos indicados antes de guardar.');
      return;
    }
    operando.current = true;
    setOcupado('Registrando mesa…');
    setMensaje('');
    try {
      const nueva = await crearMesa(datos);
      if (!visible.current) return;
      setMesas(prev => [...prev.filter(mesa => mesa.id !== nueva.id), nueva].sort((a, b) => a.numero - b.numero));
      setDatos({ ...formularioVacio });
      setErrores({});
      setExito(true);
      setMensaje(`Mesa ${nueva.numero} registrada correctamente. Su disponibilidad inicial es vacía.`);
      setMesaQr(nueva);
    } catch (error) {
      if (visible.current) reportar(error instanceof Error ? error.message : 'No se pudo registrar la mesa.');
    } finally {
      operando.current = false;
      if (visible.current) setOcupado('');
    }
  }

  async function cambiarEstado(mesa: Mesa) {
    if (!autorizado || operando.current) return;
    operando.current = true;
    setOcupado(`Actualizando mesa ${mesa.numero}…`);
    try {
      const actualizada = await cambiarDisponibilidad(mesa);
      if (!visible.current) return;
      setMesas(prev => prev.map(item => item.id === actualizada.id ? actualizada : item));
      setExito(true);
      setMensaje(`Mesa ${mesa.numero}: ${actualizada.disponibilidad === 'vacia' ? 'vacía' : 'ocupada'}.`);
    } catch (error) {
      if (visible.current) reportar(error instanceof Error ? error.message : 'No se pudo actualizar la mesa.');
    } finally {
      operando.current = false;
      if (visible.current) setOcupado('');
    }
  }

  return (
    <IonPage>
      <IonContent className="mesas-content" fullscreen>
        <main className="mesas-container">
          <header className="mesas-header">
            <img src="/img/logo-branca.png" alt="Branca" />
            <h1>Gestión de mesas</h1>
            <p>Agregá mesas y administrá su disponibilidad.</p>
          </header>
          <button type="button" disabled={!!ocupado} onClick={() => router.push(autorizado ? '/admin' : '/login', 'back', 'replace')}>Volver</button>
          {mensaje && <div className={`mesas-mensaje ${exito ? 'exito' : 'error'}`} role={exito ? 'status' : 'alert'}>{mensaje}</div>}
          {autorizado && <>
            <form onSubmit={guardar} noValidate>
              <fieldset disabled={!!ocupado}>
                <legend>Agregar una nueva mesa</legend>
                <div className="mesas-campos">
                  {(['numero', 'cantidad_comensales'] as const).map(campo => (
                    <label key={campo} htmlFor={`mesa-${campo}`}>
                      {campo === 'numero' ? 'Número de mesa' : 'Cantidad de comensales'}
                      <input id={`mesa-${campo}`} type="text" inputMode="numeric" maxLength={campo === 'numero' ? 4 : 3} value={datos[campo]} aria-invalid={!!errores[campo]} aria-describedby={errores[campo] ? `mesa-error-${campo}` : undefined} onChange={event => setDatos(prev => ({ ...prev, [campo]: event.target.value }))} />
                      {errores[campo] && <span className="mesas-error" id={`mesa-error-${campo}`}>{errores[campo]}</span>}
                    </label>
                  ))}
                </div>
                <label htmlFor="mesa-tipo">Tipo de mesa
                  <select id="mesa-tipo" value={datos.tipo} onChange={event => setDatos(prev => ({ ...prev, tipo: event.target.value }))}>
                    {tiposMesa.map(tipo => <option key={tipo} value={tipo}>{nombresTipo[tipo]}</option>)}
                  </select>
                </label>
                {errores.tipo && <p className="mesas-error">{errores.tipo}</p>}
                <p>Disponibilidad inicial: <strong>Vacía</strong></p>
                <div className="mesas-foto">
                  {datos.foto_url ? <img src={datos.foto_url} alt="Foto de la nueva mesa" /> : <p>Tomá una foto de la mesa.</p>}
                </div>
                <button type="button" onClick={() => void tomarFoto()}>{datos.foto_url ? 'Volver a tomar foto' : 'Tomar foto de la mesa'}</button>
                {errores.foto_url && <p className="mesas-error">{errores.foto_url}</p>}
                <button className="mesas-guardar" type="submit">Registrar mesa y generar QR</button>
              </fieldset>
            </form>
            <section className="mesas-listado" aria-labelledby="titulo-mesas">
              <div className="mesas-listado-header">
                <h2 id="titulo-mesas">Mesas registradas</h2>
                <button type="button" disabled={!!ocupado} onClick={() => void cargar()}>Actualizar listado</button>
              </div>
              {!ocupado && mesas.length === 0 && <p>No hay mesas para mostrar. Si hubo un error, revisá el mensaje y actualizá el listado.</p>}
              <div className="mesas-grilla">
                {mesas.map(mesa => <article className="mesas-tarjeta" key={mesa.id}>
                  <img className="mesas-imagen" src={mesa.foto_url} alt={`Mesa ${mesa.numero}`} />
                  <h3>Mesa {mesa.numero}</h3>
                  <p>{mesa.cantidad_comensales} comensales</p>
                  <p>{nombresTipo[mesa.tipo]}</p>
                  <p className={`mesas-estado ${mesa.disponibilidad}`}>{mesa.disponibilidad === 'vacia' ? 'Vacía' : 'Ocupada'}</p>
                  <div className="mesas-acciones">
                    <button type="button" disabled={!!ocupado} onClick={() => void cambiarEstado(mesa)}>{mesa.disponibilidad === 'vacia' ? 'Marcar ocupada' : 'Marcar vacía'}</button>
                    <button type="button" disabled={!!ocupado} onClick={() => setMesaQr(mesa)}>Ver QR</button>
                  </div>
                </article>)}
              </div>
            </section>
          </>}
          {mesaQr && <section className="mesas-qr" role="dialog" aria-modal="true" aria-labelledby="titulo-qr">
            <div>
              <h2 id="titulo-qr">QR de la mesa {mesaQr.numero}</h2>
              <img src={imagenQrMesa(mesaQr.id)} alt={`Código QR de la mesa ${mesaQr.numero}`} />
              <p>Este código identifica exclusivamente esta mesa.</p>
              <a href={imagenQrMesa(mesaQr.id)} download={`mesa-${mesaQr.numero}-qr.svg`}>Descargar QR</a>
              <button type="button" autoFocus onClick={() => setMesaQr(null)}>Cerrar</button>
            </div>
          </section>}
          {ocupado && <div className="mesas-espera" role="status"><img src="/img/logo-branca.png" alt="" /><p>{ocupado}</p></div>}
        </main>
      </IonContent>
    </IonPage>
  );
}
