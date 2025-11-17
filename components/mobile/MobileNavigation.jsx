import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
    LayoutDashboard, Bot, MessageSquare, TrendingUp, 
    Package, ShoppingCart, Settings, MoreHorizontal 
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const navigationItems = [
    { name: 'Dashboard', href: 'Dashboard', icon: LayoutDashboard },
    { name: 'Commands', href: 'Commands', icon: Bot },
    { name: 'Orders', href: 'Orders', icon: ShoppingCart, badge: 3 },
    { name: 'Inventory', href: 'Inventory', icon: Package },
    { name: 'More', href: 'Settings', icon: MoreHorizontal },
];

export default function MobileNavigation() {
    const location = useLocation();
    const currentPath = location.pathname;

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 safe-area-pb z-50">
            <div className="grid grid-cols-5 h-16">
                {navigationItems.map((item) => {
                    const isActive = currentPath === createPageUrl(item.href);
                    
                    return (
                        <Link
                            key={item.name}
                            to={createPageUrl(item.href)}
                            className={`flex flex-col items-center justify-center gap-1 relative transition-colors ${
                                isActive 
                                    ? 'text-indigo-600 bg-indigo-50' 
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <div className="relative">
                                <item.icon className="w-5 h-5" />
                                {item.badge && (
                                    <Badge className="absolute -top-2 -right-2 h-4 w-4 p-0 text-xs bg-red-500">
                                        {item.badge}
                                    </Badge>
                                )}
                            </div>
                            <span className="text-xs font-medium">{item.name}</span>
                            {isActive && (
                                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-indigo-600 rounded-full" />
                            )}
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}