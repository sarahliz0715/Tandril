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
