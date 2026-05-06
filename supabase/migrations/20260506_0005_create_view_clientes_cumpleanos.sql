-- Migration: Crear vista con próximos cumpleaños de clientes
-- Fecha: 2026-05-06
CREATE
OR REPLACE VIEW public.clientes_proximos_cumpleanos AS
SELECT
    id,
    nit,
    nombre,
    responsable,
    telefono,
    correo,
    direccion,
    fecha_cumpleaños,
    CASE
        WHEN fecha_cumpleaños IS NULL THEN NULL
        ELSE (
            CASE
                WHEN make_date(
                    EXTRACT(
                        YEAR
                        FROM
                            current_date
                    ) :: int,
                    EXTRACT(
                        MONTH
                        FROM
                            fecha_cumpleaños
                    ) :: int,
                    EXTRACT(
                        DAY
                        FROM
                            fecha_cumpleaños
                    ) :: int
                ) >= current_date THEN make_date(
                    EXTRACT(
                        YEAR
                        FROM
                            current_date
                    ) :: int,
                    EXTRACT(
                        MONTH
                        FROM
                            fecha_cumpleaños
                    ) :: int,
                    EXTRACT(
                        DAY
                        FROM
                            fecha_cumpleaños
                    ) :: int
                )
                ELSE make_date(
                    EXTRACT(
                        YEAR
                        FROM
                            current_date
                    ) :: int + 1,
                    EXTRACT(
                        MONTH
                        FROM
                            fecha_cumpleaños
                    ) :: int,
                    EXTRACT(
                        DAY
                        FROM
                            fecha_cumpleaños
                    ) :: int
                )
            END
        )
    END AS next_birthday,
    CASE
        WHEN fecha_cumpleaños IS NULL THEN NULL
        ELSE (
            (
                CASE
                    WHEN make_date(
                        EXTRACT(
                            YEAR
                            FROM
                                current_date
                        ) :: int,
                        EXTRACT(
                            MONTH
                            FROM
                                fecha_cumpleaños
                        ) :: int,
                        EXTRACT(
                            DAY
                            FROM
                                fecha_cumpleaños
                        ) :: int
                    ) >= current_date THEN make_date(
                        EXTRACT(
                            YEAR
                            FROM
                                current_date
                        ) :: int,
                        EXTRACT(
                            MONTH
                            FROM
                                fecha_cumpleaños
                        ) :: int,
                        EXTRACT(
                            DAY
                            FROM
                                fecha_cumpleaños
                        ) :: int
                    )
                    ELSE make_date(
                        EXTRACT(
                            YEAR
                            FROM
                                current_date
                        ) :: int + 1,
                        EXTRACT(
                            MONTH
                            FROM
                                fecha_cumpleaños
                        ) :: int,
                        EXTRACT(
                            DAY
                            FROM
                                fecha_cumpleaños
                        ) :: int
                    )
                END
            ) - current_date
        ) :: int
    )
END AS days_until
FROM
    public.clientes
WHERE
    fecha_cumpleaños IS NOT NULL;

GRANT
SELECT
    ON public.clientes_proximos_cumpleanos TO authenticated,
    service_role;

RAISE NOTICE 'Migración creada: vista clientes_proximos_cumpleanos';