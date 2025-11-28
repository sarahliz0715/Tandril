// Supabase Entities
// Database wrappers for accessing Supabase tables with a similar API to Base44 entities

import { supabase } from './supabaseClient';

/**
 * Create a generic entity wrapper for Supabase tables
 * @param {string} tableName - Name of the table in Supabase
 * @returns {object} Entity methods (list, get, create, update, delete, filter, count)
 */
function createSupabaseEntity(tableName) {
  return {
    /**
     * List all records with optional ordering
     * @param {string} orderBy - Column to order by (prefix with '-' for descending)
     * @returns {Promise<Array>}
     */
    async list(orderBy = '-created_at') {
      const isDescending = orderBy.startsWith('-');
      const column = isDescending ? orderBy.slice(1) : orderBy;

      let query = supabase
        .from(tableName)
        .select('*')
        .order(column, { ascending: !isDescending });

      const { data, error } = await query;

      if (error) {
        console.error(`[Supabase Entity] Error listing ${tableName}:`, error);
        throw new Error(error.message);
      }

      return data || [];
    },

    /**
     * Get a single record by ID
     * @param {string} id - Record ID
     * @returns {Promise<object>}
     */
    async get(id) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error(`[Supabase Entity] Error getting ${tableName}:`, error);
        throw new Error(error.message);
      }

      return data;
    },

    /**
     * Create a new record
     * @param {object} values - Record data
     * @returns {Promise<object>}
     */
    async create(values) {
      const { data, error } = await supabase
        .from(tableName)
        .insert(values)
        .select()
        .single();

      if (error) {
        console.error(`[Supabase Entity] Error creating ${tableName}:`, error);
        throw new Error(error.message);
      }

      return data;
    },

    /**
     * Update a record by ID
     * @param {string} id - Record ID
     * @param {object} values - Updated data
     * @returns {Promise<object>}
     */
    async update(id, values) {
      const { data, error } = await supabase
        .from(tableName)
        .update(values)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`[Supabase Entity] Error updating ${tableName}:`, error);
        throw new Error(error.message);
      }

      return data;
    },

    /**
     * Delete a record by ID
     * @param {string} id - Record ID
     * @returns {Promise<void>}
     */
    async delete(id) {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`[Supabase Entity] Error deleting ${tableName}:`, error);
        throw new Error(error.message);
      }
    },

    /**
     * Filter records by criteria
     * @param {object} filters - Filter criteria (e.g., { is_active: true })
     * @param {string} orderBy - Column to order by
     * @returns {Promise<Array>}
     */
    async filter(filters = {}, orderBy = '-created_at') {
      const isDescending = orderBy.startsWith('-');
      const column = isDescending ? orderBy.slice(1) : orderBy;

      let query = supabase
        .from(tableName)
        .select('*');

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      query = query.order(column, { ascending: !isDescending });

      const { data, error } = await query;

      if (error) {
        console.error(`[Supabase Entity] Error filtering ${tableName}:`, error);
        throw new Error(error.message);
      }

      return data || [];
    },

    /**
     * Count records with optional filters
     * @param {object} filters - Filter criteria
     * @returns {Promise<number>}
     */
    async count(filters = {}) {
      let query = supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      const { count, error } = await query;

      if (error) {
        console.error(`[Supabase Entity] Error counting ${tableName}:`, error);
        throw new Error(error.message);
      }

      return count || 0;
    },

    /**
     * Find many records with advanced querying
     * @param {object} options - Query options
     * @returns {Promise<Array>}
     */
    async findMany(options = {}) {
      const { where = {}, orderBy = '-created_at', limit, offset } = options;

      const isDescending = orderBy.startsWith('-');
      const column = isDescending ? orderBy.slice(1) : orderBy;

      let query = supabase
        .from(tableName)
        .select('*');

      // Apply where conditions
      Object.entries(where).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      // Apply ordering
      query = query.order(column, { ascending: !isDescending });

      // Apply pagination
      if (limit) {
        query = query.limit(limit);
      }
      if (offset) {
        query = query.range(offset, offset + (limit || 50) - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error(`[Supabase Entity] Error finding ${tableName}:`, error);
        throw new Error(error.message);
      }

      return data || [];
    },
  };
}

// Create entity wrappers for Supabase tables
export const supabasePlatform = createSupabaseEntity('platforms');
export const supabaseAICommand = createSupabaseEntity('ai_commands');
export const supabaseSavedCommand = createSupabaseEntity('saved_commands');
export const supabaseAIWorkflow = createSupabaseEntity('ai_workflows');
export const supabaseWorkflowTemplate = createSupabaseEntity('workflow_templates');
export const supabaseWorkflowRun = createSupabaseEntity('workflow_runs');

// Export all Supabase entities
export const createSupabaseEntities = () => ({
  Platform: supabasePlatform,
  AICommand: supabaseAICommand,
  SavedCommand: supabaseSavedCommand,
  AIWorkflow: supabaseAIWorkflow,
  WorkflowTemplate: supabaseWorkflowTemplate,
  WorkflowRun: supabaseWorkflowRun,
});
