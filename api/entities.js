import { api } from './apiClient';
import { createMockEntities, mockAuth } from './mockData';
import { supabaseAuthService } from './supabaseAuth';
import { isSupabaseConfigured } from './supabaseClient';
import { createSupabaseEntities } from './supabaseEntities';
import logger from '@/utils/logger';

// Check if running in standalone mode
// Default to standalone mode (true) unless explicitly set to false
const standaloneEnv = import.meta.env.VITE_STANDALONE_MODE;
const isStandaloneMode = standaloneEnv !== 'false' && standaloneEnv !== false;
const hasSupabase = isSupabaseConfigured();

// Get the appropriate entities based on configuration
let entities;
if (hasSupabase) {
  // Supabase mode - includes both real Supabase entities and mock fallbacks
  entities = createSupabaseEntities();
} else if (isStandaloneMode) {
  // Standalone mode - all mocks
  entities = createMockEntities();
} else {
  // API mode
  entities = api.entities;
}

logger.dev('🗄️ Tandril Entities Mode:', {
  isStandaloneMode,
  hasSupabase,
  usingMocks: !hasSupabase && isStandaloneMode,
  usingSupabase: hasSupabase,
  authProvider: hasSupabase ? 'Supabase' : isStandaloneMode ? 'Mock' : 'API'
});

// Export all entities from the selected source
export const Platform = entities.Platform;
export const AICommand = entities.AICommand;
export const SavedCommand = entities.SavedCommand;
export const PlatformType = entities.PlatformType;
export const MockProduct = entities.MockProduct;
export const AIWorkflow = entities.AIWorkflow;

export const SecurityAudit = entities.SecurityAudit;
export const MarketIntelligence = entities.MarketIntelligence;
export const AdCampaign = entities.AdCampaign;
export const AdCreative = entities.AdCreative;
export const AdTemplate = entities.AdTemplate;
export const CustomerMessage = entities.CustomerMessage;
export const CustomerProfile = entities.CustomerProfile;
export const AIRecommendation = entities.AIRecommendation;
export const InventoryItem = entities.InventoryItem;
export const BulkUpload = entities.BulkUpload;
export const SmartAlert = entities.SmartAlert;
export const CalendarEvent = entities.CalendarEvent;
export const ScratchpadNote = entities.ScratchpadNote;
export const EmailSignup = entities.EmailSignup;
export const Subscription = entities.Subscription;
export const OrderItem = entities.OrderItem;
export const Order = entities.Order;
export const CommandQueue = entities.CommandQueue;
export const WorkflowTemplate = entities.WorkflowTemplate;
export const PlatformRequest = entities.PlatformRequest;
export const PrintfulProduct = entities.PrintfulProduct;
export const PrintfulStore = entities.PrintfulStore;
export const BusinessStrategy = entities.BusinessStrategy;
export const PerformanceMonitor = entities.PerformanceMonitor;
export const EmailLog = entities.EmailLog;
export const SurveyResponse = entities.SurveyResponse;
export const BetaInvite = entities.BetaInvite;
export const SupportTicket = entities.SupportTicket;
export const AutomationTrigger = entities.AutomationTrigger;
export const AutomationAction = entities.AutomationAction;
export const Automation = entities.Automation;
export const AutomationTemplate = entities.AutomationTemplate;
export const Review = entities.Review;
export const AIResponseFeedback = entities.AIResponseFeedback;
export const CustomAlert = entities.CustomAlert;



// auth sdk - use Supabase if configured, otherwise use mock auth in standalone mode, or API auth
export const User = hasSupabase ? supabaseAuthService : (isStandaloneMode ? mockAuth : api.auth);
