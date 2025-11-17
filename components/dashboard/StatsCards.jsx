import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Platform, Order, InventoryItem, User } from '@/api/entities';
import { TrendingUp, Package, ShoppingCart, DollarSign, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function StatsCards() {
    const [stats, setStats] = useState({
        platforms: 0,
        orders: 0,
        inventory: 0,
        revenue: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const loadStats = async () => {
            try {
                await User.me(); // Auth check first
                const [platforms, orders, inventory] = await Promise.all([
                    Platform.list(),
                    Order.list(),
                    InventoryItem.list()
                ]);

                const totalRevenue = orders.reduce((sum, order) => sum + (order.total_price || 0), 0);
                const totalInventory = inventory.reduce((sum, item) => sum + (item.total_stock || 0), 0);

                setStats({
                    platforms: platforms.length,
                    orders: orders.length,
                    inventory: totalInventory,
                    revenue: totalRevenue
                });
            } catch (error) {
                if (error.response?.status === 401) {
                    navigate(createPageUrl('Home'));
                } else {
                    console.error('Error loading stats:', error);
                }
            } finally {
                setIsLoading(false);
            }
        };

        loadStats();
    }, [navigate]);

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="bg-white/60 backdrop-blur-sm shadow-sm border-slate-200/60">
                        <CardContent className="p-4 sm:p-6">
                            <div className="animate-pulse flex items-center justify-center h-16">
                                <Loader2 className="w-6 h-6 text-slate-300 animate-spin" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    const cards = [
        {
            title: 'Connected Platforms',
            value: stats.platforms,
            icon: Package,
            color: 'text-blue-600'
        },
        {
            title: 'Total Orders',
            value: stats.orders,
            icon: ShoppingCart,
            color: 'text-green-600'
        },
        {
            title: 'Inventory Items',
            value: stats.inventory,
            icon: TrendingUp,
            color: 'text-purple-600'
        },
        {
            title: 'Total Revenue',
            value: `$${stats.revenue.toFixed(2)}`,
            icon: DollarSign,
            color: 'text-emerald-600'
        }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {cards.map((card, index) => {
                const IconComponent = card.icon;
                return (
                    <Card key={index} className="bg-white/60 backdrop-blur-sm shadow-sm border-slate-200/60 hover:shadow-md transition-shadow">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-slate-600">
                                {card.title}
                            </CardTitle>
                            <IconComponent className={`h-4 w-4 ${card.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{card.value}</div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}