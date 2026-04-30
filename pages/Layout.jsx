

import React, { useState, useEffect } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Menu, X, LogOut, Settings, LayoutDashboard, MessageSquare, Briefcase, Bot,
  TrendingUp, BarChart3, Package, Users, FileText, LifeBuoy, Building2,
  DollarSign, Command, Repeat, ShoppingCart, History, GripVertical, CreditCard, Bell, AlertTriangle
} from 'lucide-react';
import TandrilVineLogo from '@/components/logos/TandrilVineLogo';
import { ScrollArea } from '@/components/ui/scroll-area';
import InactivityManager from "@/components/auth/InactivityManager";
import ActivityTracker from "@/components/auth/ActivityTracker";
import { User } from '@/lib/entities';
import { supabase } from '@/lib/supabaseClient';
import GlobalCommandBar from "@/components/commands/GlobalCommandBar";
import { Toaster } from "@/components/ui/toaster";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import ErrorBoundary from "@/ErrorBoundary";
import { useBetaAccess } from "@/components/common/BetaGate";
import SupportModal from '@/components/support/SupportModal';
import NotificationBell from '@/components/notifications/NotificationBell';

const defaultNavigationItems = [
    { name: 'Dashboard', href: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-600' },
    { name: 'AI Advisor', href: 'AIAdvisor', icon: Bot, color: 'text-green-600' },
    { name: 'P&L Dashboard', href: 'FinancialDashboard', icon: DollarSign, color: 'text-green-600' },
    { name: 'Order Intelligence', href: 'OrderIntelligence', icon: AlertTriangle, color: 'text-red-600' },
    { name: 'Platforms', href: 'Platforms', icon: Briefcase, color: 'text-green-600' },
    { name: 'Commands', href: 'Commands', icon: Command, color: 'text-emerald-600' },
    { name: 'History', href: 'History', icon: History, color: 'text-slate-600' },
    { name: 'Workflows', href: 'Workflows', icon: Repeat, color: 'text-cyan-600' },
    { name: 'Custom Alerts', href: 'CustomAlerts', icon: Bell, color: 'text-amber-600' },
    { name: 'Inbox', href: 'Inbox', icon: MessageSquare, color: 'text-pink-600' },
    { name: 'Orders', href: 'Orders', icon: ShoppingCart, color: 'text-orange-600' },
    { name: 'Ads', href: 'Ads', icon: DollarSign, color: 'text-yellow-600' },
    { name: 'Intelligence', href: 'Intelligence', icon: TrendingUp, color: 'text-emerald-600' },
    { name: 'Analytics', href: 'Analytics', icon: BarChart3, color: 'text-emerald-600' },
    { name: 'Inventory', href: 'Inventory', icon: Package, color: 'text-amber-600' },
    { name: 'Products', href: 'Products', icon: Package, color: 'text-emerald-600' },
    { name: 'Suppliers', href: 'Suppliers', icon: Building2, color: 'text-slate-600' },
    { name: 'Purchase Orders', href: 'PurchaseOrders', icon: FileText, color: 'text-blue-600' },
];

const betaNavigationItems = [
    { name: 'Dashboard', href: 'Dashboard', icon: LayoutDashboard, color: 'text-blue-600' },
    { name: 'AI Advisor', href: 'AIAdvisor', icon: Bot, color: 'text-green-600' },
    { name: 'P&L Dashboard', href: 'FinancialDashboard', icon: DollarSign, color: 'text-green-600' },
    { name: 'Order Intelligence', href: 'OrderIntelligence', icon: AlertTriangle, color: 'text-red-600' },
    { name: 'Platforms', href: 'Platforms', icon: Briefcase, color: 'text-green-600' },
    { name: 'Commands', href: 'Commands', icon: Command, color: 'text-emerald-600' },
    { name: 'History', href: 'History', icon: History, color: 'text-slate-600' },
    { name: 'Workflows', href: 'Workflows', icon: Repeat, color: 'text-cyan-600' },
    { name: 'Custom Alerts', href: 'CustomAlerts', icon: Bell, color: 'text-amber-600' },
    { name: 'Inbox', href: 'Inbox', icon: MessageSquare, color: 'text-pink-600' },
    { name: 'Orders', href: 'Orders', icon: ShoppingCart, color: 'text-orange-600' },
    { name: 'Ads', href: 'Ads', icon: DollarSign, color: 'text-yellow-600' },
    { name: 'Intelligence', href: 'Intelligence', icon: TrendingUp, color: 'text-emerald-600' },
    { name: 'Analytics', href: 'Analytics', icon: BarChart3, color: 'text-emerald-600' },
    { name: 'Inventory', href: 'Inventory', icon: Package, color: 'text-amber-600' },
    { name: 'Products', href: 'Products', icon: Package, color: 'text-emerald-600' },
    { name: 'Suppliers', href: 'Suppliers', icon: Building2, color: 'text-slate-600' },
    { name: 'Purchase Orders', href: 'PurchaseOrders', icon: FileText, color: 'text-blue-600' },
];

const secondaryNavigation = [
    { name: 'Settings', href: 'Settings', icon: Settings, betaHidden: false },
    { name: 'Resources', href: 'Capabilities', icon: FileText, betaHidden: true },
    { name: 'Seller Card', href: 'SellerCard', icon: CreditCard, betaHidden: true },
    { name: 'Support', href: 'support', icon: LifeBuoy, isModal: true },
];

export default function Layout({ children, currentPageName }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(() => {
        try { return localStorage.getItem('desktopSidebarOpen') !== 'false'; } catch { return true; }
    });
    const [user, setUser] = useState(null);
    const [isCommandBarOpen, setIsCommandBarOpen] = useState(false);
    const [currentNavItems, setCurrentNavItems] = useState(defaultNavigationItems);
    const [showSupportModal, setShowSupportModal] = useState(false);
    const [authCheckComplete, setAuthCheckComplete] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const { hasBetaAccess } = useBetaAccess(user);

    useEffect(() => {
        let mounted = true;
        let authHandled = false;

        const publicPages = ['Home', 'Pricing', 'TermsOfService', 'PrivacyPolicy', 'EmailSignups', 'Survey', 'Login', 'Signup'];
        const excludedFromOnboarding = ['Onboarding', 'Home', 'ShopifyCallback', 'TermsOfService', 'PrivacyPolicy', 'Pricing', 'EmailSignups', 'Survey'];

        const applySession = async (session) => {
            if (!mounted || authHandled) return;
            authHandled = true;

            if (!session) {
                setUser(null);
                setAuthCheckComplete(true);
                if (!publicPages.includes(currentPageName)) {
                    console.log('User not authenticated in layout');
                    console.log(`Redirecting from ${currentPageName} to Home due to authentication failure`);
                    toast.error('Session expired', { description: 'Please log in again to continue.' });
                    navigate(createPageUrl('Login'));
                }
                return;
            }

            try {
                const currentUser = await User.me();
                if (!mounted) return;
                setUser(currentUser);

                if (currentUser && !currentUser.onboarding_completed && !excludedFromOnboarding.includes(currentPageName)) {
                    console.log('User needs to complete onboarding, redirecting...');
                    navigate(createPageUrl('Onboarding'));
                }

                const adminOnlyPages = [];
                const isAdmin = currentUser?.isAdmin || currentUser?.role === 'admin' || currentUser?.role === 'owner';
                if (adminOnlyPages.includes(currentPageName) && !isAdmin) {
                    console.log(`Redirecting from ${currentPageName} - admin access required`);
                    toast.error('Access Denied', { description: 'This page is only accessible to administrators.' });
                    navigate(createPageUrl('Dashboard'));
                }
            } catch (error) {
                if (!mounted) return;
                console.log('User not authenticated in layout');
                setUser(null);
                if (!publicPages.includes(currentPageName)) {
                    console.log(`Redirecting from ${currentPageName} to Home due to authentication failure`);
                    toast.error('Session expired', { description: 'Please log in again to continue.' });
                    navigate(createPageUrl('Login'));
                }
            } finally {
                if (mounted) setAuthCheckComplete(true);
            }
        };

        // onAuthStateChange with INITIAL_SESSION fires after the session is fully restored
        // from localStorage (including any token refresh). This is much more reliable than
        // polling getSession() after a full-page OAuth redirect.
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'INITIAL_SESSION') {
                applySession(session);
            } else if (event === 'SIGNED_OUT') {
                authHandled = false;
                applySession(null);
            }
        });

        // Fallback for SPA navigation: INITIAL_SESSION won't re-fire after the first
        // page load, so getSession() handles subsequent route changes.
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) applySession(session);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [currentPageName, navigate]);

    useEffect(() => {
        if (!user) {
            setCurrentNavItems(defaultNavigationItems);
            return;
        }

        const baseItems = hasBetaAccess ? betaNavigationItems : defaultNavigationItems;
        const userOrder = user.menu_order || [];
        const sortedNav = [...baseItems].sort((a, b) => {
            const aIndex = userOrder.indexOf(a.href);
            const bIndex = userOrder.indexOf(b.href);
            if (aIndex === -1 && bIndex === -1) return 0;
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return aIndex - bIndex;
        });
        setCurrentNavItems(sortedNav);
    }, [user, hasBetaAccess]);

    const handleOnDragEnd = async (result) => {
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
        setUser(null);
        await User.logout();
        navigate(createPageUrl('Home'));
    };

    const publicPages = ['Home', 'Pricing', 'TermsOfService', 'PrivacyPolicy', 'EmailSignups', 'Survey', 'Login', 'Signup'];
    
    if (!authCheckComplete && !publicPages.includes(currentPageName)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
                <div className="flex flex-col items-center gap-4">
                    <TandrilVineLogo className="h-12 w-auto" />
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
                                    <TandrilVineLogo className="h-8" />
                                    <NotificationBell />
                                </div>
                            </div>

                            {/* Mobile Sidebar Overlay */}
                            {sidebarOpen && (
                                <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setSidebarOpen(false)} />
                            )}

                            {/* Sidebar */}
                            <div className={`
                                fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200
                                transform transition-transform duration-300 ease-in-out
                                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                                ${desktopSidebarOpen ? 'lg:translate-x-0' : 'lg:-translate-x-full'}
                            `}>
                                <div className="flex flex-col h-full">
                                    {/* Logo */}
                                    <div className="flex items-center justify-between p-6 border-b border-slate-200">
                                        <TandrilVineLogo className="h-8" />
                                        <div className="flex items-center gap-1">
                                            <NotificationBell />
                                            {/* Desktop collapse button */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="hidden lg:flex h-7 w-7"
                                                title="Collapse sidebar"
                                                onClick={() => {
                                                    setDesktopSidebarOpen(false);
                                                    try { localStorage.setItem('desktopSidebarOpen', 'false'); } catch {}
                                                }}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                            {/* Mobile close button */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="lg:hidden"
                                                onClick={() => setSidebarOpen(false)}
                                            >
                                                <X className="h-5 w-5" />
                                            </Button>
                                        </div>
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
                                                                    isDragDisabled={false}
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
                                                                                        ? 'bg-emerald-50 text-emerald-700'
                                                                                        : 'text-slate-700 hover:bg-slate-50'
                                                                                    }
                                                                                    ${snapshot.isDragging ? 'shadow-lg' : ''}
                                                                                `}
                                                                                onClick={() => setSidebarOpen(false)}
                                                                            >
                                                                                <div {...provided.dragHandleProps}>
                                                                                    <GripVertical className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                                </div>
                                                                                <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-emerald-600' : item.color || 'text-slate-600'}`} />
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
                                                .filter(item => {
                                                    // Hide beta-only items for beta users
                                                    if (hasBetaAccess && item.betaHidden) return false;
                                                    // Hide admin-only items for non-admin users
                                                    if (item.adminOnly && !user?.isAdmin && user?.role !== 'admin' && user?.role !== 'owner') return false;
                                                    return true;
                                                })
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
                                                                    ? 'bg-emerald-50 text-emerald-700'
                                                                    : 'text-slate-700 hover:bg-slate-50'
                                                                }
                                                            `}
                                                            onClick={() => setSidebarOpen(false)}
                                                        >
                                                            <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-600'}`} />
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
                                                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                                                        <Users className="w-4 h-4 text-emerald-600" />
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

                            {/* Main Content */}
                            <div className={`transition-all duration-300 ${desktopSidebarOpen ? 'lg:pl-72' : 'lg:pl-0'}`}>
                                {/* Desktop sidebar-collapsed header strip */}
                                {!desktopSidebarOpen && (
                                    <div className="hidden lg:flex sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-slate-200 px-4 py-3 items-center gap-3">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                setDesktopSidebarOpen(true);
                                                try { localStorage.setItem('desktopSidebarOpen', 'true'); } catch {}
                                            }}
                                            title="Open sidebar"
                                        >
                                            <Menu className="h-5 w-5" />
                                        </Button>
                                        <TandrilVineLogo className="h-7" />
                                    </div>
                                )}
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

