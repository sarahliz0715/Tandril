/**
 * Diff Service - Before/After Preview
 *
 * Captures current state of products/listings and generates
 * a preview of what will change before applying updates.
 *
 * Critical for building user trust and preventing mistakes.
 */

import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';

export class DiffService {
  /**
   * Capture current state of products
   */
  async captureProductState(productIds) {
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      include: {
        listings: {
          include: {
            platform: {
              select: { id: true, name: true, type: true },
            },
          },
        },
        inventoryItems: {
          select: {
            location: true,
            quantity: true,
            available: true,
          },
        },
      },
    });

    return products.map(product => this.serializeProduct(product));
  }

  /**
   * Generate diff between current and proposed changes
   */
  generateDiff(currentState, proposedChanges) {
    const diffs = [];

    for (const product of currentState) {
      const proposed = proposedChanges.find(p => p.id === product.id);
      if (!proposed) continue;

      const productDiff = {
        productId: product.id,
        productName: product.name,
        changes: [],
      };

      // Compare each field
      for (const field of Object.keys(proposed)) {
        if (field === 'id') continue;

        const currentValue = product[field];
        const proposedValue = proposed[field];

        if (!this.valuesEqual(currentValue, proposedValue)) {
          productDiff.changes.push({
            field,
            fieldLabel: this.getFieldLabel(field),
            before: this.formatValue(field, currentValue),
            after: this.formatValue(field, proposedValue),
            changeType: this.getChangeType(field, currentValue, proposedValue),
          });
        }
      }

      if (productDiff.changes.length > 0) {
        diffs.push(productDiff);
      }
    }

    return diffs;
  }

  /**
   * Preview price update across products
   */
  async previewPriceUpdate(productIds, updateType, value) {
    const currentState = await this.captureProductState(productIds);

    const proposedChanges = currentState.map(product => {
      let newPrice;

      switch (updateType) {
        case 'increase_percent':
          newPrice = product.price * (1 + value / 100);
          break;
        case 'decrease_percent':
          newPrice = product.price * (1 - value / 100);
          break;
        case 'increase_amount':
          newPrice = product.price + value;
          break;
        case 'decrease_amount':
          newPrice = product.price - value;
          break;
        case 'set_fixed':
          newPrice = value;
          break;
        default:
          newPrice = product.price;
      }

      return {
        id: product.id,
        price: Math.round(newPrice * 100) / 100, // Round to 2 decimals
      };
    });

    const diff = this.generateDiff(currentState, proposedChanges);

    return {
      summary: {
        productsAffected: diff.length,
        updateType,
        value,
      },
      changes: diff,
      currentState,
      proposedState: proposedChanges,
    };
  }

  /**
   * Preview inventory update
   */
  async previewInventoryUpdate(inventoryItemIds, operation, quantity) {
    const items = await prisma.inventoryItem.findMany({
      where: {
        id: { in: inventoryItemIds },
      },
      include: {
        product: {
          select: { id: true, name: true, sku: true },
        },
      },
    });

    const diffs = items.map(item => {
      let newQuantity;

      switch (operation) {
        case 'set':
          newQuantity = quantity;
          break;
        case 'add':
          newQuantity = item.quantity + quantity;
          break;
        case 'subtract':
          newQuantity = Math.max(0, item.quantity - quantity);
          break;
        default:
          newQuantity = item.quantity;
      }

      return {
        inventoryItemId: item.id,
        productName: item.product.name,
        sku: item.product.sku,
        location: item.location,
        changes: [
          {
            field: 'quantity',
            fieldLabel: 'Quantity',
            before: item.quantity,
            after: newQuantity,
            changeType: newQuantity > item.quantity ? 'increase' : newQuantity < item.quantity ? 'decrease' : 'no_change',
          },
          {
            field: 'available',
            fieldLabel: 'Available',
            before: item.available,
            after: newQuantity - item.reserved,
            changeType: 'calculated',
          },
        ],
      };
    });

    return {
      summary: {
        itemsAffected: diffs.length,
        operation,
        quantity,
      },
      changes: diffs,
    };
  }

  /**
   * Preview title/description updates
   */
  async previewListingUpdate(listingIds, updates) {
    const listings = await prisma.listing.findMany({
      where: {
        id: { in: listingIds },
      },
      include: {
        product: {
          select: { id: true, name: true, sku: true },
        },
        platform: {
          select: { name: true, type: true },
        },
      },
    });

    const currentState = listings.map(listing => ({
      id: listing.id,
      productName: listing.product.name,
      platformName: listing.platform.name,
      title: listing.title || listing.product.name,
      description: listing.description || listing.product.description,
      price: listing.price || listing.product.price,
    }));

    const proposedChanges = currentState.map(listing => ({
      ...listing,
      ...updates,
    }));

    const diff = this.generateDiff(currentState, proposedChanges);

    return {
      summary: {
        listingsAffected: diff.length,
        fieldsUpdated: Object.keys(updates),
      },
      changes: diff,
    };
  }

  /**
   * Preview bulk command execution
   */
  async previewCommand(commandText, interpretation, productIds) {
    logger.info(`Generating preview for command: ${commandText}`);

    const currentState = await this.captureProductState(productIds);

    // Parse command intent and generate proposed changes
    const proposedChanges = this.generateProposedChanges(interpretation, currentState);

    const diff = this.generateDiff(currentState, proposedChanges);

    return {
      command: commandText,
      interpretation,
      summary: {
        productsAffected: diff.length,
        totalChanges: diff.reduce((sum, d) => sum + d.changes.length, 0),
      },
      changes: diff,
      riskLevel: this.calculateRiskLevel(diff),
      canRevert: true,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  serializeProduct(product) {
    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      description: product.description,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      cost: product.cost,
      brand: product.brand,
      category: product.category,
      tags: product.tags,
      images: product.images,
      listings: product.listings?.length || 0,
      inventory: product.inventoryItems?.reduce((sum, item) => sum + item.available, 0) || 0,
    };
  }

  valuesEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (Array.isArray(a) && Array.isArray(b)) {
      return JSON.stringify(a) === JSON.stringify(b);
    }
    if (typeof a === 'object' && typeof b === 'object') {
      return JSON.stringify(a) === JSON.stringify(b);
    }
    return false;
  }

  formatValue(field, value) {
    if (value == null) return 'Not set';

    switch (field) {
      case 'price':
      case 'compareAtPrice':
      case 'cost':
        return `$${parseFloat(value).toFixed(2)}`;

      case 'tags':
        return Array.isArray(value) ? value.join(', ') : value;

      case 'images':
        return Array.isArray(value) ? `${value.length} image(s)` : value;

      case 'description':
        return value.length > 100 ? `${value.substring(0, 100)}...` : value;

      default:
        return String(value);
    }
  }

  getFieldLabel(field) {
    const labels = {
      sku: 'SKU',
      name: 'Product Name',
      description: 'Description',
      price: 'Price',
      compareAtPrice: 'Compare At Price',
      cost: 'Cost',
      brand: 'Brand',
      category: 'Category',
      tags: 'Tags',
      images: 'Images',
      title: 'Title',
      quantity: 'Quantity',
      available: 'Available',
    };

    return labels[field] || field;
  }

  getChangeType(field, before, after) {
    if (before == null) return 'added';
    if (after == null) return 'removed';

    if (field === 'price' || field === 'cost' || field === 'compareAtPrice') {
      return parseFloat(after) > parseFloat(before) ? 'increase' : 'decrease';
    }

    if (field === 'quantity' || field === 'available') {
      return parseInt(after) > parseInt(before) ? 'increase' : 'decrease';
    }

    return 'modified';
  }

  generateProposedChanges(interpretation, currentState) {
    // This would use AI to interpret the command and generate proposed changes
    // For now, returning empty array as placeholder
    // In production, this would call your AI service

    logger.info('Generating proposed changes from interpretation');

    // Example implementation:
    const action = interpretation.action || 'update';
    const field = interpretation.field || 'price';
    const value = interpretation.value;

    return currentState.map(product => {
      const changes = { id: product.id };

      if (action === 'increase_price' && field === 'price') {
        changes.price = product.price * (1 + value / 100);
      }

      return changes;
    });
  }

  calculateRiskLevel(diff) {
    const totalChanges = diff.reduce((sum, d) => sum + d.changes.length, 0);
    const priceChanges = diff.reduce(
      (sum, d) => sum + d.changes.filter(c => c.field === 'price').length,
      0
    );

    if (priceChanges > 10 || totalChanges > 50) return 'HIGH';
    if (priceChanges > 5 || totalChanges > 20) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Compare two states and generate summary
   */
  generateChangeSummary(before, after) {
    return {
      fieldsChanged: Object.keys(after).filter(key => !this.valuesEqual(before[key], after[key])),
      significantChanges: this.getSignificantChanges(before, after),
      impact: this.assessImpact(before, after),
    };
  }

  getSignificantChanges(before, after) {
    const significant = [];

    // Price changes over 10%
    if (before.price && after.price) {
      const changePercent = Math.abs((after.price - before.price) / before.price) * 100;
      if (changePercent > 10) {
        significant.push({
          field: 'price',
          type: 'major_price_change',
          percent: changePercent.toFixed(1),
        });
      }
    }

    // Inventory changes
    if (before.inventory && after.inventory) {
      if (after.inventory < before.inventory * 0.5) {
        significant.push({
          field: 'inventory',
          type: 'major_inventory_decrease',
        });
      }
    }

    return significant;
  }

  assessImpact(before, after) {
    const impacts = [];

    // Check if product will become unprofitable
    if (after.price && after.cost && after.price < after.cost * 1.5) {
      impacts.push('low_profit_margin');
    }

    // Check if out of stock
    if (after.inventory <= 0) {
      impacts.push('will_be_out_of_stock');
    }

    return impacts;
  }
}

export default new DiffService();
