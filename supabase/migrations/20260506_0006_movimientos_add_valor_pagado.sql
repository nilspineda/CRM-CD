-- Migration: Añadir columna `valor_pagado` a movimientos_financieros
-- Fecha: 2026-05-06
DO $ $ BEGIN IF NOT EXISTS (
    SELECT
        1
    FROM
        information_schema.columns
    WHERE
        table_schema = 'public'
        AND table_name = 'movimientos_financieros'
        AND column_name = 'valor_pagado'
) THEN
ALTER TABLE
    public.movimientos_financieros
ADD
    COLUMN valor_pagado integer DEFAULT 0;

RAISE NOTICE 'Columna valor_pagado añadida a movimientos_financieros';

ELSE RAISE NOTICE 'Columna valor_pagado ya existe en movimientos_financieros';

END IF;

END $ $;

-- Asegurar que la columna tiene valor 0 en registros existentes
UPDATE
    public.movimientos_financieros
SET
    valor_pagado = 0
WHERE
    valor_pagado IS NULL;

-- No cambiamos políticas RLS explícitamente; si sus políticas filtran columnas explícitas,
-- asegúrese de adaptar policies en caso de errores tras aplicar la migración.
RAISE NOTICE 'Migración completada: movimientos_financieros.valor_pagado';