-- Seed: Crear el primer SuperAdmin
-- Ejecuta este archivo después de la migración principal.
-- Actualiza el email y password según necesites.

-- Nota: En Supabase, los usuarios auth se crean desde el Admin API o desde el dashboard.
-- Este seed inserta el perfil asociado asumiendo que el usuario ya existe en auth.users.

-- Opción 1: Si ya existe un usuario en auth con su UUID, usa su ID así:
-- insert into public.profiles (
--   id,
--   email,
--   full_name,
--   role_key,
--   permissions,
--   created_at,
--   updated_at
-- ) values (
--   '00000000-0000-0000-0000-000000000001'::uuid,
--   'admin@example.com',
--   'Administrador del Sistema',
--   'SuperAdmin',
--   '[]'::jsonb,
--   now(),
--   now()
-- ) on conflict (id) do update set
--   role_key = 'SuperAdmin',
--   full_name = 'Administrador del Sistema',
--   updated_at = now();

-- Opción 2 (Recomendada): Usar el Admin API desde una función serverless o desde Supabase CLI
-- En Supabase CLI:
--   supabase sql
--   -- Dentro del prompt de psql:
--   select * from auth.users; -- para verificar que el usuario exista
--   insert into public.profiles (...) values (uuid_del_usuario, ...);

-- Si prefieres crear el usuario directamente en la BD (dev only):
-- INSERT INTO auth.users (
--   id,
--   instance_id,
--   email,
--   encrypted_password,
--   email_confirmed_at,
--   created_at,
--   updated_at,
--   raw_app_meta_data,
--   raw_user_meta_data,
--   is_super_admin,
--   is_sso_user
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000001'::uuid,
--   '00000000-0000-0000-0000-000000000000'::uuid,
--   'superadmin@crm.local',
--   crypt('SuperAdmin123', gen_salt('bf')),
--   now(),
--   now(),
--   now(),
--   '{"provider":"email","providers":["email"]}'::jsonb,
--   '{"role_key":"SuperAdmin"}'::jsonb,
--   true,
--   false
-- ) ON CONFLICT (id) DO NOTHING;

-- Luego insertar el perfil:
-- INSERT INTO public.profiles (
--   id,
--   email,
--   full_name,
--   role_key,
--   permissions,
--   created_at,
--   updated_at
-- ) VALUES (
--   '00000000-0000-0000-0000-000000000001'::uuid,
--   'superadmin@crm.local',
--   'SuperAdmin',
--   'SuperAdmin',
--   '[]'::jsonb,
--   now(),
--   now()
-- ) ON CONFLICT (id) DO UPDATE SET
--   role_key = 'SuperAdmin',
--   updated_at = now();

-- INSTRUCCIONES PASO A PASO:

-- 1. Accede a Supabase Dashboard > Authentication > Users
-- 2. Haz clic en "Add user" > "Create new user"
-- 3. Ingresa email: superadmin@tudominio.com (o el que prefieras)
-- 4. Ingresa contraseña: UnaContraseñaSegura123!
-- 5. Haz clic en "Create user"
-- 6. Copia el UUID del usuario creado
-- 7. Abre Supabase Dashboard > SQL Editor
-- 8. Ejecuta este comando reemplazando el UUID y email:

INSERT INTO public.profiles (
  id,
  email,
  full_name,
  role_key,
  permissions,
  created_at,
  updated_at
) VALUES (
  -- REEMPLAZA ESTE UUID CON EL DEL USUARIO CREADO:
  '00000000-0000-0000-0000-000000000001'::uuid,
  'superadmin@crm.local',
  'Administrador del Sistema',
  'SuperAdmin',
  '[]'::jsonb,
  now(),
  now()
) ON CONFLICT (id) DO UPDATE SET
  role_key = 'SuperAdmin',
  email = excluded.email,
  full_name = excluded.full_name,
  updated_at = now();

-- Una vez ejecutado, el usuario puede iniciar sesión en la app y verá el panel de Usuarios.
