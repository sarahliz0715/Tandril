import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Platforms from "./Platforms";

import Commands from "./Commands";

import CommandsMinimal from "./CommandsMinimal";

import History from "./History";

import Settings from "./Settings";

import Ads from "./Ads";

import Intelligence from "./Intelligence";

import TermsOfService from "./TermsOfService";

import PrivacyPolicy from "./PrivacyPolicy";

import Workflows from "./Workflows";

import Inventory from "./Inventory";

import Analytics from "./Analytics";

import BulkUpload from "./BulkUpload";

import Calendar from "./Calendar";

import PlatformSettings from "./PlatformSettings";

import Onboarding from "./Onboarding";

import Pricing from "./Pricing";

import EmailSignups from "./EmailSignups";

import ShopifyCallback from "./ShopifyCallback";

import SellbriteComparison from "./SellbriteComparison";

import PrintableComparison from "./PrintableComparison";

import Orders from "./Orders";

import Listings from "./Listings";

import Inbox from "./Inbox";

import Home from "./Home";

import ExecutiveSummary from "./ExecutiveSummary";

import VacationDashboard from "./VacationDashboard";

import MasterStrategist from "./MasterStrategist";

import Capabilities from "./Capabilities";

import AIAdvisor from "./AIAdvisor";

import FacebookCallback from "./FacebookCallback";

import BetaCapabilities from "./BetaCapabilities";

import RevenueModel from "./RevenueModel";

import BusinessPlan from "./BusinessPlan";

import Survey from "./Survey";

import SellerCard from "./SellerCard";

import EbayCallback from "./EbayCallback";

import Automations from "./Automations";

import AutomationSetup from "./AutomationSetup";

import AutomationMarketplace from "./AutomationMarketplace";

import MobileAutomations from "./MobileAutomations";

import CustomerSupport from "./CustomerSupport";

import CustomAlerts from "./CustomAlerts";

import Login from "./Login";

import Signup from "./Signup";

import FinancialDashboard from "./FinancialDashboard";

import OrderIntelligence from "./OrderIntelligence";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Platforms: Platforms,
    
    Commands: Commands,
    
    History: History,
    
    Settings: Settings,
    
    Ads: Ads,
    
    Intelligence: Intelligence,
    
    TermsOfService: TermsOfService,
    
    PrivacyPolicy: PrivacyPolicy,
    
    Workflows: Workflows,
    
    Inventory: Inventory,
    
    Analytics: Analytics,
    
    BulkUpload: BulkUpload,
    
    Calendar: Calendar,
    
    PlatformSettings: PlatformSettings,

    Onboarding: Onboarding,
    
    Pricing: Pricing,
    
    EmailSignups: EmailSignups,
    
    ShopifyCallback: ShopifyCallback,
    
    SellbriteComparison: SellbriteComparison,
    
    PrintableComparison: PrintableComparison,
    
    Orders: Orders,
    
    Listings: Listings,
    
    Inbox: Inbox,
    
    Home: Home,
    
    ExecutiveSummary: ExecutiveSummary,
    
    VacationDashboard: VacationDashboard,
    
    MasterStrategist: MasterStrategist,
    
    Capabilities: Capabilities,
    
    AIAdvisor: AIAdvisor,

    FacebookCallback: FacebookCallback,
    
    BetaCapabilities: BetaCapabilities,
    
    RevenueModel: RevenueModel,
    
    BusinessPlan: BusinessPlan,
    
    Survey: Survey,
    
    SellerCard: SellerCard,

    EbayCallback: EbayCallback,
    
    Automations: Automations,
    
    AutomationSetup: AutomationSetup,
    
    AutomationMarketplace: AutomationMarketplace,
    
    MobileAutomations: MobileAutomations,
    
    CustomerSupport: CustomerSupport,

    CustomAlerts: CustomAlerts,

    Login: Login,

    Signup: Signup,

    FinancialDashboard: FinancialDashboard,

    OrderIntelligence: OrderIntelligence,

}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>

                    <Route path="/" element={<Pricing />} />
                
                
                <Route path="/Dashboard" element={<Dashboard />} />
                
                <Route path="/Platforms" element={<Platforms />} />
                
                <Route path="/Commands" element={<Commands />} />
                
                <Route path="/History" element={<History />} />
                
                <Route path="/Settings" element={<Settings />} />
                
                <Route path="/Ads" element={<Ads />} />
                
                <Route path="/Intelligence" element={<Intelligence />} />
                
                <Route path="/TermsOfService" element={<TermsOfService />} />
                
                <Route path="/PrivacyPolicy" element={<PrivacyPolicy />} />
                
                <Route path="/Workflows" element={<Workflows />} />
                
                <Route path="/Inventory" element={<Inventory />} />
                
                <Route path="/Analytics" element={<Analytics />} />
                
                <Route path="/BulkUpload" element={<BulkUpload />} />
                
                <Route path="/Calendar" element={<Calendar />} />
                
                <Route path="/PlatformSettings" element={<PlatformSettings />} />

                <Route path="/Onboarding" element={<Onboarding />} />
                
                <Route path="/Pricing" element={<Pricing />} />
                
                <Route path="/EmailSignups" element={<EmailSignups />} />
                
                <Route path="/ShopifyCallback" element={<ShopifyCallback />} />
                
                <Route path="/SellbriteComparison" element={<SellbriteComparison />} />
                
                <Route path="/PrintableComparison" element={<PrintableComparison />} />
                
                <Route path="/Orders" element={<Orders />} />
                
                <Route path="/Listings" element={<Listings />} />
                
                <Route path="/Inbox" element={<Inbox />} />
                
                <Route path="/Home" element={<Home />} />
                
                <Route path="/ExecutiveSummary" element={<ExecutiveSummary />} />
                
                <Route path="/VacationDashboard" element={<VacationDashboard />} />
                
                <Route path="/MasterStrategist" element={<MasterStrategist />} />
                
                <Route path="/Capabilities" element={<Capabilities />} />
                
                <Route path="/AIAdvisor" element={<AIAdvisor />} />

                <Route path="/FacebookCallback" element={<FacebookCallback />} />
                
                <Route path="/BetaCapabilities" element={<BetaCapabilities />} />
                
                <Route path="/RevenueModel" element={<RevenueModel />} />
                
                <Route path="/BusinessPlan" element={<BusinessPlan />} />
                
                <Route path="/Survey" element={<Survey />} />
                
                <Route path="/SellerCard" element={<SellerCard />} />

                <Route path="/EbayCallback" element={<EbayCallback />} />
                
                <Route path="/Automations" element={<Automations />} />
                
                <Route path="/AutomationSetup" element={<AutomationSetup />} />
                
                <Route path="/AutomationMarketplace" element={<AutomationMarketplace />} />
                
                <Route path="/MobileAutomations" element={<MobileAutomations />} />
                
                <Route path="/CustomerSupport" element={<CustomerSupport />} />

                <Route path="/CustomAlerts" element={<CustomAlerts />} />

                <Route path="/Login" element={<Login />} />

                <Route path="/Signup" element={<Signup />} />

                <Route path="/FinancialDashboard" element={<FinancialDashboard />} />

                <Route path="/OrderIntelligence" element={<OrderIntelligence />} />

            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}