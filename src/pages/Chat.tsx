import { useEffect, useRef, useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../services/Supabasecliente';
import { Conversation, Message, getConversations, getMessages, mergeMessages, sendMessage } from '../services/chat';
import './Chat.css';

const demoConversation: Conversation = { id: 'demo', mesa: '07', cliente_id: 'cliente-demo', mozo_id: 'mozo-demo', activa: true };
const demoMessages: Message[] = [
  { id: '1', conversacion_id: 'demo', emisor_id: 'mozo-demo', contenido: '¡Bienvenido a Branca! Soy tu mozo. Si necesitás algo, escribime por acá.', created_at: '2026-01-01T20:00:00' },
  { id: '2', conversacion_id: 'demo', emisor_id: 'cliente-demo', contenido: '¡Hola! ¿Nos traés un poco más de pan?', created_at: '2026-01-01T20:01:00' },
  { id: '3', conversacion_id: 'demo', emisor_id: 'mozo-demo', contenido: '¡Por supuesto! Ya se los acerco.', created_at: '2026-01-01T20:02:00' },
];

export default function Chat() {
  const location = useLocation();
  const demo = new URLSearchParams(location.search).get('demo') === '1';
  const [demoRole, setDemoRole] = useState<'cliente' | 'mozo'>('cliente');
  const [userId, setUserId] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [reload, setReload] = useState(0);
  const bottom = useRef<HTMLDivElement>(null);
  const busy = useRef(false);
  const pending = useRef<{ id: string; text: string; conversation: string } | null>(null);
  const identity = demo ? `${demoRole}-demo` : userId;
  const conversation = conversations.find(item => item.id === selected);
  const isWaiter = conversation?.mozo_id === identity;

  useEffect(() => {
    let cancelled = false;
    setError(''); setLoading(true); setMessages([]); setConversations([]); setSelected('');
    if (demo) {
      setConversations([demoConversation]); setSelected('demo'); setMessages(demoMessages); setLoading(false);
      return;
    }
    const init = async () => {
      try {
        const { data, error: authError } = await supabase.auth.getUser();
        if (cancelled) return;
        if (authError || !data.user) { setUserId(''); setError('Ingresá con tu cuenta desde la pantalla de acceso para usar el chat.'); return; }
        setUserId(data.user.id);
        const rooms = await getConversations();
        if (!cancelled) { setConversations(rooms); setSelected(rooms[0]?.id ?? ''); }
      } catch { if (!cancelled) setError('No pudimos cargar tus conversaciones. Intentá nuevamente.'); }
      finally { if (!cancelled) setLoading(false); }
    };
    void init();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') { setUserId(''); setConversations([]); setSelected(''); setMessages([]); }
    });
    return () => { cancelled = true; listener.subscription.unsubscribe(); };
  }, [demo, reload]);

  useEffect(() => {
    if (demo || !selected) return;
    let cancelled = false;
    setMessages([]); setDraft(''); setError(''); setConnected(false); setLoading(true);
    const sync = async () => {
      try {
        const incoming = await getMessages(selected);
        if (!cancelled) setMessages(current => mergeMessages(current, incoming));
      } catch { if (!cancelled) setError('No pudimos actualizar los mensajes. Revisá tu conexión y reintentá.'); }
      finally { if (!cancelled) setLoading(false); }
    };
    const channel = supabase.channel(`chat:${selected}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_mensajes', filter: `conversacion_id=eq.${selected}` }, payload => {
        if (!cancelled) setMessages(current => mergeMessages(current, [payload.new as Message]));
      }).subscribe(status => {
        if (cancelled) return;
        setConnected(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') void sync();
      });
    void sync();
    const interval = window.setInterval(() => { void sync(); }, 15000);
    return () => { cancelled = true; window.clearInterval(interval); void supabase.removeChannel(channel); };
  }, [demo, selected]);

  useEffect(() => { bottom.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }, [messages]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || text.length > 1000 || !conversation || !identity || busy.current) return;
    busy.current = true; setSending(true); setError('');
    const attempt = pending.current?.text === text && pending.current.conversation === selected
      ? pending.current : { id: crypto.randomUUID(), text, conversation: selected };
    pending.current = attempt;
    const message = { id: attempt.id, conversacion_id: selected, emisor_id: identity, contenido: text };
    try {
      const saved = demo ? [{ ...message, created_at: new Date().toISOString() }] : await sendMessage(message);
      setMessages(current => mergeMessages(current, saved)); setDraft(''); pending.current = null;
    } catch { setError('El mensaje no pudo confirmarse. Conservamos tu texto para que puedas reintentar.'); }
    finally { busy.current = false; setSending(false); }
  };

  return <IonPage><IonContent className="chat-content" scrollY={false}>
    <main className="branca-chat">
      <header className="chat-brand"><Link to="/home" aria-label="Volver al inicio">← Inicio</Link><img src="/img/logo-branca.png" alt="Branca" /><span>BUENA MESA<br />BUENA CHARLA</span></header>
      <div className="chat-heading"><p>ATENCIÓN A TU MESA</p><h1>Una charla, por favor.</h1><span>Todo lo que necesitás, a un mensaje.</span></div>
      {demo && <div className="chat-demo"><span>Vista de demostración · mensajes locales</span><button onClick={() => setDemoRole(demoRole === 'cliente' ? 'mozo' : 'cliente')}>Ver como {demoRole === 'cliente' ? 'mozo' : 'cliente'}</button></div>}
      <section className="chat-panel" aria-label="Chat de la mesa">
        <header className="chat-room"><div className="chat-avatar">{isWaiter ? 'C' : 'M'}</div><div><h2>{isWaiter ? 'Conversación con el cliente' : 'Charlá con tu mozo'}</h2><span>{demo ? 'Demostración' : connected ? '● Chat conectado' : 'Conectando / actualización periódica'}</span></div>{conversation && <strong>MESA {conversation.mesa}</strong>}</header>
        {conversations.length > 1 && <label className="chat-selector">Conversación <select disabled={sending} value={selected} onChange={e => setSelected(e.target.value)}>{conversations.map(room => <option key={room.id} value={room.id}>Mesa {room.mesa}</option>)}</select></label>}
        {error && <div className="chat-error" role="alert">{error} {!conversation && <><Link to="/login">Ir al acceso</Link><button onClick={() => setReload(value => value + 1)}>Reintentar</button></>}</div>}
        <div className="chat-history" role="log" aria-label="Mensajes" aria-live="polite" aria-busy={loading}>
          {loading ? <p className="chat-empty">Preparando tu conversación…</p> : !conversation ? <div className="chat-empty"><span>UNA MESA, UNA CHARLA</span><h2>Tu conversación te espera</h2><p>Cuando tengas una mesa y un mozo asignados, vas a poder conversar por acá.</p><button onClick={() => setReload(value => value + 1)}>Actualizar mesas</button><Link to="/chat?demo=1">Explorar una demostración →</Link></div> : <>
            <div className="chat-date">{demo ? 'ASÍ SE VE TU CHAT' : 'ÚLTIMOS MENSAJES'}</div>
            {!messages.length && <p className="chat-empty">¿Necesitás algo? Iniciá la conversación.</p>}
            {messages.map(message => <article key={message.id} className={`chat-message ${message.emisor_id === identity ? 'mine' : ''}`}><span>{message.emisor_id === identity ? 'Vos' : isWaiter ? 'Cliente' : 'Mozo'}</span><p>{message.contenido}</p><time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</time></article>)}
          </>}<div ref={bottom} />
        </div>
        <form className="chat-compose" onSubmit={submit}>
          <div className="chat-shortcuts">{(isWaiter ? ['¡Ya te lo acerco!', 'Enseguida estoy con ustedes.'] : ['Necesito ayuda', '¿Nos traés agua?', '¿Cómo viene el pedido?']).map(text => <button key={text} type="button" disabled={!conversation || sending} onClick={() => setDraft(text)}>{text}</button>)}</div>
          <div className="chat-input-row"><label className="chat-input-label"><span className="chat-sr-only">Tu mensaje</span><textarea rows={2} maxLength={1000} placeholder="Escribí tu mensaje…" value={draft} disabled={!conversation || sending} onChange={e => setDraft(e.target.value)} /></label><button className="chat-send" disabled={!conversation || !draft.trim() || sending} type="submit">{sending ? 'Enviando…' : 'Enviar →'}</button></div>
          <small>{draft.length}/1000 · {demo ? 'Esta vista no envía mensajes al restaurante.' : 'La conversación pertenece a esta visita.'}</small>
        </form>
      </section><footer className="chat-footer">BRANCA · EL GUSTO DE ESTAR BIEN ATENDIDO</footer>
    </main>
  </IonContent></IonPage>;
}
