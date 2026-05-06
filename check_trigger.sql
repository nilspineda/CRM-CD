SELECT 
    tg.tgname,
    pg_get_triggerdef(tg.tgfoid) as trigger_def,
    tg.tgenabled as enabled,
    CASE tg.tgtype & 1 
        WHEN 1 THEN 'ROW' 
        ELSE 'STATEMENT' 
    END as level,
    CASE tg.tgtype & 2 
        WHEN 2 THEN 'BEFORE' 
        WHEN 4 THEN 'AFTER' 
        WHEN 8 THEN 'INSTEAD OF' 
        ELSE 'UNKNOWN' 
    END as timing,
    CASE 
        WHEN tg.tgtype & 32 = 32 THEN 'INSERT'
        WHEN tg.tgtype & 64 = 64 THEN 'DELETE'
        WHEN tg.tgtype & 128 = 128 THEN 'UPDATE'
        ELSE 'UNKNOWN'
    END as event,
    p.proname as function_name,
    n.nspname as function_schema
FROM pg_trigger tg
JOIN pg_proc p ON tg.tgfoid = p.oid
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE tg.tgname = 'on_auth_user_created';