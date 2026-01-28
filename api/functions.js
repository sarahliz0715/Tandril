import { api } from './apiClient';

// Safely access functions - they may not exist in standalone mode
// In standalone mode, use api.functions.invoke() instead
const safeAccess = (funcName) => api.functions?.[funcName];

export const initiateShopifyAuth = safeAccess('initiateShopifyAuth');

export const handleShopifyCallback = safeAccess('handleShopifyCallback');

export const connectShopifyCustomApp = safeAccess('connectShopifyCustomApp');

export const executeShopifyCommand = safeAccess('executeShopifyCommand');

export const initiateEtsyAuth = safeAccess('initiateEtsyAuth');

export const handleEtsyCallback = safeAccess('handleEtsyCallback');

export const getShopifyProducts = safeAccess('getShopifyProducts');

export const interpretCommand = safeAccess('interpretCommand');

export const createCheckoutSession = safeAccess('createCheckoutSession');

export const stripeWebhook = safeAccess('stripeWebhook');

export const createBillingPortalSession = safeAccess('createBillingPortalSession');

export const executeWorkflow = safeAccess('executeWorkflow');

export const vacationModeScheduler = safeAccess('vacationModeScheduler');

export const generateMarketIntelligence = safeAccess('generateMarketIntelligence');

export const checkPlatformConnection = safeAccess('checkPlatformConnection');

export const connectPrintful = safeAccess('connectPrintful');

export const syncPrintfulProducts = safeAccess('syncPrintfulProducts');

export const syncOrders = safeAccess('syncOrders');

export const generateSmartAlerts = safeAccess('generateSmartAlerts');

export const masterStrategist = safeAccess('masterStrategist');

export const performanceOptimizer = safeAccess('performanceOptimizer');

export const shopifyExecutor = safeAccess('shopifyExecutor');

export const facebookAdsExecutor = safeAccess('facebookAdsExecutor');

export const workflowOptimizer = safeAccess('workflowOptimizer');

export const proactiveProfitFinder = safeAccess('proactiveProfitFinder');

export const automatedTrendSpotter = safeAccess('automatedTrendSpotter');

export const adSpendGuardian = safeAccess('adSpendGuardian');

export const syncShopifyProducts = safeAccess('syncShopifyProducts');

export const syncEtsyProducts = safeAccess('syncEtsyProducts');

export const sendBusinessEmail = safeAccess('sendBusinessEmail');

export const sendDailyReport = safeAccess('sendDailyReport');

export const scheduledDailyReports = safeAccess('scheduledDailyReports');

export const scheduleWeeklyReports = safeAccess('scheduleWeeklyReports');

export const sendCriticalAlert = safeAccess('sendCriticalAlert');

export const monitorCriticalEvents = safeAccess('monitorCriticalEvents');

export const connectTeePublic = safeAccess('connectTeePublic');

export const connectRedbubble = safeAccess('connectRedbubble');

export const revertShopifyCommand = safeAccess('revertShopifyCommand');

export const enhancedBusinessAdvisor = safeAccess('enhancedBusinessAdvisor');

export const initiateFacebookAuth = safeAccess('initiateFacebookAuth');

export const handleFacebookCallback = safeAccess('handleFacebookCallback');

export const generateSmartAd = safeAccess('generateSmartAd');

export const createFacebookCampaign = safeAccess('createFacebookCampaign');

export const diagnosticTest = safeAccess('diagnosticTest');

export const workflowScheduler = safeAccess('workflowScheduler');

export const testShopifyConnection = safeAccess('testShopifyConnection');

export const updateUserMemory = safeAccess('updateUserMemory');

export const generateDemoData = safeAccess('generateDemoData');

export const generateQAPDF = safeAccess('generateQAPDF');

export const ebayMarketplaceDeletion = safeAccess('ebayMarketplaceDeletion');

export const clearDemoData = safeAccess('clearDemoData');

export const notifySurveySubmission = safeAccess('notifySurveySubmission');

export const submitSurvey = safeAccess('submitSurvey');

export const dedalusAI = safeAccess('dedalusAI');

export const sendBetaInvite = safeAccess('sendBetaInvite');

export const sendSupportRequest = safeAccess('sendSupportRequest');

export const initiateEbayAuth = safeAccess('initiateEbayAuth');

export const handleEbayCallback = safeAccess('handleEbayCallback');

export const ebayWebhook = safeAccess('ebayWebhook');

export const syncEbayInventory = safeAccess('syncEbayInventory');

export const checkEbayConfig = safeAccess('checkEbayConfig');

export const debugEbayAuth = safeAccess('debugEbayAuth');

export const executeScheduledAutomations = safeAccess('executeScheduledAutomations');

export const sendWeeklyReport = safeAccess('sendWeeklyReport');

export const testAutomation = safeAccess('testAutomation');

export const retryAutomation = safeAccess('retryAutomation');

export const executeAutomationAction = safeAccess('executeAutomationAction');

export const evaluateTriggers = safeAccess('evaluateTriggers');

export const monitorAutomationTriggers = safeAccess('monitorAutomationTriggers');

export const executeAutomation = safeAccess('executeAutomation');

export const generateAIResponse = safeAccess('generateAIResponse');

export const saveResponseFeedback = safeAccess('saveResponseFeedback');

export const evaluateCustomAlerts = safeAccess('evaluateCustomAlerts');

export const connectWooCommerce = safeAccess('connectWooCommerce');

export const connectBigCommerce = safeAccess('connectBigCommerce');

export const connectFaire = safeAccess('connectFaire');

