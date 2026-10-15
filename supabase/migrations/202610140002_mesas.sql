-- Ejecutar después de las migraciones de usuarios/alta de empleado.
-- Si ya existe una tabla mesas con otra estructura, integrarla antes de aplicar.
create table public.mesas (
  id uuid primary key default gen_random_uuid(),
  numero integer not null unique check (numero between 1 and 9999),
  cantidad_comensales integer not null check (cantidad_comensales between 1 and 100),
  tipo text not null check (tipo in ('VIP', 'estandar', 'movilidad_reducida')),
  disponibilidad text not null default 'vacia' check (disponibilidad in ('vacia', 'ocupada')),
  foto_url text not null check (
    length(foto_url) <= 2800000 and
    foto_url ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$'
  ),
  created_at timestamptz not null default now()
);

alter table public.mesas enable row level security;
revoke all on public.mesas from anon, authenticated;
grant select on public.mesas to authenticated;
grant insert (numero, cantidad_comensales, tipo, foto_url, disponibilidad) on public.mesas to authenticated;
grant update (disponibilidad) on public.mesas to authenticated;

create policy mesas_lectura on public.mesas for select to authenticated
using (exists (
  select 1 from public.usuarios u
  where u.id = auth.uid() and u.perfil in ('dueno', 'supervisor', 'metre', 'mozo')
));

create policy mesas_alta on public.mesas for insert to authenticated
with check (disponibilidad = 'vacia' and exists (
  select 1 from public.usuarios u
  where u.id = auth.uid() and u.perfil in ('dueno', 'supervisor')
));

create policy mesas_disponibilidad on public.mesas for update to authenticated
using (exists (
  select 1 from public.usuarios u
  where u.id = auth.uid() and u.perfil in ('dueno', 'supervisor')
))
with check (exists (
  select 1 from public.usuarios u
  where u.id = auth.uid() and u.perfil in ('dueno', 'supervisor')
));
