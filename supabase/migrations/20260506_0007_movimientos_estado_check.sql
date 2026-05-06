-- Migration: Permitir estado 'pago_parcial' en movimientos_financieros
-- Fecha: 2026-05-06
DO $$
BEGIN -- Si existe el constraint actual, lo eliminamos para recrearlo con el nuevo conjunto de valores
IF EXISTS (
    SELECT
        1
    FROM
        pg_constraint c
        JOIN pg_class t ON c.conrelid = t.oid
    WHERE
        t.relname = 'movimientos_financieros'
        AND c.conname = 'movimientos_financieros_estado_check'
) THEN
ALTER TABLE
    public.movimientos_financieros DROP CONSTRAINT IF EXISTS movimientos_financieros_estado_check;

RAISE NOTICE 'Constraint movimientos_financieros_estado_check eliminado';

END IF;

-- Crear el constraint con los valores permitidos, incluyendo 'pago_parcial'
ALTER TABLE
    public.movimientos_financieros
ADD
    CONSTRAINT movimientos_financieros_estado_check CHECK (
        estado IN (
            'pendiente',
            'pagado',
            'parcial',
            'pago_parcial',
            'anulado'
        )
    );

RAISE NOTICE 'Constraint movimientos_financieros_estado_check creado/actualizado';

END $$;