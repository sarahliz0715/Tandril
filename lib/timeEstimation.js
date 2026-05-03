/**
 * Time Estimation for AI Commands
 *
 * Calculates how many minutes of manual work the AI saved the user.
 * Each command type has a base time (minimum saved per command)
 * plus a per-item rate that scales with how many products/items were affected.
 *
 * Time Table:
 * ┌──────────────────────┬───────────┬──────────────┐
 * │ Command Type         │ Base (min)│ Per Item (min)│
 * ├──────────────────────┼───────────┼──────────────┤
 * │ SEO Update           │    15     │     3.0      │
 * │ Description Update   │    10     │     2.0      │
 * │ Price Update         │     5     │     1.0      │
 * │ Inventory Scan       │     5     │     0.5      │
 * │ Create Listing       │    20     │     0.0      │
 * │ CTA Update           │     5     │     1.0      │
 * │ Bulk Update          │    10     │     2.0      │
 * │ Default / Custom     │    10     │     2.0      │
 * └──────────────────────┴───────────┴──────────────┘
 */

export const TIME_TABLE = {
  // Commands
  'SEO Update':          { baseMinutes: 15, perItemMinutes: 3.0 },
  'Description Update':  { baseMinutes: 10, perItemMinutes: 2.0 },
  'Price Update':        { baseMinutes:  5, perItemMinutes: 1.0 },
  'Inventory Scan':      { baseMinutes:  5, perItemMinutes: 0.5 },
  'Create Listing':      { baseMinutes: 20, perItemMinutes: 0.0 },
  'CTA Update':          { baseMinutes:  5, perItemMinutes: 1.0 },
  'Bulk Update':         { baseMinutes: 10, perItemMinutes: 2.0 },
  // Orion actions (matched against execution_results.action_type)
  'update_price':        { baseMinutes:  5, perItemMinutes: 1.0 },
  'update_inventory':    { baseMinutes:  5, perItemMinutes: 0.5 },
  'update_title':        { baseMinutes:  5, perItemMinutes: 1.0 },
  'create_product':      { baseMinutes: 20, perItemMinutes: 0.0 },
  'upload_image':        { baseMinutes:  5, perItemMinutes: 1.0 },
  // Workflow creation
  'workflow':            { baseMinutes: 10, perItemMinutes: 0.0 },
};

const DEFAULT_TIME = { baseMinutes: 10, perItemMinutes: 2.0 };

/**
 * Calculate minutes saved for a single completed command, action, or workflow.
 * @param {object} command - An ai_commands record
 * @returns {number} Minutes saved
 */
export function minutesForCommand(command) {
  // Workflow creation
  if (command.source === 'workflow') {
    return TIME_TABLE['workflow'].baseMinutes;
  }

  // Orion actions — use action_type from execution_results
  if (command.source === 'orion') {
    const actionType = command.execution_results?.action_type || '';
    const { baseMinutes, perItemMinutes } = TIME_TABLE[actionType] || DEFAULT_TIME;
    return baseMinutes + perItemMinutes;
  }

  // Commands
  const actionType = command.actions_planned?.[0]?.action_type || 'Custom Command';
  const { baseMinutes, perItemMinutes } = TIME_TABLE[actionType] || DEFAULT_TIME;
  const itemsAffected =
    command.execution_results?.success_count ||
    command.results?.success_count ||
    0;
  return baseMinutes + itemsAffected * perItemMinutes;
}

/**
 * Calculate total minutes saved across an array of completed commands.
 * Only counts commands with status === 'completed'.
 * @param {Array} commands
 * @returns {number} Total minutes saved
 */
export function calculateTotalMinutesSaved(commands) {
  return commands
    .filter(c => c.status === 'completed')
    .reduce((sum, c) => sum + minutesForCommand(c), 0);
}

/**
 * Format a duration in minutes into a readable string.
 * Examples:  45 → "45 min"   90 → "1h 30m"   180 → "3h"
 * @param {number} totalMinutes
 * @returns {string}
 */
export function formatTimeSaved(totalMinutes) {
  if (!totalMinutes || totalMinutes < 1) return '0 min';

  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);

  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
