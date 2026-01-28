import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { api } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Sparkles,
    Package,
    ShoppingCart,
    Users,
    TrendingUp,
    BarChart3,
    Settings,
    Clock,
    Star,
    Search,
    Filter,
    Zap,
    ChevronRight,
    Loader2,
    Plus
} from 'lucide-react';
import { toast } from 'sonner';

const CATEGORY_ICONS = {
    inventory: Package,
    customer_service: Users,
    marketing: TrendingUp,
    analytics: BarChart3,
    operations: Settings,
    general: Zap
};

const DIFFICULTY_COLORS = {
    beginner: 'bg-green-100 text-green-800 border-green-200',
    intermediate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    advanced: 'bg-red-100 text-red-800 border-red-200'
};

export default function AutomationTemplateGallery({ onSelectTemplate }) {
    const navigate = useNavigate();
    const [templates, setTemplates] = useState([]);
    const [filteredTemplates, setFilteredTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [selectedDifficulty, setSelectedDifficulty] = useState('all');

    useEffect(() => {
        loadTemplates();
    }, []);

    useEffect(() => {
        filterTemplates();
    }, [templates, searchQuery, selectedCategory, selectedDifficulty]);

    const loadTemplates = async () => {
        try {
            const data = await api.entities.AutomationTemplate.list('-is_featured');
            setTemplates(data);
        } catch (error) {
            console.error('Error loading templates:', error);
            toast.error('Failed to load templates');
        } finally {
            setLoading(false);
        }
    };

    const filterTemplates = () => {
        let filtered = [...templates];

        if (searchQuery) {
            filtered = filtered.filter(t =>
                t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }

        if (selectedCategory !== 'all') {
            filtered = filtered.filter(t => t.category === selectedCategory);
        }

        if (selectedDifficulty !== 'all') {
            filtered = filtered.filter(t => t.difficulty === selectedDifficulty);
        }

        setFilteredTemplates(filtered);
    };

    const handleUseTemplate = async (template) => {
        try {
            await api.entities.AutomationTemplate.update(template.id, {
                use_count: (template.use_count || 0) + 1
            });

            if (onSelectTemplate) {
                onSelectTemplate(template);
            } else {
                navigate(createPageUrl(`AutomationSetup?template=${template.id}`));
            }
        } catch (error) {
            console.error('Error using template:', error);
            toast.error('Failed to load template');
        }
    };

    const featuredTemplates = filteredTemplates.filter(t => t.is_featured);
    const otherTemplates = filteredTemplates.filter(t => !t.is_featured);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">Automation Templates</h2>
                        <p className="text-slate-600">Get started quickly with pre-built automation workflows</p>
                    </div>
                    <Button onClick={() => navigate(createPageUrl('AutomationSetup'))} variant="outline">
                        <Plus className="w-4 h-4 mr-2" />
                        Start from Scratch
                    </Button>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Search templates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-full sm:w-48">
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            <SelectItem value="inventory">Inventory</SelectItem>
                            <SelectItem value="customer_service">Customer Service</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                            <SelectItem value="analytics">Analytics</SelectItem>
                            <SelectItem value="operations">Operations</SelectItem>
                            <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                        <SelectTrigger className="w-full sm:w-48">
                            <SelectValue placeholder="Difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Levels</SelectItem>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {featuredTemplates.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                        <h3 className="text-lg font-semibold text-slate-900">Featured Templates</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {featuredTemplates.map(template => (
                            <TemplateCard
                                key={template.id}
                                template={template}
                                onUse={handleUseTemplate}
                                featured
                            />
                        ))}
                    </div>
                </div>
            )}

            {otherTemplates.length > 0 && (
                <div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">
                        {featuredTemplates.length > 0 ? 'More Templates' : 'All Templates'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {otherTemplates.map(template => (
                            <TemplateCard
                                key={template.id}
                                template={template}
                                onUse={handleUseTemplate}
                            />
                        ))}
                    </div>
                </div>
            )}

            {filteredTemplates.length === 0 && (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Search className="w-12 h-12 text-slate-300 mb-3" />
                        <p className="text-slate-500 text-center">
                            No templates found matching your criteria.
                            <br />
                            <Button
                                variant="link"
                                className="mt-2"
                                onClick={() => {
                                    setSearchQuery('');
                                    setSelectedCategory('all');
                                    setSelectedDifficulty('all');
                                }}
                            >
                                Clear filters
                            </Button>
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

function TemplateCard({ template, onUse, featured = false }) {
    const CategoryIcon = CATEGORY_ICONS[template.category] || Zap;

    return (
        <Card className={`group hover:shadow-lg transition-all duration-200 ${featured ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-white' : ''}`}>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between mb-2">
                    <div className="p-2 rounded-lg bg-indigo-100">
                        <CategoryIcon className="w-5 h-5 text-indigo-600" />
                    </div>
                    {featured && (
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                            <Star className="w-3 h-3 mr-1 fill-yellow-500" />
                            Featured
                        </Badge>
                    )}
                </div>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <p className="text-sm text-slate-600 line-clamp-2">{template.description}</p>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
                <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs capitalize">
                        {template.category.replace('_', ' ')}
                    </Badge>
                    <Badge className={`text-xs ${DIFFICULTY_COLORS[template.difficulty]}`}>
                        {template.difficulty}
                    </Badge>
                </div>

                <div className="flex items-center gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Saves {template.estimated_time_saved_hours_per_week}h/week</span>
                    </div>
                    {template.use_count > 0 && (
                        <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            <span>{template.use_count} uses</span>
                        </div>
                    )}
                </div>

                <div className="pt-2 border-t">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-700">Workflow:</span>
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                            <Zap className="w-3 h-3 text-indigo-600" />
                            <span className="capitalize">{template.trigger_template?.trigger_type?.replace(/_/g, ' ')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-600">
                            <ChevronRight className="w-3 h-3 text-slate-400" />
                            <span>{template.actions_template?.length || 0} actions</span>
                        </div>
                    </div>
                </div>

                <Button
                    onClick={() => onUse(template)}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 group-hover:bg-indigo-700"
                >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Use This Template
                </Button>
            </CardContent>
        </Card>
    );
}