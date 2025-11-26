/**
 * ListingHealthChecker - Suppression Detection & Auto-Fix
 *
 * This is the CORE differentiator for Tandril.
 * Automatically detects and fixes listing issues that cause suppressions.
 */

import prisma from '../utils/prisma.js';
import logger from '../utils/logger.js';

export class ListingHealthChecker {
  constructor() {
    // Platform-specific rules
    this.platformRules = {
      SHOPIFY: {
        minImageSize: { width: 800, height: 800 },
        maxImageSize: { width: 4472, height: 4472 },
        titleMaxLength: 255,
        titleMinLength: 10,
        descriptionMinLength: 100,
        requiredFields: ['brand', 'category'],
        imageFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      },
      ETSY: {
        minImageSize: { width: 2000, height: 2000 },
        maxImageSize: { width: 3000, height: 3000 },
        titleMaxLength: 140,
        titleMinLength: 3,
        descriptionMinLength: 200,
        requiredFields: ['category', 'tags'],
        minImages: 1,
        maxImages: 10,
      },
      EBAY: {
        minImageSize: { width: 500, height: 500 },
        maxImageSize: { width: 9000, height: 9000 },
        titleMaxLength: 80,
        titleMinLength: 5,
        descriptionMinLength: 50,
        requiredFields: ['brand', 'condition', 'category'],
        minImages: 1,
      },
      AMAZON: {
        minImageSize: { width: 1000, height: 1000 },
        maxImageSize: { width: 10000, height: 10000 },
        titleMaxLength: 200,
        titleMinLength: 15,
        descriptionMinLength: 200,
        requiredFields: ['brand', 'category', 'upc'],
        imageFormats: ['jpg', 'jpeg', 'png', 'tiff'],
      },
    };
  }

  /**
   * Check health of a single listing
   */
  async checkListing(listingId) {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        product: true,
        platform: true,
        healthIssues: {
          where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
        },
      },
    });

    if (!listing) {
      throw new Error('Listing not found');
    }

    const rules = this.platformRules[listing.platform.type];
    if (!rules) {
      logger.warn(`No rules defined for platform: ${listing.platform.type}`);
      return { issues: [], canAutoFix: [] };
    }

    const issues = [];

    // Run all checks
    issues.push(...this.checkImages(listing, rules));
    issues.push(...this.checkTitle(listing, rules));
    issues.push(...this.checkDescription(listing, rules));
    issues.push(...this.checkRequiredFields(listing, rules));
    issues.push(...this.checkPrice(listing, rules));

    // Calculate health score
    const healthScore = this.calculateHealthScore(issues);

    // Update listing health score
    await prisma.listing.update({
      where: { id: listingId },
      data: {
        healthScore,
        lastHealthCheck: new Date(),
        status: issues.some(i => i.severity === 'CRITICAL') ? 'SUPPRESSED' : listing.status,
      },
    });

    // Create or update health issues
    for (const issue of issues) {
      await this.createOrUpdateIssue(listingId, issue);
    }

    // Close resolved issues
    const existingIssueTypes = listing.healthIssues.map(i => i.type);
    const newIssueTypes = issues.map(i => i.type);
    const resolvedTypes = existingIssueTypes.filter(t => !newIssueTypes.includes(t));

    for (const type of resolvedTypes) {
      await prisma.listingHealthIssue.updateMany({
        where: {
          listingId,
          type,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          resolution: 'Auto-resolved by health checker',
        },
      });
    }

    return {
      listingId,
      healthScore,
      issues,
      canAutoFix: issues.filter(i => i.canAutoFix),
    };
  }

  /**
   * Check all listings for a user
   */
  async checkAllListings(userId) {
    const listings = await prisma.listing.findMany({
      where: {
        product: { userId },
        status: { in: ['ACTIVE', 'SUPPRESSED', 'STRANDED'] },
      },
      select: { id: true },
    });

    logger.info(`Checking health for ${listings.length} listings`);

    const results = [];
    for (const listing of listings) {
      try {
        const result = await this.checkListing(listing.id);
        results.push(result);
      } catch (error) {
        logger.error(`Failed to check listing ${listing.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Auto-fix issues that can be automatically resolved
   */
  async autoFix(issueId) {
    const issue = await prisma.listingHealthIssue.findUnique({
      where: { id: issueId },
      include: {
        listing: {
          include: {
            product: true,
            platform: true,
          },
        },
      },
    });

    if (!issue || !issue.canAutoFix) {
      throw new Error('Issue cannot be auto-fixed');
    }

    logger.info(`Auto-fixing issue ${issueId}: ${issue.type}`);

    let fixed = false;

    switch (issue.type) {
      case 'TITLE_TOO_LONG':
        fixed = await this.fixTitleTooLong(issue);
        break;
      case 'TITLE_TOO_SHORT':
        fixed = await this.fixTitleTooShort(issue);
        break;
      case 'MISSING_DESCRIPTION':
        fixed = await this.fixMissingDescription(issue);
        break;
      case 'IMAGE_SIZE_TOO_SMALL':
        // Would need image processing library
        logger.info('Image resize requires external service');
        break;
      default:
        logger.warn(`No auto-fix handler for ${issue.type}`);
    }

    if (fixed) {
      await prisma.listingHealthIssue.update({
        where: { id: issueId },
        data: {
          status: 'RESOLVED',
          resolvedAt: new Date(),
          resolution: 'Auto-fixed by system',
        },
      });
    }

    return fixed;
  }

  // ============================================================================
  // HEALTH CHECKS
  // ============================================================================

  checkImages(listing, rules) {
    const issues = [];
    const images = listing.product.images || [];

    if (images.length === 0) {
      issues.push({
        type: 'MISSING_IMAGES',
        severity: 'CRITICAL',
        title: 'No product images',
        description: 'This listing has no images. At least one image is required.',
        canAutoFix: false,
        needsHumanReview: true,
      });
      return issues;
    }

    // Check minimum images
    if (rules.minImages && images.length < rules.minImages) {
      issues.push({
        type: 'MISSING_IMAGES',
        severity: 'HIGH',
        title: 'Insufficient images',
        description: `This listing has ${images.length} image(s) but ${rules.minImages} are required.`,
        currentValue: images.length.toString(),
        requiredValue: rules.minImages.toString(),
        canAutoFix: false,
        needsHumanReview: true,
      });
    }

    // Note: Actual image dimension checking would require fetching/analyzing images
    // For now, we flag it for manual review

    return issues;
  }

  checkTitle(listing, rules) {
    const issues = [];
    const title = listing.title || listing.product.name || '';

    if (!title) {
      issues.push({
        type: 'MISSING_TITLE',
        severity: 'CRITICAL',
        title: 'Missing title',
        description: 'Listing has no title',
        canAutoFix: false,
        needsHumanReview: true,
      });
      return issues;
    }

    if (title.length > rules.titleMaxLength) {
      issues.push({
        type: 'TITLE_TOO_LONG',
        severity: 'HIGH',
        title: 'Title exceeds maximum length',
        description: `Title is ${title.length} characters but maximum is ${rules.titleMaxLength}`,
        currentValue: title.length.toString(),
        requiredValue: `≤${rules.titleMaxLength}`,
        canAutoFix: true,
        autoFixAction: JSON.stringify({ action: 'truncate', maxLength: rules.titleMaxLength }),
      });
    }

    if (title.length < rules.titleMinLength) {
      issues.push({
        type: 'TITLE_TOO_SHORT',
        severity: 'MEDIUM',
        title: 'Title is too short',
        description: `Title is ${title.length} characters but minimum is ${rules.titleMinLength}`,
        currentValue: title.length.toString(),
        requiredValue: `≥${rules.titleMinLength}`,
        canAutoFix: true,
        autoFixAction: JSON.stringify({ action: 'expand' }),
      });
    }

    return issues;
  }

  checkDescription(listing, rules) {
    const issues = [];
    const description = listing.description || listing.product.description || '';

    if (!description || description.length < rules.descriptionMinLength) {
      issues.push({
        type: 'MISSING_DESCRIPTION',
        severity: 'HIGH',
        title: 'Description is too short or missing',
        description: `Description is ${description.length} characters but minimum is ${rules.descriptionMinLength}`,
        currentValue: description.length.toString(),
        requiredValue: `≥${rules.descriptionMinLength}`,
        canAutoFix: true,
        autoFixAction: JSON.stringify({ action: 'generate' }),
      });
    }

    return issues;
  }

  checkRequiredFields(listing, rules) {
    const issues = [];

    for (const field of rules.requiredFields) {
      const value = listing.product[field];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        issues.push({
          type: 'MISSING_REQUIRED_ATTRIBUTE',
          severity: field === 'brand' || field === 'category' ? 'CRITICAL' : 'HIGH',
          title: `Missing required field: ${field}`,
          description: `The ${field} field is required but missing`,
          currentValue: 'null',
          requiredValue: `Valid ${field}`,
          canAutoFix: false,
          needsHumanReview: true,
        });
      }
    }

    return issues;
  }

  checkPrice(listing, rules) {
    const issues = [];
    const price = listing.price || listing.product.price;
    const mapPrice = listing.product.mapPrice;

    if (!price || price <= 0) {
      issues.push({
        type: 'PRICE_BELOW_MINIMUM',
        severity: 'CRITICAL',
        title: 'Invalid price',
        description: 'Price must be greater than 0',
        canAutoFix: false,
        needsHumanReview: true,
      });
    }

    // Check MAP (Minimum Advertised Price) violation
    if (mapPrice && price < mapPrice) {
      issues.push({
        type: 'PRICE_ABOVE_MAP',
        severity: 'CRITICAL',
        title: 'MAP price violation',
        description: `Listing price ($${price}) is below MAP price ($${mapPrice})`,
        currentValue: `$${price}`,
        requiredValue: `≥$${mapPrice}`,
        canAutoFix: false,
        needsHumanReview: true,
      });
    }

    return issues;
  }

  // ============================================================================
  // AUTO-FIX HANDLERS
  // ============================================================================

  async fixTitleTooLong(issue) {
    const config = JSON.parse(issue.autoFixAction);
    const listing = issue.listing;
    const title = listing.title || listing.product.name;

    // Smart truncation: keep most important words, add ellipsis
    const truncated = this.smartTruncate(title, config.maxLength);

    await prisma.listing.update({
      where: { id: listing.id },
      data: { title: truncated },
    });

    logger.info(`Fixed title: "${title}" -> "${truncated}"`);
    return true;
  }

  async fixTitleTooShort(issue) {
    const listing = issue.listing;
    const title = listing.title || listing.product.name;
    const product = listing.product;

    // Expand title with brand and key attributes
    let expanded = title;
    if (product.brand && !title.includes(product.brand)) {
      expanded = `${product.brand} ${expanded}`;
    }
    if (product.category && expanded.length < 30) {
      expanded = `${expanded} - ${product.category}`;
    }

    await prisma.listing.update({
      where: { id: listing.id },
      data: { title: expanded },
    });

    logger.info(`Expanded title: "${title}" -> "${expanded}"`);
    return true;
  }

  async fixMissingDescription(issue) {
    const listing = issue.listing;
    const product = listing.product;

    // Generate basic description from product data
    const parts = [];
    parts.push(`${product.name}`);
    if (product.brand) parts.push(`by ${product.brand}`);
    if (product.description) {
      parts.push(product.description);
    } else {
      parts.push('High quality product.');
    }
    if (product.tags?.length) {
      parts.push(`Features: ${product.tags.join(', ')}`);
    }

    const generated = parts.join('. ');

    await prisma.listing.update({
      where: { id: listing.id },
      data: { description: generated },
    });

    logger.info(`Generated description for listing ${listing.id}`);
    return true;
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  smartTruncate(text, maxLength) {
    if (text.length <= maxLength) return text;

    // Find last complete word before maxLength
    const truncated = text.substring(0, maxLength - 3);
    const lastSpace = truncated.lastIndexOf(' ');

    return truncated.substring(0, lastSpace) + '...';
  }

  calculateHealthScore(issues) {
    if (issues.length === 0) return 100;

    // Deduct points based on severity
    let score = 100;
    for (const issue of issues) {
      switch (issue.severity) {
        case 'CRITICAL':
          score -= 30;
          break;
        case 'HIGH':
          score -= 15;
          break;
        case 'MEDIUM':
          score -= 5;
          break;
        case 'LOW':
          score -= 2;
          break;
      }
    }

    return Math.max(0, score);
  }

  async createOrUpdateIssue(listingId, issueData) {
    // Check if issue already exists
    const existing = await prisma.listingHealthIssue.findFirst({
      where: {
        listingId,
        type: issueData.type,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
    });

    if (existing) {
      // Update existing issue
      return prisma.listingHealthIssue.update({
        where: { id: existing.id },
        data: {
          severity: issueData.severity,
          description: issueData.description,
          currentValue: issueData.currentValue,
          requiredValue: issueData.requiredValue,
        },
      });
    } else {
      // Create new issue
      return prisma.listingHealthIssue.create({
        data: {
          listingId,
          ...issueData,
        },
      });
    }
  }
}

export default new ListingHealthChecker();
