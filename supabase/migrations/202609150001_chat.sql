-- Run in the Supabase SQL editor. Participant IDs are Supabase Auth IDs.
create table public.chat_conversaciones (
  id uuid primary key default gen_random_uuid(),
  mesa text not null check (length(trim(mesa)) between 1 and 40),
  cliente_id uuid not null references auth.users(id),
  mozo_id uuid not null references auth.users(id),
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  check (cliente_id <> mozo_id)
);
create unique index chat_mesa_activa on public.chat_conversaciones(mesa) where activa;
create index chat_cliente on public.chat_conversaciones(cliente_id);
create index chat_mozo on public.chat_conversaciones(mozo_id);
create table public.chat_mensajes (
  id uuid primary key default gen_random_uuid(),
  conversacion_id uuid not null references public.chat_conversaciones(id),
  emisor_id uuid not null default auth.uid() references auth.users(id),
  contenido text not null check (length(trim(contenido)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index chat_historial on public.chat_mensajes(conversacion_id, created_at);
alter table public.chat_conversaciones enable row level security;
alter table public.chat_mensajes enable row level security;
revoke all on public.chat_conversaciones, public.chat_mensajes from anon, authenticated;
grant select on public.chat_conversaciones, public.chat_mensajes to authenticated;
grant insert (id, conversacion_id, emisor_id, contenido) on public.chat_mensajes to authenticated;
create policy chat_participantes on public.chat_conversaciones for select to authenticated
using (auth.uid() in (cliente_id, mozo_id));
create policy chat_lectura on public.chat_mensajes for select to authenticated
using (exists (select 1 from public.chat_conversaciones c where c.id = conversacion_id and auth.uid() in (c.cliente_id, c.mozo_id)));
create policy chat_envio on public.chat_mensajes for insert to authenticated
with check (emisor_id = auth.uid() and exists (select 1 from public.chat_conversaciones c where c.id = conversacion_id and c.activa and auth.uid() in (c.cliente_id, c.mozo_id)));
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_mensajes') then
    alter publication supabase_realtime add table public.chat_mensajes;
  end if;
end $$;
