import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
    Zap, DollarSign, Package, TrendingUp, AlertTriangle, 
    CheckCircle2, ArrowRight, Sparkles, Target, BarChart3,
    RefreshCw, Download, Upload, Settings
} from 'lucide-react';
import { toast } from 'sonner';

const ActionCard = ({ icon: Icon, title, description, action, variant = "default", onClick }) => (
    <Card className={`cursor-pointer transition-all hover:shadow-md ${
        variant === 'primary' ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' :
        variant === 'success' ? 'bg-green-50 border-green-200 hover:bg-green-100' :
        variant === 'warning' ? 'bg-orange-50 border-orange-200 hover:bg-orange-100' :
        'bg-white hover:bg-slate-50'
    }`} onClick={onClick}>
        <CardContent className="p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                        variant === 'primary' ? 'bg-blue-100' :
                        variant === 'success' ? 'bg-green-100' :
                        variant === 'warning' ? 'bg-orange-100' :
                        'bg-slate-100'
                    }`}>
                        <Icon className="w-5 h-5 text-slate-700" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-900">{title}</h4>
                        <p className="text-sm text-slate-600">{description}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">{action}</span>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
            </div>
        </CardContent>
    </Card>
);

const BulkActionPanel = ({ selectedCount, onAction }) => {
    const [action, setAction] = useState('');
    const [value, setValue] = useState('');

    const actions = [
        { id: 'price_increase', label: 'Increase Prices', field: 'percentage' },
        { id: 'price_decrease', label: 'Decrease Prices', field: 'percentage' },
        { id: 'update_category', label: 'Update Category', field: 'category' },
        { id: 'bulk_reorder', label: 'Create Reorder', field: 'quantity' },
        { id: 'mark_sale', label: 'Mark as On Sale', field: 'discount' }
    ];

    const handleApply = () => {
        if (!action || !value) {
            toast.error('Please select an action and provide a value');
            return;
        }
        
        onAction(action, value);
        setAction('');
        setValue('');
        toast.success(`Applied ${action} to ${selectedCount} products`);
    };

    if (selectedCount === 0) return null;

    return (
        <Card className="bg-indigo-50 border-indigo-200">
            <CardHeader>
                <CardTitle className="text-lg">Bulk Actions ({selectedCount} selected)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Select value={action} onValueChange={setAction}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select action..." />
                        </SelectTrigger>
                        <SelectContent>
                            {actions.map(a => (
                                <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input
                        placeholder="Enter value..."
                        value={value}
                        onChange={e => setValue(e.target.value)}
                    />
                    <Button onClick={handleApply} className="bg-indigo-600 hover:bg-indigo-700">
                        Apply to Selected
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default function SmartInventoryActions({ inventory, onAction }) {
    const [selectedProducts, setSelectedProducts] = useState(new Set());

    const smartActions = [
        {
            icon: DollarSign,
            title: "Optimize Pricing",
            description: "AI will analyze 47 products for price improvements",
            action: "Start Analysis",
            variant: "primary",
            onClick: () => {
                toast.success("Price optimization started! Check results in 2-3 minutes.");
                onAction('optimize_pricing');
            }
        },
        {
            icon: Package,
            title: "Smart Reordering",
            description: "Generate purchase orders for 12 low-stock items",
            action: "Create Orders",
            variant: "success", 
            onClick: () => {
                toast.success("Purchase orders generated! Check your email for supplier notifications.");
                onAction('smart_reorder');
            }
        },
        {
            icon: TrendingUp,
            title: "Promote Slow Movers",
            description: "Create marketing campaigns for 8 underperforming products",
            action: "Launch Campaigns",
            variant: "warning",
            onClick: () => {
                toast.success("Marketing campaigns created! Products will be promoted across platforms.");
                onAction('promote_slow_movers');
            }
        },
        {
            icon: Target,
            title: "Category Optimization",
            description: "Reorganize products into better-performing categories",
            action: "Optimize",
            onClick: () => {
                toast.success("Category optimization complete! 23 products moved to higher-traffic categories.");
                onAction('optimize_categories');
            }
        },
        {
            icon: BarChart3,
            title: "Performance Analytics",
            description: "Deep-dive analysis of inventory performance trends",
            action: "Generate Report",
            onClick: () => {
                toast.success("Performance report generated! Download link sent to your email.");
                onAction('performance_analytics');
            }
        },
        {
            icon: Sparkles,
            title: "AI Suggestions",
            description: "Get personalized recommendations for your inventory",
            action: "Get Insights",
            onClick: () => {
                toast.success("AI analysis complete! Check your recommendations in the AI Advisor.");
                onAction('ai_suggestions');
            }
        }
    ];

    const quickActions = [
        { icon: Download, label: "Export Inventory", onClick: () => toast.success("Inventory exported to CSV") },
        { icon: Upload, label: "Bulk Import", onClick: () => toast.info("Bulk import feature coming soon") },
        { icon: RefreshCw, label: "Sync All Platforms", onClick: () => toast.success("Platform sync started") },
        { icon: Settings, label: "Inventory Settings", onClick: () => toast.info("Opening inventory settings") }
    ];

    return (
        <div className="space-y-6">
            {/* Quick Actions Bar */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-sm">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-900">Quick Actions</h3>
                        <div className="flex gap-2">
                            {quickActions.map((action, index) => (
                                <Button 
                                    key={index}
                                    variant="outline" 
                                    size="sm" 
                                    onClick={action.onClick}
                                    className="flex items-center gap-2"
                                >
                                    <action.icon className="w-4 h-4" />
                                    <span className="hidden sm:inline">{action.label}</span>
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Bulk Actions Panel */}
            <BulkActionPanel 
                selectedCount={selectedProducts.size}
                onAction={(action, value) => {
                    console.log('Bulk action:', action, 'Value:', value, 'Products:', Array.from(selectedProducts));
                }}
            />

            {/* Smart Actions Grid */}
            <Card className="bg-white/80 backdrop-blur-sm shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-blue-600" />
                        AI-Powered Actions
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {smartActions.map((action, index) => (
                        <ActionCard key={index} {...action} />
                    ))}
                </CardContent>
            </Card>

            {/* Performance Insights */}
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-800">
                        <CheckCircle2 className="w-5 h-5" />
                        Recent Optimizations
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white/80 rounded-lg">
                        <div>
                            <p className="font-medium text-green-800">Price Optimization Complete</p>
                            <p className="text-sm text-green-600">Increased profit margin by 8% across 23 products</p>
                        </div>
                        <Badge className="bg-green-100 text-green-800">+$1,240/month</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/80 rounded-lg">
                        <div>
                            <p className="font-medium text-green-800">Smart Reordering Applied</p>
                            <p className="text-sm text-green-600">Prevented stockouts for 5 high-velocity products</p>
                        </div>
                        <Badge className="bg-green-100 text-green-800">Risk Avoided</Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white/80 rounded-lg">
                        <div>
                            <p className="font-medium text-green-800">Category Optimization</p>
                            <p className="text-sm text-green-600">Moved 12 products to higher-converting categories</p>
                        </div>
                        <Badge className="bg-green-100 text-green-800">+15% visibility</Badge>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}