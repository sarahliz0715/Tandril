import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { api } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Zap,
    Plus,
    Search,
    Filter,
    TrendingUp,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';
import MobileAutomationCard from '../components/mobile/MobileAutomationCard';

export default function MobileAutomationsPage() {
    const navigate = useNavigate();
    const [automations, setAutomations] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        loadAutomations();
    }, []);

    const loadAutomations = async () => {
        setIsLoading(true);
        try {
            const data = await api.entities.Automation.list('-updated_date');
            setAutomations(data);
        } catch (error) {
            console.error('Error loading automations:', error);
            toast.error('Failed to load automations');
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggle = async (automation) => {
        try {
            await api.entities.Automation.update(automation.id, {
                is_active: !automation.is_active
            });
            
            setAutomations(automations.map(a => 
                a.id === automation.id ? { ...a, is_active: !a.is_active } : a
            ));

            toast.success(`Automation ${!automation.is_active ? 'activated' : 'paused'}`);
        } catch (error) {
            console.error('Error toggling automation:', error);
            toast.error('Failed to toggle automation');
        }
    };

    const handleView = (automation) => {
        navigate(createPageUrl(`AutomationSetup?id=${automation.id}`));
    };

    const handleEdit = (automation) => {
        navigate(createPageUrl(`AutomationSetup?id=${automation.id}`));
    };

    const handleDelete = async (automation) => {
        if (!confirm('Delete this automation?')) return;

        try {
            await api.entities.Automation.delete(automation.id);
            setAutomations(automations.filter(a => a.id !== automation.id));
            toast.success('Automation deleted');
        } catch (error) {
            console.error('Error deleting automation:', error);
            toast.error('Failed to delete automation');
        }
    };

    const filteredAutomations = automations.filter(automation => {
        const matchesSearch = automation.name.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (activeTab === 'all') return matchesSearch;
        if (activeTab === 'active') return matchesSearch && automation.is_active;
        if (activeTab === 'paused') return matchesSearch && !automation.is_active;
        
        return matchesSearch;
    });

    const stats = {
        total: automations.length,
        active: automations.filter(a => a.is_active).length,
        paused: automations.filter(a => !a.is_active).length
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Fixed Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-slate-200 p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Zap className="w-6 h-6 text-indigo-600" />
                            Automations
                        </h1>
                        <p className="text-sm text-slate-600 mt-1">
                            {stats.active} active • {stats.paused} paused
                        </p>
                    </div>
                    <Button
                        onClick={() => navigate(createPageUrl('AutomationSetup'))}
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        New
                    </Button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        placeholder="Search automations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                    />
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="w-full grid grid-cols-3">
                        <TabsTrigger value="all" className="text-xs">
                            All ({stats.total})
                        </TabsTrigger>
                        <TabsTrigger value="active" className="text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Active ({stats.active})
                        </TabsTrigger>
                        <TabsTrigger value="paused" className="text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Paused ({stats.paused})
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                {isLoading ? (
                    <div className="text-center py-12">
                        <Zap className="w-12 h-12 mx-auto text-slate-300 animate-pulse" />
                        <p className="text-slate-500 mt-4">Loading...</p>
                    </div>
                ) : filteredAutomations.length === 0 ? (
                    <div className="text-center py-12">
                        <Zap className="w-12 h-12 mx-auto text-slate-300" />
                        <p className="text-slate-500 mt-4">
                            {searchTerm ? 'No automations found' : 'No automations yet'}
                        </p>
                        {!searchTerm && (
                            <Button
                                onClick={() => navigate(createPageUrl('AutomationSetup'))}
                                className="mt-4 bg-indigo-600 hover:bg-indigo-700"
                                size="sm"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Create Your First Automation
                            </Button>
                        )}
                    </div>
                ) : (
                    filteredAutomations.map(automation => (
                        <MobileAutomationCard
                            key={automation.id}
                            automation={automation}
                            onToggle={handleToggle}
                            onView={handleView}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                        />
                    ))
                )}
            </div>

            {/* Quick Actions FAB */}
            <div className="fixed bottom-20 right-4 flex flex-col gap-2">
                <Button
                    onClick={() => navigate(createPageUrl('AutomationMarketplace'))}
                    size="icon"
                    className="h-12 w-12 rounded-full bg-purple-600 hover:bg-purple-700 shadow-lg"
                >
                    <TrendingUp className="w-5 h-5" />
                </Button>
            </div>
        </div>
    );
}