-- Migración: Actualizar tipos de movimiento permitidos
-- Fecha: 2026-04-30
-- Descripción: Agregar todos los tipos de movimiento necesarios para el CRM
-- Esto corrige el error "violates check constraint movimientos_financieros_tipo_movimiento_check"

-- 1. Eliminar la restricción CHECK existente si existe
DO $$
BEGIN
    -- Verificar si la restricción existe antes de intentar eliminarla
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'movimientos_financieros_tipo_movimiento_check'
        AND conrelid = 'movimientos_financieros'::regclass
    ) THEN
        ALTER TABLE movimientos_financieros
        DROP CONSTRAINT movimientos_financieros_tipo_movimiento_check;
    END IF;
END $$;

-- 2. Agregar nueva restricción CHECK con todos los tipos permitidos
ALTER TABLE movimientos_financieros
ADD CONSTRAINT movimientos_financieros_tipo_movimiento_check
CHECK (
    tipo_movimiento IN (
        -- Ingresos
        'factura_venta',
        'pago_factura_electronica',
        'pago_facturas_remision',
        -- Impuestos
        'pago_iva',
        'pago_ica',
        -- Servicios Públicos 1P
        'servicios_agua_1p',
        'servicios_luz_1p',
        'servicios_gas_1p',
        -- Servicios Públicos 2P
        'servicios_agua_2p',
        'servicios_luz_2p',
        'servicios_gas_2p',
        -- Arriendos
        'arriendo_2p',
        'arriendo_1p',
        -- Nómina
        'pago_nomina_javier',
        'pago_nomina_carolina',
        'pago_nomina_nils',
        'pago_nomina_edinson',
        'pago_nomina_jerson',
        'pago_nomina_yurley',
        'pago_dias_trabajo',
        'seguridad_social',
        -- Insumos y Materiales
        'insumos',
        'insumos_acrilicos',
        'insumos_adhesivos_lonas',
        'insumos_electricos',
        'insumos_mdf',
        'insumo_plotter',
        'mojica_impresiones',
        'impresion_litografia',
        'montajes_litograficos',
        'acabados',
        'compra_herramienta',
        -- Servicios y Otros
        'domicilios',
        'movistar_celulares',
        'movistar_internet',
        'servicio_indriver',
        'servicio_contable',
        'gastos_familia_moreno',
        'creditos_bancos'
    )
);

-- 3. Verificar que la restricción se creó correctamente
DO $$
BEGIN
    RAISE NOTICE 'Restricción movimientos_financieros_tipo_movimiento_check actualizada exitosamente';
END $$;
