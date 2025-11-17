import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Sparkles, Mic, MicOff, Send, Loader2, Lightbulb, Target, TrendingUp, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function EnhancedCommandInterface({ onRunCommand, isExecuting, platforms }) {
    const [command, setCommand] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [commandHistory, setCommandHistory] = useState([]);
    const [recognition, setRecognition] = useState(null);

    // Smart command suggestions based on business context
    const smartSuggestions = [
        {
            text: "Find products with less than 10 in stock and suggest reorder quantities",
            category: "Inventory Management",
            icon: Target,
            urgency: "high"
        },
        {
            text: "Update SEO titles for my top 20 selling products to include trending keywords",
            category: "SEO Optimization", 
            icon: TrendingUp,
            urgency: "medium"
        },
        {
            text: "Create urgency messaging for products with high inventory but low sales velocity",
            category: "Sales Optimization",
            icon: Sparkles,
            urgency: "high"
        },
        {
            text: "Analyze competitor pricing for my electronics category and suggest price adjustments",
            category: "Pricing Strategy",
            icon: TrendingUp,
            urgency: "medium"
        },
        {
            text: "Generate product bundles for items frequently bought together",
            category: "Revenue Growth",
            icon: Lightbulb,
            urgency: "high"
        }
    ];

    const generateSmartSuggestions = useCallback(async (inputText) => {
        // AI-powered command enhancement suggestions
        const contextualSuggestions = smartSuggestions.filter(suggestion => {
            const keywords = inputText.toLowerCase().split(' ');
            return keywords.some(keyword => 
                suggestion.text.toLowerCase().includes(keyword) ||
                suggestion.category.toLowerCase().includes(keyword)
            );
        });

        setSuggestions(contextualSuggestions);
    }, [smartSuggestions]);

    useEffect(() => {
        // Setup advanced voice recognition
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognitionInstance = new SpeechRecognition();
            
            recognitionInstance.continuous = false;
            recognitionInstance.interimResults = true;
            recognitionInstance.lang = 'en-US';
            recognitionInstance.maxAlternatives = 3;

            recognitionInstance.onstart = () => setIsListening(true);
            recognitionInstance.onend = () => setIsListening(false);
            
            recognitionInstance.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join('');
                setCommand(transcript);
                
                // Auto-suggest improvements to voice commands
                if (event.results[0].isFinal) {
                    generateSmartSuggestions(transcript);
                }
            };

            recognitionInstance.onerror = () => {
                setIsListening(false);
                toast.error('Voice recognition failed. Please try typing instead.');
            };

            setRecognition(recognitionInstance);
        }

        // Load command history
        const savedHistory = localStorage.getItem('tandril_command_history');
        if (savedHistory) {
            setCommandHistory(JSON.parse(savedHistory));
        }
    }, [generateSmartSuggestions]);

    const startListening = () => {
        if (recognition) {
            setCommand('');
            recognition.start();
        } else {
            toast.error('Speech recognition not supported in this browser');
        }
    };

    const stopListening = () => {
        if (recognition) {
            recognition.stop();
        }
    };

    const handleSubmit = async () => {
        if (!command.trim()) {
            toast.warning('Please enter a command');
            return;
        }

        // Save to history
        const newHistory = [command, ...commandHistory.slice(0, 9)]; // Keep last 10
        setCommandHistory(newHistory);
        localStorage.setItem('tandril_command_history', JSON.stringify(newHistory));

        // Execute command
        await onRunCommand(command);
        setCommand('');
        setSuggestions([]);
    };

    const handleUseSuggestion = (suggestionText) => {
        setCommand(suggestionText);
        setSuggestions([]);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            handleSubmit();
        }
    };

    return (
        <div className="space-y-6">
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200 shadow-lg">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3 text-xl">
                        <Bot className="w-6 h-6 text-blue-600" />
                        Enhanced AI Command Center
                        <Badge className="bg-blue-600 text-white">Beta</Badge>
                    </CardTitle>
                    <p className="text-slate-600">
                        Tell me what you want to accomplish. I'll create an intelligent plan and execute it across your platforms.
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Enhanced Command Input */}
                    <div className="relative">
                        <Textarea
                            value={command}
                            onChange={(e) => {
                                setCommand(e.target.value);
                                if (e.target.value.length > 10) {
                                    generateSmartSuggestions(e.target.value);
                                }
                            }}
                            onKeyPress={handleKeyPress}
                            placeholder="e.g., 'Find all products with less than 5 in stock and create reorder recommendations' or 'Update SEO for my winter collection with trending keywords'"
                            className="min-h-[100px] pr-20 text-base resize-none"
                            disabled={isExecuting}
                        />
                        <div className="absolute bottom-3 right-3 flex gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={isListening ? stopListening : startListening}
                                disabled={isExecuting}
                                className={isListening ? 'text-red-500 bg-red-50' : 'text-slate-400'}
                            >
                                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={isExecuting || !command.trim()}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {isExecuting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                    </div>

                    {isListening && (
                        <div className="text-center">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                Listening... speak your command clearly
                            </div>
                        </div>
                    )}

                    {/* Connected Platforms */}
                    {platforms.length > 0 && (
                        <div className="flex flex-wrap gap-2 items-center">
                            <span className="text-sm text-slate-600 font-medium">Connected to:</span>
                            {platforms.map((platform) => (
                                <Badge key={platform.id} variant="outline" className="bg-white">
                                    {platform.name}
                                </Badge>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* AI-Powered Suggestions */}
            {suggestions.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Lightbulb className="w-5 h-5 text-yellow-500" />
                            AI Suggestions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {suggestions.map((suggestion, index) => (
                            <div
                                key={index}
                                onClick={() => handleUseSuggestion(suggestion.text)}
                                className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors group"
                            >
                                <div className="flex items-start gap-3">
                                    <suggestion.icon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-medium text-slate-700">{suggestion.category}</span>
                                            <Badge 
                                                className={`text-xs ${
                                                    suggestion.urgency === 'high' ? 'bg-red-100 text-red-700' :
                                                    suggestion.urgency === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-blue-100 text-blue-700'
                                                }`}
                                            >
                                                {suggestion.urgency} priority
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-slate-600 group-hover:text-slate-900">
                                            {suggestion.text}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Command History */}
            {commandHistory.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Recent Commands</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {commandHistory.slice(0, 3).map((pastCommand, index) => (
                                <div
                                    key={index}
                                    onClick={() => setCommand(pastCommand)}
                                    className="p-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded cursor-pointer transition-colors"
                                >
                                    "{pastCommand}"
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Smart Command Templates */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Sparkles className="w-5 h-5 text-purple-500" />
                        Smart Templates
                    </CardTitle>
                    <p className="text-sm text-slate-600">High-impact commands for your business</p>
                </CardHeader>
                <CardContent className="space-y-3">
                    {smartSuggestions.slice(0, 3).map((template, index) => (
                        <div
                            key={index}
                            onClick={() => handleUseSuggestion(template.text)}
                            className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors group"
                        >
                            <div className="flex items-start gap-3">
                                <template.icon className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-sm font-medium text-slate-700">{template.category}</span>
                                        {template.urgency === 'high' && (
                                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-600 group-hover:text-slate-900">
                                        {template.text}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}