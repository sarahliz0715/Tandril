# Enhanced Command Understanding

This feature provides advanced AI command interpretation with preview mode, ambiguity detection, complex condition handling, and undo capabilities.

## Features

### 1. Preview Mode (Dry-Run)
Before executing any command, users can see exactly what will change:

- **Visual Before/After Comparison**: See the current state vs. what will change
- **Impact Estimation**: Understand how many items will be affected
- **Risk Assessment**: Commands are classified as low/medium/high risk
- **Sample Changes**: View a sample of what will be modified

**Example:**
```javascript
const preview = await api.functions.enhancedExecuteCommand({
  command_id: 'cmd_123',
  actions: [...],
  platform_targets: ['my-store'],
  preview_mode: true  // Enable preview mode
});
// Returns detailed preview without making changes
```

### 2. Complex Multi-Condition Commands
Handle sophisticated commands with AND/OR logic:

**Examples:**
- "Update all products with 'vintage' in the title AND price > $50 AND inventory < 10"
- "If product is out of stock AND hasn't sold in 30 days, reduce price by 15%"
- "Find bestsellers OR products with perfect 5-star reviews"

**Filter Structure:**
```javascript
{
  filters: [
    { field: "title", operator: "contains", value: "vintage", logic: "AND" },
    { field: "price", operator: "greater_than", value: 50, logic: "AND" },
    { field: "inventory_quantity", operator: "less_than", value: 10 }
  ]
}
```

**Supported Operators:**
- `equals`, `not_equals`
- `contains`, `not_contains`
- `greater_than`, `less_than`
- `greater_than_or_equal`, `less_than_or_equal`

### 3. Ambiguity Detection & Clarification
When a command is unclear, the AI will ask follow-up questions:

**Example Interaction:**
```
User: "Discount my products"
AI: "We need more information:"
  - Which products? [All / Specific Collection / Matching Criteria]
  - What discount amount? [10% / 20% / 30% / Custom]
  - How long should the discount last? [Forever / 1 week / 1 month]
```

**Implementation:**
The AI returns a `clarification_needed` object when the command is ambiguous:
```javascript
{
  clarification_needed: {
    reason: "Command is too broad and could affect many products",
    questions: [
      {
        question: "Which products should this apply to?",
        type: "choice",
        options: ["All products", "Specific collection", "Products matching criteria"]
      }
    ],
    suggestions: ["Be more specific about which products to target"]
  }
}
```

### 4. Undo/Rollback Capability
Revert commands that didn't work as expected:

**How it works:**
1. Before executing a command, the system captures a "before" snapshot
2. After execution, it captures an "after" snapshot
3. Users can click "Undo" to revert to the before state

**Supported Undo Actions:**
- ✅ Product updates (prices, titles, descriptions, variants)
- ✅ Discount/price rule creation (deletes the created rule)
- ⚠️ Inventory updates (limited - manual adjustment may be needed)
- ⚠️ SEO updates (limited - manual restoration may be needed)

**Example:**
```javascript
// Execute a command with undo tracking
await api.functions.enhancedExecuteCommand({
  command_id: 'cmd_123',
  actions: [...],
  platform_targets: ['my-store'],
  preview_mode: false,
  track_for_undo: true  // Enable undo tracking
});

// Later, if needed, undo it
await api.functions.undoCommand('cmd_123');
```

## API Reference

### Enhanced Interpret Command
```typescript
api.functions.enhancedInterpretCommand({
  command_text: string,         // Natural language command
  platform_targets: string[],   // Platform names (e.g., ['my-store'])
  context?: {                   // Optional context from clarification
    previous_question?: string,
    user_answer?: string
  },
  request_preview?: boolean     // Whether to recommend preview (default: true)
})
```

**Returns:**
```javascript
{
  actions: [...],               // Structured actions to execute
  confidence_score: 0.95,       // AI's confidence (0.0-1.0)
  warnings: [...],              // Any warnings or risks
  estimated_impact: {
    description: "Will update ~50 products",
    affected_items_estimate: "~50 products",
    risk_level: "medium",       // low | medium | high
    reversible: true            // Whether undo is supported
  },
  clarification_needed: null | {...},  // Clarification questions if needed
  preview_recommended: true,    // Whether preview should be shown
  supports_undo: true           // Whether undo is available
}
```

### Enhanced Execute Command
```typescript
api.functions.enhancedExecuteCommand({
  command_id: string,           // ID of the command being executed
  actions: Array<Action>,       // Actions from interpretation
  platform_targets: string[],   // Platform names
  preview_mode?: boolean,       // true = dry-run, false = execute (default: false)
  track_for_undo?: boolean      // Enable undo tracking (default: true)
})
```

**Returns (Preview Mode):**
```javascript
{
  results: [
    {
      action: "update_products",
      platform: "my-store",
      success: true,
      result: {
        affected_count: 50,
        results: [
          {
            product_id: 123,
            product_title: "Vintage T-Shirt",
            before: { price: "29.99" },
            after: { price: "23.99" },
            simulated: true
          }
        ]
      },
      preview_mode: true
    }
  ],
  summary: {
    total_actions: 1,
    successful: 1,
    failed: 0,
    preview_mode: true,
    can_undo: false
  }
}
```

**Returns (Execute Mode):**
```javascript
{
  results: [...],  // Same structure but with actual changes
  summary: {
    total_actions: 1,
    successful: 1,
    failed: 0,
    preview_mode: false,
    can_undo: true  // true if changes were tracked
  },
  change_snapshots: [...]  // Before/after states for undo
}
```

### Undo Command
```typescript
api.functions.undoCommand(command_id: string)
```

**Returns:**
```javascript
{
  results: [
    {
      action_type: "update_products",
      success: true,
      result: { reverted: 50, failed: 0 }
    }
  ],
  summary: {
    total_reverted: 50,
    successful: 50,
    failed: 0
  },
  message: "Successfully reverted 50/50 changes"
}
```

## UI Components

### CommandPreview
Displays a detailed preview of what will change:
```jsx
<CommandPreview
  previewData={preview}
  onExecute={() => executeCommand()}
  onCancel={() => cancelCommand()}
/>
```

### ClarificationDialog
Shows clarification questions when command is ambiguous:
```jsx
<ClarificationDialog
  isOpen={showDialog}
  onClose={() => setShowDialog(false)}
  clarificationData={clarification}
  onSubmitAnswer={(context) => reinterpretWithContext(context)}
/>
```

## Database Schema

### command_history table
Stores snapshots of changes for undo functionality:

```sql
CREATE TABLE command_history (
  id UUID PRIMARY KEY,
  command_id UUID REFERENCES ai_commands(id),
  user_id UUID REFERENCES auth.users(id),
  change_snapshots JSONB,      -- Array of before/after states
  can_undo BOOLEAN,             -- Whether undo is supported
  executed_at TIMESTAMP,
  undone_at TIMESTAMP,          -- NULL if not undone yet
  undo_results JSONB,
  created_at TIMESTAMP
);
```

## Best Practices

1. **Always Use Preview First**: For bulk operations, always run in preview mode first
2. **Review Warnings**: Pay attention to risk level and warnings
3. **Test with Small Sets**: Test commands on a small subset before applying to all items
4. **Keep Undo Available**: Don't disable `track_for_undo` unless you're certain
5. **Handle Clarifications**: Always check for `clarification_needed` and prompt users

## Example Workflows

### Complete Command Execution Flow
```javascript
// 1. Interpret the command
const interpretation = await api.functions.enhancedInterpretCommand({
  command_text: "Update all vintage products to 20% off",
  platform_targets: ['my-store']
});

// 2. Check for clarifications
if (interpretation.clarification_needed) {
  // Show clarification dialog to user
  const answers = await showClarificationDialog(interpretation.clarification_needed);

  // Re-interpret with answers
  interpretation = await api.functions.enhancedInterpretCommand({
    command_text: "Update all vintage products to 20% off",
    platform_targets: ['my-store'],
    context: answers
  });
}

// 3. Run preview
const preview = await api.functions.enhancedExecuteCommand({
  command_id: cmd.id,
  actions: interpretation.actions,
  platform_targets: ['my-store'],
  preview_mode: true
});

// 4. Show preview to user
const approved = await showPreviewAndConfirm(preview);

// 5. Execute if approved
if (approved) {
  const result = await api.functions.enhancedExecuteCommand({
    command_id: cmd.id,
    actions: interpretation.actions,
    platform_targets: ['my-store'],
    preview_mode: false,
    track_for_undo: true
  });

  // 6. Optionally, allow undo
  if (result.summary.can_undo) {
    showUndoButton(cmd.id);
  }
}
```

## Limitations

1. **Undo Limitations**:
   - Inventory and SEO updates have limited undo support
   - Deleted items cannot be restored
   - Third-party integrations may not support undo

2. **Preview Accuracy**:
   - Preview is a simulation and may not be 100% accurate
   - Some dynamic values (like timestamps) cannot be previewed exactly

3. **Complexity Limits**:
   - Very complex nested conditions may need to be broken into multiple commands
   - API rate limits may affect large batch operations

## Future Enhancements

- [ ] Full undo support for inventory and SEO
- [ ] Batch preview with pagination
- [ ] Scheduled command execution
- [ ] Command templates and favorites
- [ ] Multi-platform atomic transactions
- [ ] Conflict detection and resolution
