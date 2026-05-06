-- Migration: Normalizar texto a MAYÚSCULAS en columnas text/varchar (crear trigger genérico)
-- Fecha: 2026-05-06
-- 1) Crear función trigger genérica que convierte a mayúsculas las columnas text/varchar
CREATE
OR REPLACE FUNCTION public.uppercase_text_columns_trigger() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $ $ DECLARE cols text [];

col text;

j jsonb := to_jsonb(NEW);

reg regclass;

BEGIN -- obtener columnas text/varchar de la tabla objetivo
SELECT
    array_agg(column_name) INTO cols
FROM
    information_schema.columns
WHERE
    table_schema = TG_TABLE_SCHEMA
    AND table_name = TG_TABLE_NAME
    AND data_type IN ('text', 'character varying');

IF cols IS NULL THEN RETURN NEW;

END IF;

-- transformar en el JSON sólo las claves que existen
FOREACH col IN ARRAY cols LOOP IF j ? col THEN j := jsonb_set(j, ARRAY [col], to_jsonb(upper(j ->> col)), true);

END IF;

END LOOP;

-- recrear el registro tipado a partir del json modificado
reg := (TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME) :: regclass;

-- jsonb_populate_record devuelve un composite; seleccionar sus campos con '.*'
-- asegura que la fila resultante tenga la misma estructura que la tabla objetivo
EXECUTE format(
    'SELECT (jsonb_populate_record(NULL::%s, $1)).*',
    reg
) INTO NEW USING j;

RETURN NEW;

END;

$ $;

-- 2) Crear triggers en todas las tablas existentes del esquema public
DO $ $ DECLARE r record;

BEGIN FOR r IN
SELECT
    table_schema,
    table_name
FROM
    information_schema.tables
WHERE
    table_schema = 'public'
    AND table_type = 'BASE TABLE' LOOP -- eliminar trigger si existe
    EXECUTE format(
        'DROP TRIGGER IF EXISTS uppercase_text_trigger ON %I.%I',
        r.table_schema,
        r.table_name
    );

-- crear trigger
EXECUTE format(
    'CREATE TRIGGER uppercase_text_trigger BEFORE INSERT OR UPDATE ON %I.%I FOR EACH ROW EXECUTE FUNCTION public.uppercase_text_columns_trigger()',
    r.table_schema,
    r.table_name
);

END LOOP;

END $ $;

-- Nota: Este trigger normaliza sólo columnas text/character varying. Si alguna columna
-- debe quedar en minúsculas (ej. contraseñas, hashes), excluirla explicitamente
-- modificando/creando triggers específicos para esa tabla.