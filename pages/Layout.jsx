

import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Menu, X, LogOut, Settings, LayoutDashboard, MessageSquare, Briefcase, Bot,
  TrendingUp, BarChart3, Package, Users, FileText, LifeBuoy,
  DollarSign, Command, Repeat, ShoppingCart, History, GripVertical, CreditCard, Bell
} from 'lucide-react';
import TandrilLogo from '@/components/logos/TandrilLogo';
import { ScrollArea } from '@/components/ui/scroll-area';
import InactivityManager from "@/components/auth/InactivityManager";
import ActivityTracker from "@/components/auth/ActivityTracker";
import { User } from '@/api/entities';
import GlobalCommandBar from "@/components/commands/GlobalCommandBar";
import { Toaster } from "@/components/ui/toaster";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import ErrorBoundary from "@/ErrorBoundary";
import { useBetaAccess } from "@/components/common/BetaGate";
import SupportModal from '@/components/support/SupportModal';

const defaultNavigationItems = [
    { name: 'Dashboard', href: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-600' },
    { name: 'AI Advisor', href: 'AIAdvisor', icon: Bot, color: 'text-purple-600' },
    { name: 'Platforms', href: 'Platforms', icon: Briefcase, color: 'text-green-600' },
    { name: 'Commands', href: 'Commands', icon: Command, color: 'text-indigo-600' },
    { name: 'History', href: 'History', icon: History, color: 'text-slate-600' },
    { name: 'Workflows', href: 'Workflows', icon: Repeat, color: 'text-cyan-600' },
    { name: 'Custom Alerts', href: 'CustomAlerts', icon: Bell, color: 'text-amber-600' },
    { name: 'Inbox', href: 'Inbox', icon: MessageSquare, color: 'text-pink-600' },
    { name: 'Orders', href: 'Orders', icon: ShoppingCart, color: 'text-orange-600' },
    { name: 'Ads', href: 'Ads', icon: DollarSign, color: 'text-yellow-600' },
    { name: 'Intelligence', href: 'Intelligence', icon: TrendingUp, color: 'text-emerald-600' },
    { name: 'Analytics', href: 'Analytics', icon: BarChart3, color: 'text-violet-600' },
    { name: 'Inventory', href: 'Inventory', icon: Package, color: 'text-amber-600' },
];

const betaNavigationItems = [
    { name: 'Dashboard', href: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-600' },
    { name: 'AI Advisor', href: 'AIAdvisor', icon: Bot, color: 'text-purple-600' },
    { name: 'My Shopify Store', href: 'Platforms', icon: Briefcase, color: 'text-green-600' },
    { name: 'Commands', href: 'Commands', icon: Command, color: 'text-indigo-600' },
    { name: 'History', href: 'History', icon: History, color: 'text-slate-600' },
];

const secondaryNavigation = [
    { name: 'Settings', href: 'Settings', icon: Settings, betaHidden: false },
    { name: 'Resources', href: 'Capabilities', icon: FileText, betaHidden: true },
    { name: 'Seller Card', href: 'SellerCard', icon: CreditCard, betaHidden: true },
    { name: 'Executive Summary', href: 'ExecutiveSummary', icon: FileText, betaHidden: true },
    { name: 'Revenue Model', href: 'RevenueModel', icon: FileText, betaHidden: true },
    { name: 'Business Plan', href: 'BusinessPlan', icon: FileText, betaHidden: true },
    { name: 'Support', href: 'support', icon: LifeBuoy, isModal: true },
];

export default function Layout({ children, currentPageName }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [user, setUser] = useState(null);
    const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
    const [currentNavItems, setCurrentNavItems] = useState(defaultNavigationItems);
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [authCheckComplete, setAuthCheckComplete] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const { hasBetaAccess } = useBetaAccess(user);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const currentUser = await User.me();
                setUser(currentUser);
                
                const excludedPages = ['Onboarding', 'Home', 'ShopifyCallback', 'TermsOfService', 'PrivacyPolicy', 'Pricing', 'EmailSignups', 'Survey'];
                
                if (currentUser && !currentUser.onboarding_completed && !excludedPages.includes(currentPageName)) {
                    console.log('User needs to complete onboarding, redirecting...');
                    navigate(createPageUrl('Onboarding'));
                }
            } catch (error) {
                console.log('User not authenticated in layout');
                
                const publicPages = ['Home', 'Pricing', 'TermsOfService', 'PrivacyPolicy', 'EmailSignups', 'Survey'];
                if (!publicPages.includes(currentPageName)) {
                    console.log(`Redirecting from ${currentPageName} to Home due to authentication failure`);
                    navigate(createPageUrl('Home'));
                }
            } finally {
                setAuthCheckComplete(true);
            }
        };
        fetchUser();
    }, [currentPageName, navigate]);

    useEffect(() => {
        if (!user) {
            setCurrentNavItems(defaultNavigationItems);
            return;
        }

        if (hasBetaAccess) {
            setCurrentNavItems(betaNavigationItems);
        } else {
            const userOrder = user.menu_order || [];
            const sortedNav = [...defaultNavigationItems].sort((a, b) => {
                const aIndex = userOrder.indexOf(a.href);
                const bIndex = userOrder.indexOf(b.href);
                if (aIndex === -1 && bIndex === -1) return 0;
                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;
                return aIndex - bIndex;
            });
            setCurrentNavItems(sortedNav);
        }
    }, [user, hasBetaAccess]);

    const handleOnDragEnd = async (result) => {
        if (hasBetaAccess) {
            toast.info("Menu reordering is not available in beta mode.");
            return;
        }
        if (!result.destination) return;

        const items = Array.from(currentNavItems);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setCurrentNavItems(items);

        const newOrder = items.map(item => item.href);
        try {
            await User.updateMyUserData({ menu_order: newOrder });
            toast.success("Menu order saved!");
        } catch (error) {
            toast.error("Could not save menu order.");
        }
    };

    useEffect(() => {
        const down = (e) => {
          if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            setIsCommandBarOpen((open) => !open)
          }
        }
        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, []);

    const handleLogout = async () => {
        await User.logout();
        navigate(createPageUrl('Home'));
    };

    const publicPages = ['Home', 'Pricing', 'TermsOfService', 'PrivacyPolicy', 'EmailSignups', 'Survey'];
    
    if (!authCheckComplete && !publicPages.includes(currentPageName)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
                <div className="flex flex-col items-center gap-4">
                    <TandrilLogo className="h-12 w-auto" />
                    <p className="text-lg font-medium text-slate-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <ErrorBoundary>
                <Toaster />
                <GlobalCommandBar open={isCommandBarOpen} onOpenChange={setIsCommandBarOpen} />
                {user && <InactivityManager />}
                {user && <ActivityTracker />}

                <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
                    {user && !publicPages.includes(currentPageName) && (
                        <>
                            {/* Mobile Header */}
                            <div className="lg:hidden sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-slate-200">
                                <div className="flex items-center justify-between p-4">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setSidebarOpen(true)}
                                    >
                                        <Menu className="h-6 w-6" />
                                    </Button>
                                    <TandrilLogo className="h-8" />
                                </div>
                            </div>

                            {/* Mobile Sidebar Overlay */}
                            {sidebarOpen && (
                                <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setSidebarOpen(false)} />
                            )}

                            {/* Sidebar - Always visible on desktop */}
                            <div className={`
                                fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 
                                transform transition-transform duration-300 ease-in-out
                                lg:translate-x-0
                                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                            `}>
                                <div className="flex flex-col h-full">
                                    {/* Logo */}
                                    <div className="flex items-center justify-between p-6 border-b border-slate-200">
                                        <TandrilLogo className="h-8" />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="lg:hidden"
                                            onClick={() => setSidebarOpen(false)}
                                        >
                                            <X className="h-5 w-5" />
                                        </Button>
                                    </div>

                                    {/* Navigation */}
                                    <ScrollArea className="flex-1 px-3 py-4">
                                        <DragDropContext onDragEnd={handleOnDragEnd}>
                                            <Droppable droppableId="navigation">
                                                {(provided) => (
                                                    <nav
                                                        {...provided.droppableProps}
                                                        ref={provided.innerRef}
                                                        className="space-y-1"
                                                    >
                                                        {currentNavItems.map((item, index) => {
                                                            const isActive = location.pathname.includes(item.href);
                                                            return (
                                                                <Draggable
                                                                    key={item.href}
                                                                    draggableId={item.href}
                                                                    index={index}
                                                                    isDragDisabled={hasBetaAccess}
                                                                >
                                                                    {(provided, snapshot) => (
                                                                        <div
                                                                            ref={provided.innerRef}
                                                                            {...provided.draggableProps}
                                                                        >
                                                                            <Link
                                                                                to={createPageUrl(item.href)}
                                                                                className={`
                                                                                    flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group
                                                                                    ${isActive
                                                                                        ? 'bg-indigo-50 text-indigo-700'
                                                                                        : 'text-slate-700 hover:bg-slate-50'
                                                                                    }
                                                                                    ${snapshot.isDragging ? 'shadow-lg' : ''}
                                                                                `}
                                                                                onClick={() => setSidebarOpen(false)}
                                                                            >
                                                                                {!hasBetaAccess && (
                                                                                    <div {...provided.dragHandleProps}>
                                                                                        <GripVertical className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                                    </div>
                                                                                )}
                                                                                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-indigo-600' : item.color || 'text-slate-600'}`} />
                                                                                <span className="font-medium">{item.name}</span>
                                                                            </Link>
                                                                        </div>
                                                                    )}
                                                                </Draggable>
                                                            );
                                                        })}
                                                        {provided.placeholder}
                                                    </nav>
                                                )}
                                            </Droppable>
                                        </DragDropContext>

                                        <div className="mt-6 pt-6 border-t border-slate-200 space-y-1">
                                            {secondaryNavigation
                                                .filter(item => !(hasBetaAccess && item.betaHidden))
                                                .map((item) => {
                                                    if (item.isModal) {
                                                        return (
                                                            <button
                                                                key={item.name}
                                                                onClick={() => {
                                                                    setShowSupportModal(true);
                                                                    setSidebarOpen(false);
                                                                }}
                                                                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
                                                            >
                                                                <item.icon className="w-5 h-5 flex-shrink-0 text-slate-600" />
                                                                <span className="font-medium">{item.name}</span>
                                                            </button>
                                                        );
                                                    }
                                                    
                                                    const isActive = location.pathname.includes(item.href);
                                                    return (
                                                        <Link
                                                            key={item.name}
                                                            to={createPageUrl(item.href)}
                                                            className={`
                                                                flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                                                                ${isActive
                                                                    ? 'bg-indigo-50 text-indigo-700'
                                                                    : 'text-slate-700 hover:bg-slate-50'
                                                                }
                                                            `}
                                                            onClick={() => setSidebarOpen(false)}
                                                        >
                                                            <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-600'}`} />
                                                            <span className="font-medium">{item.name}</span>
                                                        </Link>
                                                    );
                                                })}
                                        </div>
                                    </ScrollArea>

                                    {/* User Menu */}
                                    <div className="p-4 border-t border-slate-200">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="ghost" className="w-full justify-start gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                                        <Users className="w-4 h-4 text-indigo-600" />
                                                    </div>
                                                    <div className="flex-1 text-left">
                                                        <p className="text-sm font-medium text-slate-900">{user?.full_name || 'User'}</p>
                                                        <p className="text-xs text-slate-500">{user?.email}</p>
                                                    </div>
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent align="end" className="w-56">
                                                <div className="space-y-1">
                                                    <Button
                                                        variant="ghost"
                                                        className="w-full justify-start"
                                                        onClick={() => {
                                                            navigate(createPageUrl('Settings'));
                                                            setSidebarOpen(false);
                                                        }}
                                                    >
                                                        <Settings className="w-4 h-4 mr-2" />
                                                        Settings
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={handleLogout}
                                                    >
                                                        <LogOut className="w-4 h-4 mr-2" />
                                                        Logout
                                                    </Button>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            </div>

                            {/* Main Content - with padding on desktop to account for sidebar */}
                            <div className="lg:pl-72">
                                {children}
                            </div>
                        </>
                    )}

                    {/* Public Pages (no sidebar) */}
                    {(!user || publicPages.includes(currentPageName)) && children}
                </div>
            </ErrorBoundary>
            
            <SupportModal 
                isOpen={showSupportModal} 
                onClose={() => setShowSupportModal(false)} 
            />
        </>
    );
}

