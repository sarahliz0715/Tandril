import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { api } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Bell,
    Plus,
    Zap,
    TrendingDown,
    Package,
    Star,
    DollarSign,
    Activity,
    Mail,
    Smartphone,
    Edit,
    Trash2,
    Info,
    Clock,
    CheckCircle,
    Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import CreateCustomAlertModal from '../components/alerts/CreateCustomAlertModal';
import { handleAuthError } from '@/utils/authHelpers';
import { useConfirmDialog, ConfirmDialog } from '@/hooks/useConfirmDialog';

const triggerIcons = {
    inventory_low: Package,
    inventory_out_of_stock: Package,
    sales_drop: TrendingDown,
    revenue_milestone: DollarSign,
    new_review: Star,
    low_rating_review: Star,
    competitor_price_drop: DollarSign,
    platform_disconnect: Activity,
    order_threshold: Activity,
    conversion_rate_drop: TrendingDown,
    traffic_drop: TrendingDown,
    ad_spend_high: DollarSign,
    roas_low: DollarSign,
    custom_metric: Zap
};

export default function CustomAlerts() {
    const navigate = useNavigate();
    const [alerts, setAlerts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingAlert, setEditingAlert] = useState(null);
    const { isOpen, config, confirm, cancel } = useConfirmDialog();

    useEffect(() => {
        loadAlerts();
    }, []);

    const loadAlerts = async () => {
        setIsLoading(true);
        try {
            const alertsData = await api.entities.CustomAlert.list('-created_at');
            setAlerts(alertsData || []);
        } catch (error) {
            console.error('Error loading custom alerts:', error);
            if (handleAuthError(error, navigate)) return;
            toast.error('Failed to load custom alerts');
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleAlert = async (alert) => {
        try {
            await api.entities.CustomAlert.update(alert.id, {
                is_active: !alert.is_active
            });
            toast.success(`Alert ${alert.is_active ? 'deactivated' : 'activated'}`);
            loadAlerts();
        } catch (error) {
            console.error('Error toggling alert:', error);
            if (handleAuthError(error, navigate)) return;
            toast.error('Failed to update alert');
        }
    };

    const handleDeleteAlert = async (alert) => {
        await confirm({
            title: 'Delete Custom Alert?',
            description: `Are you sure you want to delete "${alert.name}"? This cannot be undone.`,
            confirmText: 'Delete',
            variant: 'destructive',
            onConfirm: async () => {
                try {
                    await api.entities.CustomAlert.delete(alert.id);
                    toast.success('Alert deleted successfully');
                    loadAlerts();
                } catch (error) {
                    console.error('Error deleting alert:', error);
                    if (handleAuthError(error, navigate)) return;
                    toast.error('Failed to delete alert');
                }
            }
        });
    };

    const handleEditAlert = (alert) => {
        setEditingAlert(alert);
        setShowCreateModal(true);
    };

    const activeAlerts = alerts.filter(a => a.is_active);
    const inactiveAlerts = alerts.filter(a => !a.is_active);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
                    <p className="text-slate-600">Loading custom alerts...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                            <Bell className="w-8 h-8 text-indigo-600" />
                            Custom Alerts
                        </h1>
                        <p className="text-slate-600 mt-2">
                            Set up custom notifications for the metrics that matter to your business
                        </p>
                    </div>
                    <Button
                        onClick={() => {
                            setEditingAlert(null);
                            setShowCreateModal(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Alert
                    </Button>
                </div>

                {/* Info Banner */}
                <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                        <strong>Stay Proactive:</strong> Custom alerts automatically monitor your business and notify you when important events occur.
                        Choose from email, in-app notifications, or both!
                    </AlertDescription>
                </Alert>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600">Total Alerts</p>
                                    <p className="text-2xl font-bold text-slate-900">{alerts.length}</p>
                                </div>
                                <Bell className="w-8 h-8 text-indigo-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600">Active</p>
                                    <p className="text-2xl font-bold text-green-600">{activeAlerts.length}</p>
                                </div>
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600">Total Triggers</p>
                                    <p className="text-2xl font-bold text-blue-600">
                                        {alerts.reduce((sum, a) => sum + (a.trigger_count || 0), 0)}
                                    </p>
                                </div>
                                <Zap className="w-8 h-8 text-blue-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600">Inactive</p>
                                    <p className="text-2xl font-bold text-slate-600">{inactiveAlerts.length}</p>
                                </div>
                                <Clock className="w-8 h-8 text-slate-400" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Active Alerts */}
                <div>
                    <h2 className="text-xl font-bold text-slate-900 mb-4">Active Alerts</h2>
                    {activeAlerts.length === 0 ? (
                        <Card>
                            <CardContent className="p-12 text-center">
                                <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Active Alerts</h3>
                                <p className="text-slate-600 mb-4">Create your first custom alert to stay on top of your business</p>
                                <Button onClick={() => setShowCreateModal(true)}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Alert
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {activeAlerts.map((alert) => (
                                <AlertCard
                                    key={alert.id}
                                    alert={alert}
                                    onToggle={handleToggleAlert}
                                    onEdit={handleEditAlert}
                                    onDelete={handleDeleteAlert}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Inactive Alerts */}
                {inactiveAlerts.length > 0 && (
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 mb-4">Inactive Alerts</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {inactiveAlerts.map((alert) => (
                                <AlertCard
                                    key={alert.id}
                                    alert={alert}
                                    onToggle={handleToggleAlert}
                                    onEdit={handleEditAlert}
                                    onDelete={handleDeleteAlert}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showCreateModal && (
                <CreateCustomAlertModal
                    alert={editingAlert}
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditingAlert(null);
                    }}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        setEditingAlert(null);
                        loadAlerts();
                    }}
                />
            )}

            <ConfirmDialog isOpen={isOpen} config={config} onCancel={cancel} />
        </div>
    );
}

function AlertCard({ alert, onToggle, onEdit, onDelete }) {
    const Icon = triggerIcons[alert.trigger_type] || Bell;
    const notificationTemplate = alert.notification_template || {};
    const priority = notificationTemplate.priority || 'medium';

    const priorityColors = {
        low: 'bg-blue-100 text-blue-800',
        medium: 'bg-yellow-100 text-yellow-800',
        high: 'bg-orange-100 text-orange-800',
        urgent: 'bg-red-100 text-red-800'
    };

    const frequencyLabels = {
        real_time: 'Real-time',
        every_5_minutes: 'Every 5 min',
        every_15_minutes: 'Every 15 min',
        hourly: 'Hourly',
        daily: 'Daily'
    };

    return (
        <Card className={`transition-all ${alert.is_active ? 'border-indigo-200' : 'border-slate-200 opacity-75'}`}>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${alert.is_active ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                            <Icon className={`w-5 h-5 ${alert.is_active ? 'text-indigo-600' : 'text-slate-400'}`} />
                        </div>
                        <div className="flex-1">
                            <CardTitle className="text-base mb-1">{alert.name}</CardTitle>
                            {alert.description && (
                                <p className="text-sm text-slate-600">{alert.description}</p>
                            )}
                        </div>
                    </div>
                    <Switch
                        checked={alert.is_active}
                        onCheckedChange={() => onToggle(alert)}
                    />
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                {/* Trigger Type */}
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                        {alert.trigger_type.replace(/_/g, ' ').toUpperCase()}
                    </Badge>
                    <Badge className={`text-xs ${priorityColors[priority]}`}>
                        {priority} priority
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                        {frequencyLabels[alert.check_frequency] || alert.check_frequency}
                    </Badge>
                </div>

                {/* Conditions */}
                {alert.conditions && alert.conditions.length > 0 && (
                    <div className="text-sm">
                        <p className="text-slate-500 mb-1">Conditions:</p>
                        {alert.conditions.slice(0, 2).map((condition, idx) => (
                            <p key={idx} className="text-slate-700 text-xs">
                                • {condition.field} {condition.operator} {condition.value}
                            </p>
                        ))}
                        {alert.conditions.length > 2 && (
                            <p className="text-xs text-slate-500">+{alert.conditions.length - 2} more</p>
                        )}
                    </div>
                )}

                {/* Notification Channels */}
                <div className="flex items-center gap-2">
                    {alert.notification_channels?.includes('in_app') && (
                        <Badge variant="outline" className="text-xs">
                            <Bell className="w-3 h-3 mr-1" />
                            In-App
                        </Badge>
                    )}
                    {alert.notification_channels?.includes('email') && (
                        <Badge variant="outline" className="text-xs">
                            <Mail className="w-3 h-3 mr-1" />
                            Email
                        </Badge>
                    )}
                    {alert.notification_channels?.includes('sms') && (
                        <Badge variant="outline" className="text-xs">
                            <Smartphone className="w-3 h-3 mr-1" />
                            SMS
                        </Badge>
                    )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t">
                    <span>Triggered {alert.trigger_count || 0} times</span>
                    {alert.last_triggered && (
                        <span>Last: {new Date(alert.last_triggered).toLocaleDateString()}</span>
                    )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEdit(alert)}
                        className="flex-1"
                    >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDelete(alert)}
                        className="text-red-600 hover:bg-red-50"
                    >
                        <Trash2 className="w-3 h-3" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}