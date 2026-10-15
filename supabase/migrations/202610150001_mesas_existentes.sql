-- Compatible con la tabla mesas existente. No recrea la tabla ni modifica filas.
-- Si se creó con la migración anterior, agrega el campo requerido por la app.
begin;
alter table public.mesas add column if not exists qr_codigo text;

alter table public.mesas enable row level security;
grant select on public.mesas to authenticated;
grant insert (id, numero, cantidad_comensales, tipo, foto_url, disponibilidad, qr_codigo) on public.mesas to authenticated;
grant update (disponibilidad) on public.mesas to authenticated;

-- Reemplaza solo las políticas de este módulo; revisar otras políticas existentes.
drop policy if exists mesas_lectura on public.mesas;
create policy mesas_lectura on public.mesas for select to authenticated
using (exists (
  select 1 from public.usuarios u
  where u.id = auth.uid() and u.perfil in ('dueno', 'supervisor', 'metre', 'mozo')
));

drop policy if exists mesas_alta on public.mesas;
create policy mesas_alta on public.mesas for insert to authenticated
with check (disponibilidad = 'vacia' and exists (
  select 1 from public.usuarios u
  where u.id = auth.uid() and u.perfil in ('dueno', 'supervisor')
));

drop policy if exists mesas_disponibilidad on public.mesas;
create policy mesas_disponibilidad on public.mesas for update to authenticated
using (exists (
  select 1 from public.usuarios u
  where u.id = auth.uid() and u.perfil in ('dueno', 'supervisor')
))
with check (exists (
  select 1 from public.usuarios u
  where u.id = auth.uid() and u.perfil in ('dueno', 'supervisor')
));
commit;
