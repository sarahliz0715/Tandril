import { base44 } from './base44Client';
import { createMockEntities, mockAuth } from './mockData';
import { supabaseAuthService } from './supabaseAuth';
import { isSupabaseConfigured } from './supabaseClient';
import { createSupabaseEntities } from './supabaseEntities';

// Check if running in standalone mode
// Default to standalone mode (true) unless explicitly set to false
const standaloneEnv = import.meta.env.VITE_STANDALONE_MODE;
const isStandaloneMode = standaloneEnv !== 'false' && standaloneEnv !== false;
const hasSupabase = isSupabaseConfigured();
const mockEntities = isStandaloneMode && !hasSupabase ? createMockEntities() : null;
const supabaseEntities = hasSupabase ? createSupabaseEntities() : null;

console.log('🗄️ Tandril Entities Mode:', {
  isStandaloneMode,
  hasSupabase,
  usingMocks: !hasSupabase && isStandaloneMode,
  usingSupabase: hasSupabase,
  authProvider: hasSupabase ? 'Supabase' : isStandaloneMode ? 'Mock' : 'Base44'
});

// Export entities - use Supabase if configured, otherwise mock data in standalone mode, or Base44 SDK
export const Platform = hasSupabase ? supabaseEntities.Platform : (isStandaloneMode ? mockEntities.Platform : base44.entities.Platform);

export const AICommand = hasSupabase ? supabaseEntities.AICommand : (isStandaloneMode ? mockEntities.AICommand : base44.entities.AICommand);

export const SavedCommand = hasSupabase ? supabaseEntities.SavedCommand : (isStandaloneMode ? mockEntities.SavedCommand : base44.entities.SavedCommand);

export const PlatformType = isStandaloneMode ? mockEntities.PlatformType : base44.entities.PlatformType;

export const MockProduct = isStandaloneMode ? mockEntities.MockProduct : base44.entities.MockProduct;

export const AIWorkflow = hasSupabase ? supabaseEntities.AIWorkflow : (isStandaloneMode ? mockEntities.AIWorkflow : base44.entities.AIWorkflow);

export const SecurityAudit = isStandaloneMode ? mockEntities.SecurityAudit : base44.entities.SecurityAudit;

export const MarketIntelligence = isStandaloneMode ? mockEntities.MarketIntelligence : base44.entities.MarketIntelligence;

export const AdCampaign = isStandaloneMode ? mockEntities.AdCampaign : base44.entities.AdCampaign;

export const AdCreative = isStandaloneMode ? mockEntities.AdCreative : base44.entities.AdCreative;

export const AdTemplate = isStandaloneMode ? mockEntities.AdTemplate : base44.entities.AdTemplate;

export const CustomerMessage = isStandaloneMode ? mockEntities.CustomerMessage : base44.entities.CustomerMessage;

export const CustomerProfile = isStandaloneMode ? mockEntities.CustomerProfile : base44.entities.CustomerProfile;

export const AIRecommendation = isStandaloneMode ? mockEntities.AIRecommendation : base44.entities.AIRecommendation;

export const InventoryItem = isStandaloneMode ? mockEntities.InventoryItem : base44.entities.InventoryItem;

export const BulkUpload = isStandaloneMode ? mockEntities.BulkUpload : base44.entities.BulkUpload;

export const SmartAlert = isStandaloneMode ? mockEntities.SmartAlert : base44.entities.SmartAlert;

export const CalendarEvent = isStandaloneMode ? mockEntities.CalendarEvent : base44.entities.CalendarEvent;

export const ScratchpadNote = isStandaloneMode ? mockEntities.ScratchpadNote : base44.entities.ScratchpadNote;

export const EmailSignup = isStandaloneMode ? mockEntities.EmailSignup : base44.entities.EmailSignup;

export const Subscription = isStandaloneMode ? mockEntities.Subscription : base44.entities.Subscription;

export const OrderItem = isStandaloneMode ? mockEntities.OrderItem : base44.entities.OrderItem;

export const Order = isStandaloneMode ? mockEntities.Order : base44.entities.Order;

export const CommandQueue = isStandaloneMode ? mockEntities.CommandQueue : base44.entities.CommandQueue;

export const WorkflowTemplate = hasSupabase ? supabaseEntities.WorkflowTemplate : (isStandaloneMode ? mockEntities.WorkflowTemplate : base44.entities.WorkflowTemplate);

export const PlatformRequest = isStandaloneMode ? mockEntities.PlatformRequest : base44.entities.PlatformRequest;

export const PrintfulProduct = isStandaloneMode ? mockEntities.PrintfulProduct : base44.entities.PrintfulProduct;

export const PrintfulStore = isStandaloneMode ? mockEntities.PrintfulStore : base44.entities.PrintfulStore;

export const BusinessStrategy = isStandaloneMode ? mockEntities.BusinessStrategy : base44.entities.BusinessStrategy;

export const PerformanceMonitor = isStandaloneMode ? mockEntities.PerformanceMonitor : base44.entities.PerformanceMonitor;

export const EmailLog = isStandaloneMode ? mockEntities.EmailLog : base44.entities.EmailLog;

export const SurveyResponse = isStandaloneMode ? mockEntities.SurveyResponse : base44.entities.SurveyResponse;

export const BetaInvite = isStandaloneMode ? mockEntities.BetaInvite : base44.entities.BetaInvite;

export const SupportTicket = isStandaloneMode ? mockEntities.SupportTicket : base44.entities.SupportTicket;

export const AutomationTrigger = isStandaloneMode ? mockEntities.AutomationTrigger : base44.entities.AutomationTrigger;

export const AutomationAction = isStandaloneMode ? mockEntities.AutomationAction : base44.entities.AutomationAction;

export const Automation = isStandaloneMode ? mockEntities.Automation : base44.entities.Automation;

export const AutomationTemplate = isStandaloneMode ? mockEntities.AutomationTemplate : base44.entities.AutomationTemplate;

export const Review = isStandaloneMode ? mockEntities.Review : base44.entities.Review;

export const AIResponseFeedback = isStandaloneMode ? mockEntities.AIResponseFeedback : base44.entities.AIResponseFeedback;

export const CustomAlert = isStandaloneMode ? mockEntities.CustomAlert : base44.entities.CustomAlert;



// auth sdk - use Supabase if configured, otherwise use mock auth in standalone mode, or Base44 auth
export const User = hasSupabase ? supabaseAuthService : (isStandaloneMode ? mockAuth : base44.auth);
