-- Add factura permissions to Auxiliar by user ID
UPDATE public.profiles 
SET permissions = '["module.dashboard", "module.clientes", "module.movimientos", "module.facturas", "action.clientes.create", "action.clientes.edit", "action.clientes.delete", "action.movimientos.create", "action.movimientos.edit", "action.movimientos.delete", "action.facturas.create", "action.facturas.edit", "action.facturas.change-state"]'::jsonb 
WHERE id = '2ca7d796-9b2d-478a-b649-223f33715134'
RETURNING id, role_key;