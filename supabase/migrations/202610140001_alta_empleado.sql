-- La tabla usuarios existente debe vincular su id con auth.users(id).
alter table public.usuarios add column if not exists cuil text;
create unique index if not exists usuarios_cuil_unico on public.usuarios(cuil) where cuil is not null;
-- Si hay DNI duplicados, resolverlos antes de aplicar este índice.
create unique index if not exists usuarios_dni_unico on public.usuarios(dni) where dni is not null;

-- Las políticas existentes de clientes no deben permitir crear perfiles privilegiados.
create or replace function public.proteger_perfil_usuario()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('postgres', 'supabase_admin') or coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;
  if TG_OP = 'INSERT' then
    if new.perfil not in ('cliente_registrado', 'cliente_anonimo') or new.perfil is null then
      raise exception 'El alta de empleados requiere la función administrativa';
    end if;
  elsif new.perfil is distinct from old.perfil or new.id is distinct from old.id then
    raise exception 'No se permite cambiar el perfil ni la identidad del usuario';
  end if;
  return new;
end;
$$;
drop trigger if exists proteger_perfil_usuario on public.usuarios;
create trigger proteger_perfil_usuario before insert or update on public.usuarios
for each row execute function public.proteger_perfil_usuario();
