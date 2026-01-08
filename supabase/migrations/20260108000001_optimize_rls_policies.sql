-- Optimize RLS Policies for Performance
-- Fixes Supabase linter warnings by wrapping auth.uid() in subqueries
-- This prevents re-evaluation of auth functions for each row
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- =============================================
-- PLATFORMS TABLE (4 policies)
-- =============================================

DROP POLICY IF EXISTS "Users can view their own platforms" ON platforms;
CREATE POLICY "Users can view their own platforms"
    ON platforms FOR SELECT
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own platforms" ON platforms;
CREATE POLICY "Users can insert their own platforms"
    ON platforms FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own platforms" ON platforms;
CREATE POLICY "Users can update their own platforms"
    ON platforms FOR UPDATE
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own platforms" ON platforms;
CREATE POLICY "Users can delete their own platforms"
    ON platforms FOR DELETE
    USING ((select auth.uid()) = user_id);

-- =============================================
-- AI_COMMANDS TABLE (3 policies)
-- =============================================

DROP POLICY IF EXISTS "Users can view their own commands" ON ai_commands;
CREATE POLICY "Users can view their own commands"
    ON ai_commands FOR SELECT
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own commands" ON ai_commands;
CREATE POLICY "Users can insert their own commands"
    ON ai_commands FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own commands" ON ai_commands;
CREATE POLICY "Users can update their own commands"
    ON ai_commands FOR UPDATE
    USING ((select auth.uid()) = user_id);

-- =============================================
-- SAVED_COMMANDS TABLE (4 policies)
-- =============================================

DROP POLICY IF EXISTS "Users can view their own saved commands" ON saved_commands;
CREATE POLICY "Users can view their own saved commands"
    ON saved_commands FOR SELECT
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own saved commands" ON saved_commands;
CREATE POLICY "Users can insert their own saved commands"
    ON saved_commands FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own saved commands" ON saved_commands;
CREATE POLICY "Users can update their own saved commands"
    ON saved_commands FOR UPDATE
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own saved commands" ON saved_commands;
CREATE POLICY "Users can delete their own saved commands"
    ON saved_commands FOR DELETE
    USING ((select auth.uid()) = user_id);

-- =============================================
-- AI_WORKFLOWS TABLE (4 policies)
-- =============================================

DROP POLICY IF EXISTS "Users can view their own workflows" ON ai_workflows;
CREATE POLICY "Users can view their own workflows"
    ON ai_workflows FOR SELECT
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own workflows" ON ai_workflows;
CREATE POLICY "Users can insert their own workflows"
    ON ai_workflows FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own workflows" ON ai_workflows;
CREATE POLICY "Users can update their own workflows"
    ON ai_workflows FOR UPDATE
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own workflows" ON ai_workflows;
CREATE POLICY "Users can delete their own workflows"
    ON ai_workflows FOR DELETE
    USING ((select auth.uid()) = user_id);

-- =============================================
-- WORKFLOW_RUNS TABLE (2 policies)
-- =============================================

DROP POLICY IF EXISTS "Users can view their workflow runs" ON workflow_runs;
CREATE POLICY "Users can view their workflow runs"
    ON workflow_runs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM ai_workflows
            WHERE ai_workflows.id = workflow_runs.workflow_id
            AND ai_workflows.user_id = (select auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can insert workflow runs" ON workflow_runs;
CREATE POLICY "Users can insert workflow runs"
    ON workflow_runs FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM ai_workflows
            WHERE ai_workflows.id = workflow_runs.workflow_id
            AND ai_workflows.user_id = (select auth.uid())
        )
    );

-- =============================================
-- OAUTH_STATES TABLE (3 policies)
-- =============================================
-- Add RLS if not already enabled
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own oauth states" ON oauth_states;
CREATE POLICY "Users can insert their own oauth states"
    ON oauth_states FOR INSERT
    WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can view their own oauth states" ON oauth_states;
CREATE POLICY "Users can view their own oauth states"
    ON oauth_states FOR SELECT
    USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own oauth states" ON oauth_states;
CREATE POLICY "Users can delete their own oauth states"
    ON oauth_states FOR DELETE
    USING ((select auth.uid()) = user_id);
