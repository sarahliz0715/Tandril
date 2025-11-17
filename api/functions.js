import { base44 } from './base44Client';
import { createMockFunctions } from './mockData';

// Check if running in standalone mode
const standaloneEnv = import.meta.env.VITE_STANDALONE_MODE;
const isStandaloneMode = standaloneEnv !== 'false' && standaloneEnv !== false;
const mockFunctions = isStandaloneMode ? createMockFunctions() : null;

console.log('⚡ Tandril Functions Mode:', { isStandaloneMode, usingMocks: !!mockFunctions });

// Export functions - use mocks in standalone mode, otherwise use Base44 SDK
export const initiateShopifyAuth = isStandaloneMode ? mockFunctions.initiateShopifyAuth : base44.functions.initiateShopifyAuth;

export const handleShopifyCallback = isStandaloneMode ? mockFunctions.handleShopifyCallback : base44.functions.handleShopifyCallback;

export const connectShopifyCustomApp = isStandaloneMode ? mockFunctions.connectShopifyCustomApp : base44.functions.connectShopifyCustomApp;

export const executeShopifyCommand = isStandaloneMode ? mockFunctions.executeShopifyCommand : base44.functions.executeShopifyCommand;

export const initiateEtsyAuth = isStandaloneMode ? mockFunctions.initiateEtsyAuth : base44.functions.initiateEtsyAuth;

export const handleEtsyCallback = isStandaloneMode ? mockFunctions.handleEtsyCallback : base44.functions.handleEtsyCallback;

export const getShopifyProducts = isStandaloneMode ? mockFunctions.getShopifyProducts : base44.functions.getShopifyProducts;

export const interpretCommand = isStandaloneMode ? mockFunctions.interpretCommand : base44.functions.interpretCommand;

export const createCheckoutSession = isStandaloneMode ? mockFunctions.createCheckoutSession : base44.functions.createCheckoutSession;

export const stripeWebhook = isStandaloneMode ? mockFunctions.stripeWebhook : base44.functions.stripeWebhook;

export const createBillingPortalSession = isStandaloneMode ? mockFunctions.createBillingPortalSession : base44.functions.createBillingPortalSession;

export const executeWorkflow = isStandaloneMode ? mockFunctions.executeWorkflow : base44.functions.executeWorkflow;

export const vacationModeScheduler = isStandaloneMode ? mockFunctions.vacationModeScheduler : base44.functions.vacationModeScheduler;

export const generateMarketIntelligence = isStandaloneMode ? mockFunctions.generateMarketIntelligence : base44.functions.generateMarketIntelligence;

export const checkPlatformConnection = isStandaloneMode ? mockFunctions.checkPlatformConnection : base44.functions.checkPlatformConnection;

export const connectPrintful = isStandaloneMode ? mockFunctions.connectPrintful : base44.functions.connectPrintful;

export const syncPrintfulProducts = isStandaloneMode ? mockFunctions.syncPrintfulProducts : base44.functions.syncPrintfulProducts;

export const syncOrders = isStandaloneMode ? mockFunctions.syncOrders : base44.functions.syncOrders;

export const generateSmartAlerts = isStandaloneMode ? mockFunctions.generateSmartAlerts : base44.functions.generateSmartAlerts;

export const masterStrategist = isStandaloneMode ? mockFunctions.masterStrategist : base44.functions.masterStrategist;

export const performanceOptimizer = isStandaloneMode ? mockFunctions.performanceOptimizer : base44.functions.performanceOptimizer;

export const shopifyExecutor = isStandaloneMode ? mockFunctions.shopifyExecutor : base44.functions.shopifyExecutor;

export const facebookAdsExecutor = isStandaloneMode ? mockFunctions.facebookAdsExecutor : base44.functions.facebookAdsExecutor;

export const workflowOptimizer = isStandaloneMode ? mockFunctions.workflowOptimizer : base44.functions.workflowOptimizer;

export const proactiveProfitFinder = isStandaloneMode ? mockFunctions.proactiveProfitFinder : base44.functions.proactiveProfitFinder;

export const automatedTrendSpotter = isStandaloneMode ? mockFunctions.automatedTrendSpotter : base44.functions.automatedTrendSpotter;

export const adSpendGuardian = isStandaloneMode ? mockFunctions.adSpendGuardian : base44.functions.adSpendGuardian;

export const syncShopifyProducts = isStandaloneMode ? mockFunctions.syncShopifyProducts : base44.functions.syncShopifyProducts;

export const syncEtsyProducts = isStandaloneMode ? mockFunctions.syncEtsyProducts : base44.functions.syncEtsyProducts;

export const sendBusinessEmail = isStandaloneMode ? mockFunctions.sendBusinessEmail : base44.functions.sendBusinessEmail;

export const sendDailyReport = isStandaloneMode ? mockFunctions.sendDailyReport : base44.functions.sendDailyReport;

export const scheduledDailyReports = isStandaloneMode ? mockFunctions.scheduledDailyReports : base44.functions.scheduledDailyReports;

export const scheduleWeeklyReports = isStandaloneMode ? mockFunctions.scheduleWeeklyReports : base44.functions.scheduleWeeklyReports;

export const sendCriticalAlert = isStandaloneMode ? mockFunctions.sendCriticalAlert : base44.functions.sendCriticalAlert;

export const monitorCriticalEvents = isStandaloneMode ? mockFunctions.monitorCriticalEvents : base44.functions.monitorCriticalEvents;

export const connectTeePublic = isStandaloneMode ? mockFunctions.connectTeePublic : base44.functions.connectTeePublic;

export const connectRedbubble = isStandaloneMode ? mockFunctions.connectRedbubble : base44.functions.connectRedbubble;

export const revertShopifyCommand = isStandaloneMode ? mockFunctions.revertShopifyCommand : base44.functions.revertShopifyCommand;

export const enhancedBusinessAdvisor = isStandaloneMode ? mockFunctions.enhancedBusinessAdvisor : base44.functions.enhancedBusinessAdvisor;

export const initiateFacebookAuth = isStandaloneMode ? mockFunctions.initiateFacebookAuth : base44.functions.initiateFacebookAuth;

export const handleFacebookCallback = isStandaloneMode ? mockFunctions.handleFacebookCallback : base44.functions.handleFacebookCallback;

export const generateSmartAd = isStandaloneMode ? mockFunctions.generateSmartAd : base44.functions.generateSmartAd;

export const createFacebookCampaign = isStandaloneMode ? mockFunctions.createFacebookCampaign : base44.functions.createFacebookCampaign;

export const diagnosticTest = isStandaloneMode ? mockFunctions.diagnosticTest : base44.functions.diagnosticTest;

export const workflowScheduler = isStandaloneMode ? mockFunctions.workflowScheduler : base44.functions.workflowScheduler;

export const testShopifyConnection = isStandaloneMode ? mockFunctions.testShopifyConnection : base44.functions.testShopifyConnection;

export const updateUserMemory = isStandaloneMode ? mockFunctions.updateUserMemory : base44.functions.updateUserMemory;

export const generateDemoData = isStandaloneMode ? mockFunctions.generateDemoData : base44.functions.generateDemoData;

export const generateQAPDF = isStandaloneMode ? mockFunctions.generateQAPDF : base44.functions.generateQAPDF;

export const ebayMarketplaceDeletion = isStandaloneMode ? mockFunctions.ebayMarketplaceDeletion : base44.functions.ebayMarketplaceDeletion;

export const clearDemoData = isStandaloneMode ? mockFunctions.clearDemoData : base44.functions.clearDemoData;

export const notifySurveySubmission = isStandaloneMode ? mockFunctions.notifySurveySubmission : base44.functions.notifySurveySubmission;

export const submitSurvey = isStandaloneMode ? mockFunctions.submitSurvey : base44.functions.submitSurvey;

export const dedalusAI = isStandaloneMode ? mockFunctions.dedalusAI : base44.functions.dedalusAI;

export const sendBetaInvite = isStandaloneMode ? mockFunctions.sendBetaInvite : base44.functions.sendBetaInvite;

export const sendSupportRequest = isStandaloneMode ? mockFunctions.sendSupportRequest : base44.functions.sendSupportRequest;

export const initiateEbayAuth = isStandaloneMode ? mockFunctions.initiateEbayAuth : base44.functions.initiateEbayAuth;

export const handleEbayCallback = isStandaloneMode ? mockFunctions.handleEbayCallback : base44.functions.handleEbayCallback;

export const ebayWebhook = isStandaloneMode ? mockFunctions.ebayWebhook : base44.functions.ebayWebhook;

export const syncEbayInventory = isStandaloneMode ? mockFunctions.syncEbayInventory : base44.functions.syncEbayInventory;

export const checkEbayConfig = isStandaloneMode ? mockFunctions.checkEbayConfig : base44.functions.checkEbayConfig;

export const debugEbayAuth = isStandaloneMode ? mockFunctions.debugEbayAuth : base44.functions.debugEbayAuth;

export const executeScheduledAutomations = isStandaloneMode ? mockFunctions.executeScheduledAutomations : base44.functions.executeScheduledAutomations;

export const sendWeeklyReport = isStandaloneMode ? mockFunctions.sendWeeklyReport : base44.functions.sendWeeklyReport;

export const testAutomation = isStandaloneMode ? mockFunctions.testAutomation : base44.functions.testAutomation;

export const retryAutomation = isStandaloneMode ? mockFunctions.retryAutomation : base44.functions.retryAutomation;

export const executeAutomationAction = isStandaloneMode ? mockFunctions.executeAutomationAction : base44.functions.executeAutomationAction;

export const evaluateTriggers = isStandaloneMode ? mockFunctions.evaluateTriggers : base44.functions.evaluateTriggers;

export const monitorAutomationTriggers = isStandaloneMode ? mockFunctions.monitorAutomationTriggers : base44.functions.monitorAutomationTriggers;

export const executeAutomation = isStandaloneMode ? mockFunctions.executeAutomation : base44.functions.executeAutomation;

export const generateAIResponse = isStandaloneMode ? mockFunctions.generateAIResponse : base44.functions.generateAIResponse;

export const saveResponseFeedback = isStandaloneMode ? mockFunctions.saveResponseFeedback : base44.functions.saveResponseFeedback;

export const evaluateCustomAlerts = isStandaloneMode ? mockFunctions.evaluateCustomAlerts : base44.functions.evaluateCustomAlerts;
