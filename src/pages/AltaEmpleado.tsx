import { useEffect, useRef, useState } from 'react';
import { IonContent, IonPage, useIonRouter, useIonViewWillLeave } from '@ionic/react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { supabase } from '../services/Supabasecliente';
import { leerDni, validarEmpleado, type Empleado } from '../../supabase/functions/_shared/empleado';
import './AltaEmpleado.css';

const vacio: Empleado = { nombre: '', apellido: '', dni: '', cuil: '', email: '', clave: '', foto_url: '', perfil: 'cocinero' };
export default function AltaEmpleado() {
  const router = useIonRouter();
  const [datos, setDatos] = useState<Empleado>({ ...vacio });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [autorizado, setAutorizado] = useState(false);
  const [ocupado, setOcupado] = useState('Verificando permisos…');
  const [mensaje, setMensaje] = useState('');
  const [exito, setExito] = useState(false);
  const [escaneando, setEscaneando] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  const controles = useRef<IScannerControls | undefined>(undefined);
  useIonViewWillLeave(() => { controles.current?.stop(); setEscaneando(false); });
  const reportar = (texto: string) => {
    setExito(false); setMensaje(texto);
    void Haptics.notification({ type: NotificationType.Error }).catch(() => undefined);
  };
  useEffect(() => {
    let activo = true;
    const verificar = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) throw new Error('Iniciá sesión como dueño o supervisor.');
        const { data: perfil, error: perfilError } = await supabase.from('usuarios').select('perfil').eq('id', data.user.id).single();
        if (perfilError || !perfil || !['dueno', 'supervisor'].includes(perfil.perfil)) throw new Error('Solo el dueño o supervisor puede agregar empleados.');
        if (activo) setAutorizado(true);
      } catch (error) { if (activo) reportar(error instanceof Error ? error.message : 'No se pudieron verificar los permisos.'); }
      finally { if (activo) setOcupado(''); }
    };
    void verificar();
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    if (!escaneando || !video.current) return;
    let cancelado = false;
    let leido = false;
    const hints = new Map<DecodeHintType, unknown>([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE, BarcodeFormat.PDF_417]], [DecodeHintType.TRY_HARDER, true]]);
    const lector = new BrowserMultiFormatReader(hints);
    void lector.decodeFromConstraints({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } }, video.current, (resultado, _error, control) => {
      if (!resultado || cancelado || leido) return;
      leido = true; control.stop(); setEscaneando(false);
      try {
        const identidad = leerDni(resultado.getText());
        setDatos(prev => ({ ...prev, ...identidad, cuil: '' }));
        setErrores({}); setExito(true); setMensaje('DNI leído. Revisá los datos y completá los campos restantes.');
      } catch (error) { reportar(error instanceof Error ? error.message : 'No se pudo leer el DNI.'); }
    }).then(control => { if (cancelado || leido) control.stop(); else controles.current = control; })
      .catch(() => { if (!cancelado) { setEscaneando(false); reportar('No se pudo abrir la cámara. Revisá los permisos y usá HTTPS o la aplicación instalada.'); } });
    return () => { cancelado = true; controles.current?.stop(); controles.current = undefined; };
  }, [escaneando]);

  const foto = async () => {
    setOcupado('Abriendo la cámara…');
    try {
      const imagen = await Camera.getPhoto({ source: CameraSource.Camera, resultType: CameraResultType.Base64, quality: 70, width: 1000, height: 1000, correctOrientation: true });
      if (imagen.base64String) setDatos(prev => ({ ...prev, foto_url: `data:image/${imagen.format};base64,${imagen.base64String}` }));
    } catch (error) {
      if (!/cancel/i.test(error instanceof Error ? error.message : '')) reportar('No se pudo tomar la foto. Revisá el permiso de la cámara.');
    } finally { setOcupado(''); }
  };
  const guardar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (ocupado || !autorizado) return;
    const normalizados = { ...datos, nombre: datos.nombre.trim(), apellido: datos.apellido.trim(), dni: datos.dni.trim(), cuil: datos.cuil.replace(/[\s-]/g, ''), email: datos.email.trim().toLowerCase() };
    const fallos = validarEmpleado(normalizados);
    setErrores(fallos);
    if (Object.keys(fallos).length) { reportar('Revisá los campos indicados antes de guardar.'); return; }
    setOcupado('Registrando empleado…'); setMensaje('');
    try {
      const { data, error } = await supabase.functions.invoke('crear-empleado', { body: normalizados });
      if (error) {
        let texto = 'No se pudo registrar el empleado. Verificá la conexión y que la función crear-empleado esté desplegada.';
        if ('context' in error && error.context instanceof Response) {
          const detalle = await error.context.json().catch(() => null);
          if (detalle?.errores) setErrores(detalle.errores);
          if (detalle?.error) texto = detalle.error;
        }
        throw new Error(texto);
      }
      if (!data?.id) throw new Error('El servidor no confirmó el alta.');
      setDatos({ ...vacio }); setErrores({}); setExito(true);
      setMensaje('Empleado registrado correctamente con perfil cocinero. Ya puede iniciar sesión.');
    } catch (error) { reportar(error instanceof Error ? error.message : 'No se pudo registrar el empleado.'); }
    finally { setOcupado(''); }
  };
  return <IonPage><IonContent className="empleado-content" fullscreen><main className="empleado-container">
    <header><img src="/img/logo-branca.png" alt="Branca" /><h1>Alta de empleado</h1><p>Registrá un nuevo integrante de cocina.</p></header>
    <button type="button" disabled={!!ocupado || escaneando} onClick={() => router.push(autorizado ? '/admin' : '/login', 'back', 'replace')}>Volver</button>
    {mensaje && <div className={exito ? 'empleado-mensaje exito' : 'empleado-mensaje error'} role={exito ? 'status' : 'alert'}>{mensaje}</div>}
    {autorizado && <form onSubmit={guardar} noValidate>
      <fieldset disabled={!!ocupado || escaneando}>
        <legend>Datos personales</legend>
        <button type="button" onClick={() => { setMensaje(''); setEscaneando(true); }}>Escanear código del DNI</button>
        <p>Apuntá al código del documento. Se admiten QR y PDF417. También podés completar los datos manualmente.</p>
        {(['nombre', 'apellido', 'dni', 'cuil', 'email', 'clave'] as const).map(campo => <label key={campo} htmlFor={`empleado-${campo}`}>
          {{ nombre: 'Nombres', apellido: 'Apellidos', dni: 'DNI', cuil: 'CUIL', email: 'Correo electrónico', clave: 'Contraseña' }[campo]}
          <input id={`empleado-${campo}`} type={campo === 'clave' ? 'password' : campo === 'email' ? 'email' : 'text'} value={datos[campo]} autoComplete={campo === 'clave' ? 'new-password' : 'off'} inputMode={campo === 'dni' || campo === 'cuil' ? 'numeric' : undefined} maxLength={campo === 'clave' ? 72 : campo === 'dni' ? 8 : campo === 'cuil' ? 13 : campo === 'email' ? 254 : 80} aria-invalid={!!errores[campo]} aria-describedby={errores[campo] ? `error-${campo}` : undefined} onChange={e => setDatos(prev => ({ ...prev, [campo]: e.target.value }))} />
          {errores[campo] && <span id={`error-${campo}`} className="empleado-error">{errores[campo]}</span>}
        </label>)}
        <p>Contraseña: entre 8 y 72 caracteres. CUIL: 11 dígitos, con o sin guiones.</p>
        <label>Perfil<input value="Cocinero" readOnly /></label>
        <div className="empleado-foto">{datos.foto_url ? <img src={datos.foto_url} alt="Foto del empleado" /> : <p>Falta la foto personal</p>}</div>
        <button type="button" onClick={() => void foto()}>{datos.foto_url ? 'Volver a tomar foto' : 'Tomar foto personal'}</button>
        {errores.foto_url && <p className="empleado-error">{errores.foto_url}</p>}
        <button className="empleado-guardar" type="submit">Registrar empleado</button>
      </fieldset>
    </form>}
    {escaneando && <section className="empleado-lector" aria-label="Lector del DNI"><video ref={video} autoPlay playsInline muted /><p>Encuadrá el código completo con buena iluminación.</p><button onClick={() => { controles.current?.stop(); setEscaneando(false); }}>Cancelar lectura</button></section>}
    {ocupado && <div className="empleado-espera" role="status"><img src="/img/logo-branca.png" alt="" /><p>{ocupado}</p></div>}
  </main></IonContent></IonPage>;
}
