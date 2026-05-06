-- clientes specific
DROP TRIGGER IF EXISTS uppercase_text_trigger ON public.clientes;
DROP FUNCTION IF EXISTS public.uppercase_text_columns_trigger_clientes();
CREATE FUNCTION public.uppercase_text_columns_trigger_clientes() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.nit IS NOT NULL THEN NEW.nit := upper(NEW.nit); END IF;
    IF NEW.nombre IS NOT NULL THEN NEW.nombre := upper(NEW.nombre); END IF;
    IF NEW.direccion IS NOT NULL THEN NEW.direccion := upper(NEW.direccion); END IF;
    IF NEW.responsable IS NOT NULL THEN NEW.responsable := upper(NEW.responsable); END IF;
    IF NEW.observaciones IS NOT NULL THEN NEW.observaciones := upper(NEW.observaciones); END IF;
    RETURN NEW;
END;$$;
CREATE TRIGGER uppercase_text_trigger BEFORE INSERT OR UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.uppercase_text_columns_trigger_clientes();