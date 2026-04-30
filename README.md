# CD-software

Aplicacion web CRM para gestion administrativa y financiera.

## Supabase

El acceso se controla con perfiles y roles en Supabase.

- `SuperAdmin` administra usuarios, roles y permisos.
- `Auxiliar` opera con los permisos asignados.
- Las invitaciones se envian desde el panel de usuarios y usan la Edge Function `invite-user`.

## Bootstrap del primer SuperAdmin

No existe una credencial fija de SuperAdmin en el repositorio. Para crear el primer acceso debes usar Supabase Auth y luego asignar el perfil con `role_key = 'SuperAdmin'` en la tabla `public.profiles`.

Variables necesarias para la Edge Function:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
