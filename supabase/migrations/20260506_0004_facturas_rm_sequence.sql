-- Migration: Crear sequence para consecutivo RM y trigger para asignarlo
-- Fecha: 2026-05-06
-- 1) Crear la sequence si no existe
CREATE SEQUENCE IF NOT EXISTS public.facturas_rm_seq INCREMENT BY 1 MINVALUE 1 START 1;

-- 2) Inicializar la sequence para continuar desde el mayor número existente (extrae dígitos de numero_factura)
DO $ $ DECLARE next_start bigint := 1;

BEGIN PERFORM 1;

-- placeholder
SELECT
    COALESCE(
        MAX(
            (regexp_replace(numero_factura, '\\D', '', 'g')) :: bigint
        ),
        0
    ) + 1 INTO next_start
FROM
    public.facturas
WHERE
    prefijo = 'RM';

IF next_start IS NULL THEN next_start := 1;

END IF;

-- set the sequence to next_start - 1 so nextval returns next_start
PERFORM setval(
    'public.facturas_rm_seq',
    GREATEST(next_start - 1, 0),
    true
);

END $ $;

-- 3) Función para asignar número formateado en facturas antes de insert
CREATE
OR REPLACE FUNCTION public.assign_factura_rm_numero() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $ $ BEGIN IF (TG_OP = 'INSERT') THEN IF NEW.prefijo = 'RM'
AND (
    NEW.numero_factura IS NULL
    OR btrim(NEW.numero_factura) = ''
) THEN NEW.numero_factura := lpad(nextval('public.facturas_rm_seq') :: text, 4, '0');

END IF;

END IF;

RETURN NEW;

END;

$ $;

-- 4) Crear trigger que usa la función
DO $ $ BEGIN IF EXISTS (
    SELECT
        1
    FROM
        pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE
        c.relname = 'facturas'
) THEN DROP TRIGGER IF EXISTS facturas_assign_rm_numero_trigger ON public.facturas;

CREATE TRIGGER facturas_assign_rm_numero_trigger BEFORE
INSERT
    ON public.facturas FOR EACH ROW EXECUTE PROCEDURE public.assign_factura_rm_numero();

END IF;

END $ $;

-- 5) Notificación
RAISE NOTICE 'Migración creada: sequence facturas_rm_seq y trigger assign_factura_rm_numero';