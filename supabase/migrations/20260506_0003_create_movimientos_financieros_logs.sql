-- Migration: Crear tabla de logs para movimientos_financieros
-- Fecha: 2026-05-06
-- 1) Crear tabla de logs (si no existe)
CREATE TABLE IF NOT EXISTS public.movimientos_financieros_logs (
    id bigserial PRIMARY KEY,
    movimiento_id bigint,
    accion text,
    detalle jsonb,
    usuario_email text,
    created_at timestamptz DEFAULT now(),
    fecha_hora timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS movimientos_financieros_logs_movimiento_id_idx ON public.movimientos_financieros_logs(movimiento_id);

CREATE INDEX IF NOT EXISTS movimientos_financieros_logs_created_at_idx ON public.movimientos_financieros_logs(created_at);

-- 2) Habilitar RLS y políticas básicas (usar funciones helper existentes en migrations previas)
ALTER TABLE
    public.movimientos_financieros_logs ENABLE ROW LEVEL SECURITY;

-- Permitir SELECT a roles autenticados con permisos de módulo relevantes
DROP POLICY IF EXISTS movimientos_logs_select_allowed ON public.movimientos_financieros_logs;

CREATE POLICY movimientos_logs_select_allowed ON public.movimientos_financieros_logs FOR
SELECT
    TO authenticated USING (
        private.has_any_permission(
            array ['module.movimientos', 'module.reportes', 'module.iva']
        )
    );

-- Permitir INSERT por usuarios autenticados que tengan permiso de creación de movimientos
DROP POLICY IF EXISTS movimientos_logs_insert_allowed ON public.movimientos_financieros_logs;

CREATE POLICY movimientos_logs_insert_allowed ON public.movimientos_financieros_logs FOR
INSERT
    TO authenticated WITH CHECK (
        private.has_permission('action.movimientos.create')
    );

-- 3) Función/trigger para registrar cambios en movimientos_financieros
CREATE
OR REPLACE FUNCTION public.log_movimiento_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $ $ BEGIN IF TG_OP = 'DELETE' THEN
INSERT INTO
    public.movimientos_financieros_logs (
        movimiento_id,
        accion,
        detalle,
        usuario_email,
        created_at
    )
VALUES
    (
        OLD.id,
        'delete',
        to_jsonb(OLD),
        current_setting('request.jwt.claims.email', true),
        now()
    );

RETURN OLD;

ELSE
INSERT INTO
    public.movimientos_financieros_logs (
        movimiento_id,
        accion,
        detalle,
        usuario_email,
        created_at
    )
VALUES
    (
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        to_jsonb(COALESCE(NEW, OLD)),
        current_setting('request.jwt.claims.email', true),
        now()
    );

RETURN NEW;

END IF;

END;

$ $;

-- Crear trigger en la tabla de movimientos_financieros
DO $ $ BEGIN IF EXISTS (
    SELECT
        1
    FROM
        pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE
        c.relname = 'movimientos_financieros'
) THEN DROP TRIGGER IF EXISTS movimientos_logs_trigger ON public.movimientos_financieros;

CREATE TRIGGER movimientos_logs_trigger
AFTER
INSERT
    OR
UPDATE
    OR DELETE ON public.movimientos_financieros FOR EACH ROW EXECUTE PROCEDURE public.log_movimiento_change();

END IF;

END $ $;

-- 4) Notificar
RAISE NOTICE 'Migración creada: movimientos_financieros_logs (tabla, políticas y trigger)';