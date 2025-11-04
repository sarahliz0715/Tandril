
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Plus,
    Zap,
    Clock,
    TrendingUp,
    AlertTriangle,
    Play,
    Pause,
    Settings,
    BarChart3,
    Loader2,
    Sparkles
} from 'lucide-react';
import { toast } from 'sonner';

import AutomationCard from '../components/automations/AutomationCard';
import AutomationStats from '../components/automations/AutomationStats';
import AutomationTemplateGallery from '../components/automations/AutomationTemplateGallery';
import ScheduledRunsCalendar from '../components/automations/ScheduledRunsCalendar';
import AutomationAnalytics from '../components/automations/AutomationAnalytics';

export default function AutomationsPage() {
    const navigate = useNavigate();
    const [automations, setAutomations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showTemplates, setShowTemplates] = useState(false);

    useEffect(() => {
        loadAutomations();
    }, []);

    const loadAutomations = async () => {
        try {
            const data = await base44.entities.Automation.list('-created_date');
            setAutomations(data);
        } catch (error) {
            console.error('Error loading automations:', error);
            toast.error('Failed to load automations');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleAutomation = async (automation) => {
        try {
            await base44.entities.Automation.update(automation.id, {
                is_active: !automation.is_active
            });
            
            await loadAutomations();
            toast.success(`Automation ${automation.is_active ? 'paused' : 'activated'}`);
        } catch (error) {
            console.error('Error toggling automation:', error);
            toast.error('Failed to update automation');
        }
    };

    const handleDeleteAutomation = async (automation) => {
        if (!confirm('Are you sure you want to delete this automation?')) return;

        try {
            await base44.entities.Automation.delete(automation.id);
            await loadAutomations();
            toast.success('Automation deleted');
        } catch (error) {
            console.error('Error deleting automation:', error);
            toast.error('Failed to delete automation');
        }
    };

    const activeAutomations = automations.filter(a => a.is_active);
    const inactiveAutomations = automations.filter(a => !a.is_active);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">Automations</h1>
                        <p className="text-slate-600 mt-1">Create powerful workflows that run automatically</p>
                    </div>
                    <div className="flex gap-3">
                        <Button
                            onClick={() => setShowTemplates(!showTemplates)}
                            variant="outline"
                        >
                            <Sparkles className="w-4 h-4 mr-2" />
                            {showTemplates ? 'Hide Templates' : 'Browse Templates'}
                        </Button>
                        <Button
                            onClick={() => navigate(createPageUrl('AutomationSetup'))}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Create Automation
                        </Button>
                    </div>
                </div>

                {showTemplates && (
                    <div className="mb-8">
                        <AutomationTemplateGallery />
                    </div>
                )}

                {/* Analytics Dashboard */}
                <div className="mb-8">
                    <AutomationAnalytics />
                </div>

                {/* Scheduled Runs Calendar */}
                <div className="mb-8">
                    <ScheduledRunsCalendar />
                </div>

                <AutomationStats automations={automations} />

                <Tabs defaultValue="active" className="mt-8">
                    <TabsList>
                        <TabsTrigger value="active">
                            <Play className="w-4 h-4 mr-2" />
                            Active ({activeAutomations.length})
                        </TabsTrigger>
                        <TabsTrigger value="inactive">
                            <Pause className="w-4 h-4 mr-2" />
                            Inactive ({inactiveAutomations.length})
                        </TabsTrigger>
                        <TabsTrigger value="all">
                            <Zap className="w-4 h-4 mr-2" />
                            All ({automations.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="active" className="mt-6">
                        {activeAutomations.length === 0 ? (
                            <Card className="border-dashed">
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <Play className="w-12 h-12 text-slate-300 mb-3" />
                                    <p className="text-slate-500 text-center">
                                        No active automations yet.
                                        <br />
                                        Create your first automation to get started!
                                    </p>
                                    <Button
                                        onClick={() => navigate(createPageUrl('AutomationSetup'))}
                                        className="mt-4"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create Automation
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {activeAutomations.map(automation => (
                                    <AutomationCard
                                        key={automation.id}
                                        automation={automation}
                                        onToggle={handleToggleAutomation}
                                        onDelete={handleDeleteAutomation}
                                        onEdit={() => navigate(createPageUrl(`AutomationSetup?id=${automation.id}`))}
                                    />
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="inactive" className="mt-6">
                        {inactiveAutomations.length === 0 ? (
                            <Card className="border-dashed">
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <Pause className="w-12 h-12 text-slate-300 mb-3" />
                                    <p className="text-slate-500">No inactive automations</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {inactiveAutomations.map(automation => (
                                    <AutomationCard
                                        key={automation.id}
                                        automation={automation}
                                        onToggle={handleToggleAutomation}
                                        onDelete={handleDeleteAutomation}
                                        onEdit={() => navigate(createPageUrl(`AutomationSetup?id=${automation.id}`))}
                                    />
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="all" className="mt-6">
                        {automations.length === 0 ? (
                            <Card className="border-dashed">
                                <CardContent className="flex flex-col items-center justify-center py-12">
                                    <Zap className="w-12 h-12 text-slate-300 mb-3" />
                                    <p className="text-slate-500 text-center">
                                        No automations yet.
                                        <br />
                                        Get started by creating your first automation!
                                    </p>
                                    <Button
                                        onClick={() => navigate(createPageUrl('AutomationSetup'))}
                                        className="mt-4"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Create Automation
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {automations.map(automation => (
                                    <AutomationCard
                                        key={automation.id}
                                        automation={automation}
                                        onToggle={handleToggleAutomation}
                                        onDelete={handleDeleteAutomation}
                                        onEdit={() => navigate(createPageUrl(`AutomationSetup?id=${automation.id}`))}
                                    />
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
