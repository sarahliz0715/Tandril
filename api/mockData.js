// Mock data for standalone/demo mode
const mockUser = {
  id: 'demo-user-123',
  email: 'demo@tandril.app',
  name: 'Demo User',
  createdAt: new Date().toISOString(),
  subscription: 'free',
  betaAccess: true
};

const mockPlatforms = [
  {
    id: '1',
    name: 'Shopify Store',
    type: 'shopify',
    status: 'connected',
    icon: '🛍️'
  },
  {
    id: '2',
    name: 'Etsy Shop',
    type: 'etsy',
    status: 'connected',
    icon: '🎨'
  }
];

const mockCommands = [
  {
    id: '1',
    title: 'List all products',
    status: 'completed',
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: '2',
    title: 'Update inventory',
    status: 'in_progress',
    createdAt: new Date(Date.now() - 1800000).toISOString()
  }
];

// Mock entity class that returns demo data
class MockEntity {
  constructor(name) {
    this.name = name;
  }

  static async findMany() {
    switch (this.name) {
      case 'Platform':
        return mockPlatforms;
      case 'AICommand':
        return mockCommands;
      default:
        return [];
    }
  }

  static async findOne(id) {
    const items = await this.findMany();
    return items.find(item => item.id === id);
  }

  static async create(data) {
    return { id: Date.now().toString(), ...data };
  }

  static async update(id, data) {
    return { id, ...data };
  }

  static async delete(id) {
    return { success: true };
  }
}

// Mock auth object
const mockAuth = {
  async me() {
    return mockUser;
  },
  async signOut() {
    console.log('Sign out in demo mode');
  },
  async signIn(credentials) {
    console.log('Sign in in demo mode');
    return mockUser;
  }
};

// Mock function that returns a success message
const createMockFunction = (name) => async (...args) => {
  console.log(`🎭 Mock function called: ${name}`, args);
  return {
    success: true,
    message: `Mock function ${name} executed in standalone mode`,
    data: {}
  };
};

// Create mock functions object
export const createMockFunctions = () => ({
  initiateShopifyAuth: createMockFunction('initiateShopifyAuth'),
  handleShopifyCallback: createMockFunction('handleShopifyCallback'),
  connectShopifyCustomApp: createMockFunction('connectShopifyCustomApp'),
  executeShopifyCommand: createMockFunction('executeShopifyCommand'),
  initiateEtsyAuth: createMockFunction('initiateEtsyAuth'),
  handleEtsyCallback: createMockFunction('handleEtsyCallback'),
  getShopifyProducts: createMockFunction('getShopifyProducts'),
  interpretCommand: createMockFunction('interpretCommand'),
  createCheckoutSession: createMockFunction('createCheckoutSession'),
  stripeWebhook: createMockFunction('stripeWebhook'),
  createBillingPortalSession: createMockFunction('createBillingPortalSession'),
  executeWorkflow: createMockFunction('executeWorkflow'),
  vacationModeScheduler: createMockFunction('vacationModeScheduler'),
  generateMarketIntelligence: createMockFunction('generateMarketIntelligence'),
  checkPlatformConnection: createMockFunction('checkPlatformConnection'),
  connectPrintful: createMockFunction('connectPrintful'),
  syncPrintfulProducts: createMockFunction('syncPrintfulProducts'),
  syncOrders: createMockFunction('syncOrders'),
  generateSmartAlerts: createMockFunction('generateSmartAlerts'),
  masterStrategist: createMockFunction('masterStrategist'),
  performanceOptimizer: createMockFunction('performanceOptimizer'),
  shopifyExecutor: createMockFunction('shopifyExecutor'),
  facebookAdsExecutor: createMockFunction('facebookAdsExecutor'),
  workflowOptimizer: createMockFunction('workflowOptimizer'),
  proactiveProfitFinder: createMockFunction('proactiveProfitFinder'),
  automatedTrendSpotter: createMockFunction('automatedTrendSpotter'),
  adSpendGuardian: createMockFunction('adSpendGuardian'),
  syncShopifyProducts: createMockFunction('syncShopifyProducts'),
  syncEtsyProducts: createMockFunction('syncEtsyProducts'),
  sendBusinessEmail: createMockFunction('sendBusinessEmail'),
  sendDailyReport: createMockFunction('sendDailyReport'),
  scheduledDailyReports: createMockFunction('scheduledDailyReports'),
  scheduleWeeklyReports: createMockFunction('scheduleWeeklyReports'),
  sendCriticalAlert: createMockFunction('sendCriticalAlert'),
  monitorCriticalEvents: createMockFunction('monitorCriticalEvents'),
  connectTeePublic: createMockFunction('connectTeePublic'),
  connectRedbubble: createMockFunction('connectRedbubble'),
  revertShopifyCommand: createMockFunction('revertShopifyCommand'),
  enhancedBusinessAdvisor: createMockFunction('enhancedBusinessAdvisor'),
  initiateFacebookAuth: createMockFunction('initiateFacebookAuth'),
  handleFacebookCallback: createMockFunction('handleFacebookCallback'),
  generateSmartAd: createMockFunction('generateSmartAd'),
  createFacebookCampaign: createMockFunction('createFacebookCampaign'),
  diagnosticTest: createMockFunction('diagnosticTest'),
  workflowScheduler: createMockFunction('workflowScheduler'),
  testShopifyConnection: createMockFunction('testShopifyConnection'),
  updateUserMemory: createMockFunction('updateUserMemory'),
  generateDemoData: createMockFunction('generateDemoData'),
  generateQAPDF: createMockFunction('generateQAPDF'),
  ebayMarketplaceDeletion: createMockFunction('ebayMarketplaceDeletion'),
  clearDemoData: createMockFunction('clearDemoData'),
  notifySurveySubmission: createMockFunction('notifySurveySubmission'),
  submitSurvey: createMockFunction('submitSurvey'),
  dedalusAI: createMockFunction('dedalusAI'),
  sendBetaInvite: createMockFunction('sendBetaInvite'),
  sendSupportRequest: createMockFunction('sendSupportRequest'),
  initiateEbayAuth: createMockFunction('initiateEbayAuth'),
  handleEbayCallback: createMockFunction('handleEbayCallback'),
  ebayWebhook: createMockFunction('ebayWebhook'),
  syncEbayInventory: createMockFunction('syncEbayInventory'),
  checkEbayConfig: createMockFunction('checkEbayConfig'),
  debugEbayAuth: createMockFunction('debugEbayAuth'),
  executeScheduledAutomations: createMockFunction('executeScheduledAutomations'),
  sendWeeklyReport: createMockFunction('sendWeeklyReport'),
  testAutomation: createMockFunction('testAutomation'),
  retryAutomation: createMockFunction('retryAutomation'),
  executeAutomationAction: createMockFunction('executeAutomationAction'),
  evaluateTriggers: createMockFunction('evaluateTriggers'),
  monitorAutomationTriggers: createMockFunction('monitorAutomationTriggers'),
  executeAutomation: createMockFunction('executeAutomation'),
  generateAIResponse: createMockFunction('generateAIResponse'),
  saveResponseFeedback: createMockFunction('saveResponseFeedback'),
  evaluateCustomAlerts: createMockFunction('evaluateCustomAlerts'),
});

// Create mock entities
export const createMockEntities = () => ({
  Platform: MockEntity,
  AICommand: MockEntity,
  SavedCommand: MockEntity,
  PlatformType: MockEntity,
  MockProduct: MockEntity,
  AIWorkflow: MockEntity,
  SecurityAudit: MockEntity,
  MarketIntelligence: MockEntity,
  AdCampaign: MockEntity,
  AdCreative: MockEntity,
  AdTemplate: MockEntity,
  CustomerMessage: MockEntity,
  CustomerProfile: MockEntity,
  AIRecommendation: MockEntity,
  InventoryItem: MockEntity,
  BulkUpload: MockEntity,
  SmartAlert: MockEntity,
  CalendarEvent: MockEntity,
  ScratchpadNote: MockEntity,
  EmailSignup: MockEntity,
  Subscription: MockEntity,
  OrderItem: MockEntity,
  Order: MockEntity,
  CommandQueue: MockEntity,
  WorkflowTemplate: MockEntity,
  PlatformRequest: MockEntity,
  PrintfulProduct: MockEntity,
  PrintfulStore: MockEntity,
  BusinessStrategy: MockEntity,
  PerformanceMonitor: MockEntity,
  EmailLog: MockEntity,
  SurveyResponse: MockEntity,
  BetaInvite: MockEntity,
  SupportTicket: MockEntity,
  AutomationTrigger: MockEntity,
  AutomationAction: MockEntity,
  Automation: MockEntity,
  AutomationTemplate: MockEntity,
  Review: MockEntity,
  AIResponseFeedback: MockEntity,
  CustomAlert: MockEntity,
});

export { mockAuth };
