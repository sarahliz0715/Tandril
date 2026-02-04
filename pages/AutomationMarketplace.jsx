import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { AutomationTemplate } from '@/lib/entities';
import { User } from '@/lib/entities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Zap, Search, Star, Clock, TrendingUp, Filter, Sparkles, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import CreateFromTemplateModal from '../components/automations/CreateFromTemplateModal';
import { handleAuthError } from '@/utils/authHelpers';

export default function AutomationMarketplace() {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState([]);
    const [filteredTemplates, setFilteredTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [difficultyFilter, setDifficultyFilter] = useState('all');
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        loadTemplates();
    }, []);

    useEffect(() => {
        filterTemplates();
    }, [templates, searchQuery, categoryFilter, difficultyFilter]);

    const loadTemplates = async () => {
        setIsLoading(true);
        try {
            const currentUser = await User.me();
            setUser(currentUser);

            const templatesData = await AutomationTemplate.list('-is_featured', 100);
            setTemplates(templatesData);
        } catch (error) {
            console.error('Error loading templates:', error);
            if (handleAuthError(error, navigate)) return;
            toast.error('Failed to load automation templates');
        } finally {
            setIsLoading(false);
        }
    };

    const filterTemplates = () => {
        let filtered = [...templates];

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(t =>
                t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }

        // Category filter
        if (categoryFilter !== 'all') {
            filtered = filtered.filter(t => t.category === categoryFilter);
        }

        // Difficulty filter
        if (difficultyFilter !== 'all') {
            filtered = filtered.filter(t => t.difficulty === difficultyFilter);
        }

        setFilteredTemplates(filtered);
    };

    const getDifficultyColor = (difficulty) => {
        switch (difficulty) {
            case 'beginner': return 'bg-green-100 text-green-800 border-green-200';
            case 'intermediate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'advanced': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-slate-100 text-slate-800 border-slate-200';
        }
    };

    const getCategoryIcon = (category) => {
        switch (category) {
            case 'customer_service': return '💬';
            case 'inventory': return '📦';
            case 'marketing': return '📢';
            case 'analytics': return '📊';
            case 'operations': return '⚙️';
            default: return '⚡';
        }
    };

    const featuredTemplates = filteredTemplates.filter(t => t.is_featured);
    const regularTemplates = filteredTemplates.filter(t => !t.is_featured);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Zap className="w-12 h-12 text-indigo-600 animate-pulse mx-auto mb-4" />
                    <p className="text-slate-600">Loading automation marketplace...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 space-y-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Automation Marketplace</h1>
                    <p className="text-slate-600">Pre-built automation templates to save you hours every week</p>
                </div>

                {/* Stats Banner */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600">Total Templates</p>
                                    <p className="text-2xl font-bold text-indigo-900">{templates.length}</p>
                                </div>
                                <Zap className="w-8 h-8 text-indigo-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600">Time Saved/Week</p>
                                    <p className="text-2xl font-bold text-green-900">
                                        {templates.reduce((sum, t) => sum + (t.estimated_time_saved_hours_per_week || 0), 0)}h
                                    </p>
                                </div>
                                <Clock className="w-8 h-8 text-green-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600">Featured</p>
                                    <p className="text-2xl font-bold text-amber-900">{featuredTemplates.length}</p>
                                </div>
                                <Star className="w-8 h-8 text-amber-500" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600">Most Popular</p>
                                    <p className="text-lg font-bold text-blue-900">Daily Sync</p>
                                </div>
                                <TrendingUp className="w-8 h-8 text-blue-600" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="mb-6">
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="Search automations..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                            </div>

                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="border rounded-md px-3 py-2 text-sm"
                            >
                                <option value="all">All Categories</option>
                                <option value="customer_service">Customer Service</option>
                                <option value="inventory">Inventory</option>
                                <option value="marketing">Marketing</option>
                                <option value="analytics">Analytics</option>
                                <option value="operations">Operations</option>
                            </select>

                            <select
                                value={difficultyFilter}
                                onChange={(e) => setDifficultyFilter(e.target.value)}
                                className="border rounded-md px-3 py-2 text-sm"
                            >
                                <option value="all">All Levels</option>
                                <option value="beginner">Beginner</option>
                                <option value="intermediate">Intermediate</option>
                                <option value="advanced">Advanced</option>
                            </select>
                        </div>
                    </CardContent>
                </Card>

                {/* Featured Templates */}
                {featuredTemplates.length > 0 && (
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4">
                            <Star className="w-5 h-5 text-amber-500" />
                            <h2 className="text-2xl font-bold text-slate-900">Featured Automations</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {featuredTemplates.map((template) => (
                                <Card
                                    key={template.id}
                                    className="hover:shadow-xl transition-all duration-200 cursor-pointer border-2 hover:border-indigo-300"
                                    onClick={() => setSelectedTemplate(template)}
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between mb-2">
                                            <span className="text-2xl">{getCategoryIcon(template.category)}</span>
                                            <Badge className={getDifficultyColor(template.difficulty)}>
                                                {template.difficulty}
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-lg">{template.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                                            {template.description}
                                        </p>

                                        <div className="flex items-center gap-2 mb-4">
                                            <Clock className="w-4 h-4 text-green-600" />
                                            <span className="text-sm font-semibold text-green-700">
                                                Saves {template.estimated_time_saved_hours_per_week}h/week
                                            </span>
                                        </div>

                                        {template.tags && (
                                            <div className="flex flex-wrap gap-1 mb-4">
                                                {template.tags.slice(0, 3).map((tag, idx) => (
                                                    <Badge key={idx} variant="outline" className="text-xs">
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}

                                        <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                                            <Sparkles className="w-4 h-4 mr-2" />
                                            Use This Template
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* All Templates */}
                {regularTemplates.length > 0 && (
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-4">All Automation Templates</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {regularTemplates.map((template) => (
                                <Card
                                    key={template.id}
                                    className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-indigo-200"
                                    onClick={() => setSelectedTemplate(template)}
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between mb-2">
                                            <span className="text-2xl">{getCategoryIcon(template.category)}</span>
                                            <Badge className={getDifficultyColor(template.difficulty)}>
                                                {template.difficulty}
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-lg">{template.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                                            {template.description}
                                        </p>

                                        <div className="flex items-center gap-2 mb-4">
                                            <Clock className="w-4 h-4 text-green-600" />
                                            <span className="text-sm font-semibold text-green-700">
                                                Saves {template.estimated_time_saved_hours_per_week}h/week
                                            </span>
                                        </div>

                                        {template.tags && (
                                            <div className="flex flex-wrap gap-1 mb-4">
                                                {template.tags.slice(0, 3).map((tag, idx) => (
                                                    <Badge key={idx} variant="outline" className="text-xs">
                                                        {tag}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}

                                        <Button variant="outline" className="w-full">
                                            Use This Template
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {filteredTemplates.length === 0 && (
                    <Card>
                        <CardContent className="p-12 text-center">
                            <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-slate-900 mb-2">No templates found</h3>
                            <p className="text-slate-600">Try adjusting your search or filters</p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Template Details Modal */}
            {selectedTemplate && (
                <CreateFromTemplateModal
                    template={selectedTemplate}
                    onClose={() => setSelectedTemplate(null)}
                    onSuccess={() => {
                        setSelectedTemplate(null);
                        toast.success('Automation created from template!');
                        navigate(createPageUrl('Automations'));
                    }}
                />
            )}
        </div>
    );
}