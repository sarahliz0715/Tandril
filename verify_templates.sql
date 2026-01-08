-- Quick check: Are the templates in the database?
SELECT id, name, is_featured, created_at
FROM workflow_templates
ORDER BY created_at;

-- Check RLS policies
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'workflow_templates';
