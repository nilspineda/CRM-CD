create schema if not exists private;

create table if not exists public.roles (
    key text primary key,
    label text not null,
    permissions jsonb not null default '[]' :: jsonb,
    sort_order integer not null default 0,
    is_system boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    email text not null unique,
    full_name text,
    role_key text not null default 'Auxiliar' references public.roles (key),
    permissions jsonb not null default '[]' :: jsonb,
    invited_by uuid references auth.users (id) on delete set null,
    invited_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

insert into public.roles (key, label, permissions, sort_order, is_system)
values
    ('SuperAdmin', 'SuperAdmin', '["*"]' :: jsonb, 1, true),
    ('Auxiliar', 'Auxiliar', '[
    "module.dashboard",
    "module.clientes",
    "module.movimientos",
    "module.facturas",
    "action.clientes.create",
    "action.clientes.edit",
    "action.clientes.delete",
    "action.movimientos.create",
    "action.movimientos.edit",
    "action.movimientos.delete",
    "action.facturas.change-state"
  ]' :: jsonb, 2, true)
on conflict (key) do update set
    label = excluded.label,
    permissions = excluded.permissions,
    sort_order = excluded.sort_order,
    is_system = excluded.is_system,
    updated_at = now();

create or replace function private.current_profile() returns public.profiles
language sql stable security definer set search_path = public as $func$
select p.* from public.profiles p where p.id = auth.uid() limit 1;
$func$;

create or replace function private.is_super_admin() returns boolean
language sql stable security definer set search_path = public as $func$
select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role_key = 'SuperAdmin'
);
$func$;

create or replace function private.has_permission(required_permission text) returns boolean
language sql stable security definer set search_path = public as $func$
select auth.uid() is not null and (
    private.is_super_admin() or exists (
        select 1 from public.profiles p
        left join public.roles r on r.key = p.role_key
        where p.id = auth.uid() and (
            coalesce(p.permissions, '[]' :: jsonb) ? required_permission
            or coalesce(r.permissions, '[]' :: jsonb) ? required_permission
        )
    )
);
$func$;

create or replace function private.has_any_permission(required_permissions text []) returns boolean
language sql stable security definer set search_path = public as $func$
select auth.uid() is not null and (
    private.is_super_admin() or exists (
        select 1 from unnest(required_permissions) as required_permission
        where private.has_permission(required_permission)
    )
);
$func$;

create or replace function private.handle_new_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
    insert into public.profiles (id, email, full_name, role_key, permissions, created_at, updated_at)
    values (
        new.id,
        coalesce(new.email, ''),
        nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')), ''),
        coalesce(new.raw_user_meta_data->>'role_key', new.raw_user_meta_data->>'role', 'Auxiliar'),
        coalesce(new.raw_user_meta_data->'permissions', '[]' :: jsonb),
        now(),
        now()
    ) on conflict (id) do update set
        email = excluded.email,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        role_key = coalesce(excluded.role_key, public.profiles.role_key),
        permissions = coalesce(excluded.permissions, public.profiles.permissions),
        updated_at = now();

    return NULL;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_profile();

create or replace function private.touch_updated_at() returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists roles_touch_updated_at on public.roles;
create trigger roles_touch_updated_at before update on public.roles for each row execute procedure private.touch_updated_at();

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles for each row execute procedure private.touch_updated_at();

alter table public.roles enable row level security;
alter table public.profiles enable row level security;
alter table public.clientes enable row level security;
alter table public.movimientos_financieros enable row level security;
alter table public.facturas enable row level security;
alter table public.cuentas_financieras enable row level security;

drop policy if exists roles_select_superadmin on public.roles;
create policy roles_select_superadmin on public.roles for select to authenticated using (private.is_super_admin());

drop policy if exists roles_write_superadmin on public.roles;
create policy roles_write_superadmin on public.roles for all to authenticated using (private.is_super_admin()) with check (private.is_super_admin());

drop policy if exists profiles_select_self_or_superadmin on public.profiles;
create policy profiles_select_self_or_superadmin on public.profiles for select to authenticated using ((select auth.uid()) = id or private.is_super_admin());

drop policy if exists profiles_write_superadmin on public.profiles;
create policy profiles_write_superadmin on public.profiles for all to authenticated using (private.is_super_admin()) with check (private.is_super_admin());

drop policy if exists clientes_select_allowed on public.clientes;
create policy clientes_select_allowed on public.clientes for select to authenticated using (private.has_permission('module.clientes'));

drop policy if exists clientes_insert_allowed on public.clientes;
create policy clientes_insert_allowed on public.clientes for insert to authenticated with check (private.has_permission('action.clientes.create'));

drop policy if exists clientes_update_allowed on public.clientes;
create policy clientes_update_allowed on public.clientes for update using (private.has_permission('action.clientes.edit')) with check (private.has_permission('action.clientes.edit'));

drop policy if exists clientes_delete_allowed on public.clientes;
create policy clientes_delete_allowed on public.clientes for delete to authenticated using (private.has_permission('action.clientes.delete'));

drop policy if exists movimientos_select_allowed on public.movimientos_financieros;
create policy movimientos_select_allowed on public.movimientos_financieros for select to authenticated using (private.has_any_permission(array ['module.movimientos', 'module.reportes', 'module.iva']));

drop policy if exists movimientos_insert_allowed on public.movimientos_financieros;
create policy movimientos_insert_allowed on public.movimientos_financieros for insert to authenticated with check (private.has_permission('action.movimientos.create'));

drop policy if exists movimientos_update_allowed on public.movimientos_financieros;
create policy movimientos_update_allowed on public.movimientos_financieros for update using (private.has_permission('action.movimientos.edit')) with check (private.has_permission('action.movimientos.edit'));

drop policy if exists movimientos_delete_allowed on public.movimientos_financieros;
create policy movimientos_delete_allowed on public.movimientos_financieros for delete to authenticated using (private.has_permission('action.movimientos.delete'));

drop policy if exists facturas_select_allowed on public.facturas;
create policy facturas_select_allowed on public.facturas for select to authenticated using (private.has_permission('module.facturas'));

drop policy if exists facturas_insert_allowed on public.facturas;
create policy facturas_insert_allowed on public.facturas for insert to authenticated with check (private.has_permission('action.facturas.create'));

drop policy if exists facturas_update_allowed on public.facturas;
create policy facturas_update_allowed on public.facturas for update using (private.has_any_permission(array ['action.facturas.edit', 'action.facturas.change-state'])) with check (private.has_any_permission(array ['action.facturas.edit', 'action.facturas.change-state']));

drop policy if exists facturas_delete_allowed on public.facturas;
create policy facturas_delete_allowed on public.facturas for delete to authenticated using (private.has_permission('action.facturas.edit'));

drop policy if exists cuentas_select_allowed on public.cuentas_financieras;
create policy cuentas_select_allowed on public.cuentas_financieras for select to authenticated using (private.has_any_permission(array ['module.cuentas', 'module.movimientos', 'module.facturas', 'module.reportes', 'module.iva']));

drop policy if exists cuentas_write_allowed on public.cuentas_financieras;
create policy cuentas_write_allowed on public.cuentas_financieras for update using (private.has_any_permission(array ['module.cuentas', 'action.movimientos.create', 'action.movimientos.edit', 'action.facturas.create', 'action.facturas.edit', 'action.facturas.change-state'])) with check (private.has_any_permission(array ['module.cuentas', 'action.movimientos.create', 'action.movimientos.edit', 'action.facturas.create', 'action.facturas.edit', 'action.facturas.change-state']));

drop policy if exists cuentas_insert_superadmin on public.cuentas_financieras;
create policy cuentas_insert_superadmin on public.cuentas_financieras for insert to authenticated with check (private.is_super_admin());

drop policy if exists cuentas_delete_superadmin on public.cuentas_financieras;
create policy cuentas_delete_superadmin on public.cuentas_financieras for delete to authenticated using (private.is_super_admin());

grant usage on schema private to authenticated, service_role;
grant execute on function private.current_profile() to authenticated, service_role;
grant execute on function private.is_super_admin() to authenticated, service_role;
grant execute on function private.has_permission(text) to authenticated, service_role;
grant execute on function private.has_any_permission(text []) to authenticated, service_role;
grant select, insert, update, delete on public.roles to authenticated, service_role;
grant select, insert, update, delete on public.profiles to authenticated, service_role;
grant select, insert, update, delete on public.clientes to authenticated, service_role;
grant select, insert, update, delete on public.movimientos_financieros to authenticated, service_role;
grant select, insert, update, delete on public.facturas to authenticated, service_role;
grant select, insert, update, delete on public.cuentas_financieras to authenticated, service_role;