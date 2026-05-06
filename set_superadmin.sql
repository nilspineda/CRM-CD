-- Set SuperAdmin role for nilspineda and conceptodigitalimp
UPDATE public.profiles 
SET role_key = 'SuperAdmin', permissions = '["*"]'::jsonb 
WHERE id = '7b9ddda0-25c8-4090-b45a-a0692742bcdf' 
   OR id = 'bf9b62d9-95fe-4d06-89b4-69c981e47c3f'
RETURNING id, email, role_key;