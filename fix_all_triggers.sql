-- Fix all uppercase triggers with individual functions per table

-- categorias_financieras
DROP TRIGGER IF EXISTS uppercase_text_trigger ON public.categorias_financieras;
DROP FUNCTION IF EXISTS public.uppercase_text_columns_trigger_categorias();
CREATE FUNCTION public.uppercase_text_columns_trigger_categorias() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.nombre IS NOT NULL THEN NEW.nombre := upper(NEW.nombre); END IF;
    IF NEW.tipo_categoria IS NOT NULL THEN NEW.tipo_categoria := upper(NEW.tipo_categoria); END IF;
    IF NEW.descripcion IS NOT NULL THEN NEW.descripcion := upper(NEW.descripcion); END IF;
    RETURN NEW;
END;$$;
CREATE TRIGGER uppercase_text_trigger BEFORE INSERT OR UPDATE ON public.categorias_financieras FOR EACH ROW EXECUTE FUNCTION public.uppercase_text_columns_trigger_categorias();

-- cuentas_financieras
DROP TRIGGER IF EXISTS uppercase_text_trigger ON public.cuentas_financieras;
DROP FUNCTION IF EXISTS public.uppercase_text_columns_trigger_cuentas();
CREATE FUNCTION public.uppercase_text_columns_trigger_cuentas() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.nombre IS NOT NULL THEN NEW.nombre := upper(NEW.nombre); END IF;
    IF NEW.tipo_cuenta IS NOT NULL THEN NEW.tipo_cuenta := upper(NEW.tipo_cuenta); END IF;
    IF NEW.descripcion IS NOT NULL THEN NEW.descripcion := upper(NEW.descripcion); END IF;
    RETURN NEW;
END;$$;
CREATE TRIGGER uppercase_text_trigger BEFORE INSERT OR UPDATE ON public.cuentas_financieras FOR EACH ROW EXECUTE FUNCTION public.uppercase_text_columns_trigger_cuentas();

-- facturas
DROP TRIGGER IF EXISTS uppercase_text_trigger ON public.facturas;
DROP FUNCTION IF EXISTS public.uppercase_text_columns_trigger_facturas();
CREATE FUNCTION public.uppercase_text_columns_trigger_facturas() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.cliente_nit IS NOT NULL THEN NEW.cliente_nit := upper(NEW.cliente_nit); END IF;
    IF NEW.prefijo IS NOT NULL THEN NEW.prefijo := upper(NEW.prefijo); END IF;
    IF NEW.numero_factura IS NOT NULL THEN NEW.numero_factura := upper(NEW.numero_factura); END IF;
    IF NEW.observaciones IS NOT NULL THEN NEW.observaciones := upper(NEW.observaciones); END IF;
    IF NEW.estado IS NOT NULL THEN NEW.estado := upper(NEW.estado); END IF;
    RETURN NEW;
END;$$;
CREATE TRIGGER uppercase_text_trigger BEFORE INSERT OR UPDATE ON public.facturas FOR EACH ROW EXECUTE FUNCTION public.uppercase_text_columns_trigger_facturas();

-- movimientos_financieros
DROP TRIGGER IF EXISTS uppercase_text_trigger ON public.movimientos_financieros;
DROP FUNCTION IF EXISTS public.uppercase_text_columns_trigger_movimientos();
CREATE FUNCTION public.uppercase_text_columns_trigger_movimientos() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.numero_factura IS NOT NULL THEN NEW.numero_factura := upper(NEW.numero_factura); END IF;
    IF NEW.tipo_movimiento IS NOT NULL THEN NEW.tipo_movimiento := upper(NEW.tipo_movimiento); END IF;
    IF NEW.cliente_proveedor IS NOT NULL THEN NEW.cliente_proveedor := upper(NEW.cliente_proveedor); END IF;
    IF NEW.descripcion IS NOT NULL THEN NEW.descripcion := upper(NEW.descripcion); END IF;
    IF NEW.estado IS NOT NULL THEN NEW.estado := upper(NEW.estado); END IF;
    IF NEW.metodo_pago IS NOT NULL THEN NEW.metodo_pago := upper(NEW.metodo_pago); END IF;
    IF NEW.observaciones IS NOT NULL THEN NEW.observaciones := upper(NEW.observaciones); END IF;
    RETURN NEW;
END;$$;
CREATE TRIGGER uppercase_text_trigger BEFORE INSERT OR UPDATE ON public.movimientos_financieros FOR EACH ROW EXECUTE FUNCTION public.uppercase_text_columns_trigger_movimientos();

-- movimientos_financieros_logs
DROP TRIGGER IF EXISTS uppercase_text_trigger ON public.movimientos_financieros_logs;
DROP FUNCTION IF EXISTS public.uppercase_text_columns_trigger_movimientos_logs();
CREATE FUNCTION public.uppercase_text_columns_trigger_movimientos_logs() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.movimiento_id IS NOT NULL THEN NEW.movimiento_id := upper(NEW.movimiento_id); END IF;
    IF NEW.accion IS NOT NULL THEN NEW.accion := upper(NEW.accion); END IF;
    IF NEW.detalle IS NOT NULL THEN NEW.detalle := upper(NEW.detalle); END IF;
    IF NEW.usuario_email IS NOT NULL THEN NEW.usuario_email := upper(NEW.usuario_email); END IF;
    RETURN NEW;
END;$$;
CREATE TRIGGER uppercase_text_trigger BEFORE INSERT OR UPDATE ON public.movimientos_financieros_logs FOR EACH ROW EXECUTE FUNCTION public.uppercase_text_columns_trigger_movimientos_logs();

-- profiles
DROP TRIGGER IF EXISTS uppercase_text_trigger ON public.profiles;
DROP FUNCTION IF EXISTS public.uppercase_text_columns_trigger_profiles();
CREATE FUNCTION public.uppercase_text_columns_trigger_profiles() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.email IS NOT NULL THEN NEW.email := upper(NEW.email); END IF;
    IF NEW.full_name IS NOT NULL THEN NEW.full_name := upper(NEW.full_name); END IF;
    IF NEW.role_key IS NOT NULL THEN NEW.role_key := upper(NEW.role_key); END IF;
    RETURN NEW;
END;$$;
CREATE TRIGGER uppercase_text_trigger BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.uppercase_text_columns_trigger_profiles();

-- roles
DROP TRIGGER IF EXISTS uppercase_text_trigger ON public.roles;
DROP FUNCTION IF EXISTS public.uppercase_text_columns_trigger_roles();
CREATE FUNCTION public.uppercase_text_columns_trigger_roles() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.key IS NOT NULL THEN NEW.key := upper(NEW.key); END IF;
    IF NEW.label IS NOT NULL THEN NEW.label := upper(NEW.label); END IF;
    RETURN NEW;
END;$$;
CREATE TRIGGER uppercase_text_trigger BEFORE INSERT OR UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.uppercase_text_columns_trigger_roles();

-- clientes (already fixed)