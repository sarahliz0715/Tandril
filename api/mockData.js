// Mock data for standalone/demo mode
const mockUser = {
  id: 'demo-user-123',
  email: 'demo@tandril.app',
  name: 'Demo User',
  createdAt: new Date().toISOString(),
  subscription: 'free',
  betaAccess: true,
  isAdmin: false, // Set to false for demo users - admins will need real auth
  role: 'user' // Can be 'user', 'admin', or 'owner'
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
  },
  async isAuthenticated() {
    // In standalone/demo mode, user is always "not authenticated" to avoid auth flows
    return false;
  },
  async updateMe(updates) {
    console.log('Update user in demo mode:', updates);
    return { ...mockUser, ...updates };
  },
  redirectToLogin(redirectUrl) {
    // In standalone mode, redirect to onboarding instead of login
    console.log('Demo mode: Redirecting to', redirectUrl || '/Onboarding');
    window.location.href = redirectUrl || '/Onboarding';
  }
};

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

// Mock functions for standalone mode
const mockFunctions = {
  async invoke(functionName, params) {
    console.log(`🎭 [Mock Functions] Calling ${functionName} with params:`, params);

    // Return mock responses based on function name
    switch (functionName) {
      case 'initiateShopifyAuth':
        console.warn('⚠️ Shopify authentication is not available in standalone mode');
        return {
          data: null,
          error: 'Shopify authentication is not available in standalone mode. This is a demo environment.'
        };

      case 'initiateEbayAuth':
        console.warn('⚠️ eBay authentication is not available in standalone mode');
        return {
          data: null,
          error: 'eBay authentication is not available in standalone mode. This is a demo environment.'
        };

      case 'initiateFacebookAuth':
        console.warn('⚠️ Facebook authentication is not available in standalone mode');
        return {
          data: null,
          error: 'Facebook authentication is not available in standalone mode. This is a demo environment.'
        };

      case 'handleShopifyCallback':
      case 'handleEbayCallback':
      case 'handleFacebookCallback':
        return {
          data: { success: false, message: 'Platform callbacks are not available in standalone mode' }
        };

      case 'interpretCommand':
        return {
          data: {
            interpretation: 'This is a mock interpretation. In standalone mode, commands are simulated.',
            actions: []
          }
        };

      case 'generateMarketIntelligence':
        return {
          data: {
            insights: ['Mock insight 1', 'Mock insight 2'],
            trends: ['Mock trend 1', 'Mock trend 2']
          }
        };

      case 'masterStrategist':
        return {
          data: {
            strategy: 'This is a mock strategy response. In standalone mode, AI responses are simulated.',
            recommendations: []
          }
        };

      case 'generateAIResponse':
        return {
          data: {
            response: 'This is a mock AI response. Real AI responses require authentication.',
            confidence: 0.85
          }
        };

      case 'executeWorkflow':
      case 'executeAutomation':
        return {
          data: {
            success: true,
            message: 'Workflow execution simulated in standalone mode',
            results: []
          }
        };

      case 'testAutomation':
        return {
          data: {
            success: true,
            message: 'Test completed in standalone mode',
            logs: ['Mock log entry 1', 'Mock log entry 2']
          }
        };

      case 'evaluateTriggers':
        return {
          data: {
            triggered: false,
            message: 'Trigger evaluation is simulated in standalone mode'
          }
        };

      case 'sendSupportRequest':
      case 'sendBetaInvite':
      case 'saveResponseFeedback':
        return {
          data: {
            success: true,
            message: 'Request recorded (simulated in standalone mode)'
          }
        };

      case 'checkEbayConfig':
      case 'debugEbayAuth':
      case 'checkPlatformConnection':
        return {
          data: {
            configured: false,
            message: 'Platform configuration is not available in standalone mode'
          }
        };

      default:
        console.warn(`⚠️ No mock implementation for function: ${functionName}`);
        return {
          data: {
            success: false,
            message: `Function '${functionName}' is not available in standalone mode. This is a demo environment.`
          },
          error: `Function not available in standalone mode`
        };
    }
  }
};

export { mockAuth, mockFunctions };
