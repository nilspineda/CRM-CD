-- Drop trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS private.handle_new_profile();

-- Recreate function with RETURN NULL
CREATE OR REPLACE FUNCTION private.handle_new_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role_key, permissions, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''::text),
        NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''::text)), ''::text),
        COALESCE(NEW.raw_user_meta_data->>'role_key', NEW.raw_user_meta_data->>'role', 'Auxiliar'::text),
        COALESCE(NEW.raw_user_meta_data->'permissions', '[]'::jsonb),
        now(),
        now()
    ) ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        role_key = COALESCE(EXCLUDED.role_key, public.profiles.role_key),
        permissions = COALESCE(EXCLUDED.permissions, public.profiles.permissions),
        updated_at = now();

    RETURN NULL;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.handle_new_profile();