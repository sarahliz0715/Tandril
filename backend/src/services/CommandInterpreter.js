/**
 * AI Command Interpreter
 *
 * Uses OpenAI to interpret natural language commands and convert them
 * into structured actions that can be executed.
 *
 * Supports:
 * - Price updates (increase/decrease by %, $, or set fixed)
 * - Inventory updates (set, add, subtract)
 * - Listing updates (title, description)
 * - Bulk operations with filters
 */

import axios from 'axios';
import logger from '../utils/logger.js';

export class CommandInterpreter {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = 'gpt-4o-mini'; // Faster, cheaper for structured output
  }

  /**
   * Interpret natural language command using AI
   */
  async interpret(commandText, context = {}) {
    logger.info(`Interpreting command: "${commandText}"`);

    try {
      // Use OpenAI with structured output
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(),
            },
            {
              role: 'user',
              content: this.formatUserPrompt(commandText, context),
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1, // Low temperature for consistent parsing
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const interpretation = JSON.parse(response.data.choices[0].message.content);

      // Validate interpretation
      this.validateInterpretation(interpretation);

      // Calculate risk level
      interpretation.riskLevel = this.calculateRiskLevel(interpretation);
      interpretation.riskWarning = this.generateRiskWarning(interpretation);

      logger.info('Command interpreted successfully', { interpretation });

      return interpretation;
    } catch (error) {
      logger.error('Command interpretation failed:', error);

      // Fallback to pattern matching if AI fails
      const fallback = this.fallbackInterpret(commandText);
      if (fallback) {
        logger.info('Using fallback interpretation');
        return fallback;
      }

      throw new Error(`Could not interpret command: ${error.message}`);
    }
  }

  /**
   * System prompt for AI
   */
  getSystemPrompt() {
    return `You are a command interpreter for an e-commerce management system. Parse user commands into structured JSON.

Output format:
{
  "action": "update_price" | "update_inventory" | "update_listing" | "bulk_operation",
  "entity": "product" | "listing" | "inventory",
  "operation": {
    "type": "increase_percent" | "decrease_percent" | "increase_amount" | "decrease_amount" | "set_fixed" | "set" | "add" | "subtract" | "replace",
    "value": number,
    "field": "price" | "inventory" | "title" | "description" | "tags"
  },
  "filters": {
    "category": string,
    "priceRange": { min: number, max: number },
    "tags": string[],
    "inventory": { min: number, max: number }
  },
  "targeting": {
    "scope": "all" | "selected" | "filtered",
    "productIds": string[] (if selected)
  },
  "confidence": number (0-1)
}

Examples:
- "increase all prices by 10%" → { action: "update_price", operation: { type: "increase_percent", value: 10 } }
- "set inventory to 50 for product ABC" → { action: "update_inventory", operation: { type: "set", value: 50 }, targeting: { scope: "filtered" } }
- "make titles shorter for products over $100" → { action: "update_listing", operation: { field: "title" }, filters: { priceRange: { min: 100 } } }

Important:
- Always include confidence score
- Be conservative with risky operations (prices, large inventory changes)
- Preserve user intent exactly`;
  }

  /**
   * Format user prompt with context
   */
  formatUserPrompt(commandText, context) {
    let prompt = `Parse this command: "${commandText}"`;

    if (context.productCount) {
      prompt += `\n\nContext: User has ${context.productCount} products`;
    }

    if (context.selectedProducts?.length > 0) {
      prompt += `\nUser has selected ${context.selectedProducts.length} specific products`;
    }

    if (context.currentFilters) {
      prompt += `\nCurrent filters: ${JSON.stringify(context.currentFilters)}`;
    }

    return prompt;
  }

  /**
   * Validate AI interpretation
   */
  validateInterpretation(interpretation) {
    if (!interpretation.action) {
      throw new Error('Missing action in interpretation');
    }

    if (!interpretation.operation) {
      throw new Error('Missing operation in interpretation');
    }

    if (interpretation.confidence < 0.5) {
      throw new Error('Low confidence interpretation');
    }

    // Validate operation has required fields
    if (interpretation.action === 'update_price' || interpretation.action === 'update_inventory') {
      if (interpretation.operation.value === undefined) {
        throw new Error('Missing value in operation');
      }
    }
  }

  /**
   * Calculate risk level for command
   */
  calculateRiskLevel(interpretation) {
    let riskScore = 0;

    // Price changes are risky
    if (interpretation.action === 'update_price') {
      if (interpretation.operation.type.includes('decrease')) {
        riskScore += 2; // Price decreases are riskier
      }
      if (interpretation.operation.value > 20) {
        riskScore += 2; // Large changes are risky
      } else if (interpretation.operation.value > 10) {
        riskScore += 1;
      }
    }

    // Bulk operations are risky
    if (interpretation.targeting?.scope === 'all') {
      riskScore += 2;
    } else if (interpretation.targeting?.scope === 'filtered') {
      riskScore += 1;
    }

    // Large inventory changes
    if (interpretation.action === 'update_inventory' && interpretation.operation.value > 100) {
      riskScore += 1;
    }

    // Low confidence
    if (interpretation.confidence < 0.8) {
      riskScore += 1;
    }

    if (riskScore >= 4) return 'HIGH';
    if (riskScore >= 2) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Generate risk warning message
   */
  generateRiskWarning(interpretation) {
    const warnings = [];

    if (interpretation.action === 'update_price' && interpretation.operation.value > 20) {
      warnings.push(`Large price change (${interpretation.operation.value}%)`);
    }

    if (interpretation.targeting?.scope === 'all') {
      warnings.push('This will affect ALL products');
    }

    if (interpretation.action === 'update_price' && interpretation.operation.type.includes('decrease')) {
      warnings.push('Price decreases may impact profit margins');
    }

    if (interpretation.confidence < 0.8) {
      warnings.push('AI interpretation has lower confidence - please review carefully');
    }

    return warnings.length > 0 ? warnings.join('. ') : null;
  }

  /**
   * Fallback pattern matching if AI fails
   */
  fallbackInterpret(commandText) {
    const text = commandText.toLowerCase();

    // Price increase by percent
    if (/increase.*price.*by\s+(\d+)%/.test(text)) {
      const value = parseFloat(text.match(/(\d+)%/)[1]);
      return {
        action: 'update_price',
        entity: 'product',
        operation: { type: 'increase_percent', value },
        targeting: { scope: 'selected' },
        confidence: 0.9,
        riskLevel: value > 20 ? 'HIGH' : value > 10 ? 'MEDIUM' : 'LOW',
      };
    }

    // Price decrease by percent
    if (/decrease.*price.*by\s+(\d+)%/.test(text)) {
      const value = parseFloat(text.match(/(\d+)%/)[1]);
      return {
        action: 'update_price',
        entity: 'product',
        operation: { type: 'decrease_percent', value },
        targeting: { scope: 'selected' },
        confidence: 0.9,
        riskLevel: 'MEDIUM',
      };
    }

    // Price increase by amount
    if (/increase.*price.*by\s+\$?(\d+\.?\d*)/.test(text)) {
      const value = parseFloat(text.match(/\$?(\d+\.?\d*)/)[1]);
      return {
        action: 'update_price',
        entity: 'product',
        operation: { type: 'increase_amount', value },
        targeting: { scope: 'selected' },
        confidence: 0.9,
        riskLevel: 'LOW',
      };
    }

    // Set inventory
    if (/set.*inventory.*to\s+(\d+)/.test(text)) {
      const value = parseInt(text.match(/(\d+)/)[1]);
      return {
        action: 'update_inventory',
        entity: 'inventory',
        operation: { type: 'set', value },
        targeting: { scope: 'selected' },
        confidence: 0.9,
        riskLevel: 'LOW',
      };
    }

    // Add inventory
    if (/add\s+(\d+).*inventory/.test(text)) {
      const value = parseInt(text.match(/(\d+)/)[1]);
      return {
        action: 'update_inventory',
        entity: 'inventory',
        operation: { type: 'add', value },
        targeting: { scope: 'selected' },
        confidence: 0.9,
        riskLevel: 'LOW',
      };
    }

    return null;
  }

  /**
   * Quick pattern check without AI (for frontend validation)
   */
  quickParse(commandText) {
    const patterns = [
      { regex: /price/i, action: 'update_price' },
      { regex: /inventory|stock/i, action: 'update_inventory' },
      { regex: /title|name/i, action: 'update_listing', field: 'title' },
      { regex: /description/i, action: 'update_listing', field: 'description' },
    ];

    for (const pattern of patterns) {
      if (pattern.regex.test(commandText)) {
        return {
          action: pattern.action,
          field: pattern.field,
          needsFullParse: true,
        };
      }
    }

    return { needsFullParse: true };
  }
}

export default new CommandInterpreter();
