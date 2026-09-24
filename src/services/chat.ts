import { supabase } from './Supabasecliente';

export interface Conversation {
  id: string;
  mesa: string;
  cliente_id: string;
  mozo_id: string;
  activa: boolean;
}
export interface Message {
  id: string;
  conversacion_id: string;
  emisor_id: string;
  contenido: string;
  created_at: string;
}

export function mergeMessages(current: Message[], incoming: Message[]) {
  return Array.from(new Map([...current, ...incoming].map(item => [item.id, item])).values())
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
}

export async function getConversations() {
  const { data, error } = await supabase.from('chat_conversaciones').select('*').eq('activa', true).order('created_at');
  if (error) throw error;
  return data as Conversation[];
}

export async function getMessages(id: string) {
  const { data, error } = await supabase.from('chat_mensajes').select('*')
    .eq('conversacion_id', id).order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return mergeMessages([], data as Message[]);
}

export async function sendMessage(message: Omit<Message, 'created_at'>) {
  const { data, error } = await supabase.from('chat_mensajes').upsert(message, { onConflict: 'id', ignoreDuplicates: true }).select();
  if (error) throw error;
  return data as Message[];
}
