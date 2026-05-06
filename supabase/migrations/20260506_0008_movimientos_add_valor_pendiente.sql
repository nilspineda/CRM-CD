-- Migration: Añadir columna `valor_pendiente` a movimientos_financieros
-- Fecha: 2026-05-06
DO $ $ BEGIN IF NOT EXISTS (
    SELECT
        1
    FROM
        information_schema.columns
    WHERE
        table_schema = 'public'
        AND table_name = 'movimientos_financieros'
        AND column_name = 'valor_pendiente'
) THEN
ALTER TABLE
    public.movimientos_financieros
ADD
    COLUMN valor_pendiente integer DEFAULT 0;

RAISE NOTICE 'Columna valor_pendiente añadida a movimientos_financieros';

ELSE RAISE NOTICE 'Columna valor_pendiente ya existe en movimientos_financieros';

END IF;

END $ $;

-- Inicializar valor_pendiente en registros existentes según estado/valor_pagado
UPDATE
    public.movimientos_financieros
SET
    valor_pendiente = CASE
        WHEN estado = 'pagado' THEN 0
        WHEN estado = 'pago_parcial' THEN GREATEST((valor_total - COALESCE(valor_pagado, 0)), 0)
        ELSE COALESCE(valor_total, 0)
    END
WHERE
    valor_pendiente IS NULL
    OR valor_pendiente <> (
        CASE
            WHEN estado = 'pagado' THEN 0
            WHEN estado = 'pago_parcial' THEN GREATEST((valor_total - COALESCE(valor_pagado, 0)), 0)
            ELSE COALESCE(valor_total, 0)
        END
    );

RAISE NOTICE 'Migración completada: movimientos_financieros.valor_pendiente';