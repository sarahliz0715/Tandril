
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
    Play, Save, Mic, MicOff, Paperclip, X, Sparkles, 
    Package, TrendingUp, MessageSquareCode, Brain, Plus, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { UploadFile } from '@/lib/integrations'; // Added UploadFile import

// Command suggestions organized by category
const commandSuggestions = [
    {
        category: "Inventory Management",
        icon: Package,
        commands: [
            { text: "Find all products with less than 10 in stock", description: "Get low stock alerts" },
            { text: "Update inventory for products in the attached CSV", description: "Bulk inventory update" },
            { text: "Find products that haven't sold in 30 days", description: "Identify slow movers" },
            { text: "Generate purchase orders for low stock items", description: "Automated reordering" }
        ]
    },
    {
        category: "SEO & Marketing", 
        icon: TrendingUp,
        commands: [
            { text: "Update SEO titles for my top 50 selling products", description: "Improve search visibility" },
            { text: "Add 'Limited Time!' to all products on sale", description: "Create urgency" },
            { text: "Generate social media posts for my best sellers", description: "Social media content" },
            { text: "Create product bundles for related items", description: "Increase average order value" }
        ]
    },
    {
        category: "Pricing & Promotions",
        icon: MessageSquareCode,
        commands: [
            { text: "Apply a 15% discount to all winter collection items", description: "Seasonal promotion" },
            { text: "Check if my prices are competitive", description: "Pricing analysis" },
            { text: "Create a flash sale for slow-moving inventory", description: "Clear old stock" },
            { text: "Update prices based on the attached competitor data", description: "Competitive pricing" }
        ]
    }
];

export default function CommandInterface({ onRunCommand, onSaveCommand, isExecuting, initialCommand, platforms = [] }) {
    const [commandText, setCommandText] = useState(initialCommand || '');
    
    // Filter to only show Shopify platforms for now
    const shopifyPlatforms = platforms.filter(p => p.platform_type === 'shopify');
    const [selectedPlatforms, setSelectedPlatforms] = useState(shopifyPlatforms.map(p => p.name));
    
    const [attachedFile, setAttachedFile] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    
    const textareaRef = useRef(null);
    const recognitionRef = useRef(null);
    const fileInputRef = useRef(null);

    // Set initial command from props
    useEffect(() => {
        if (initialCommand) {
            setCommandText(initialCommand);
            if (textareaRef.current) {
                handleTextareaResize({ target: textareaRef.current });
            }
        }
    }, [initialCommand]);

    // Initialize speech recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'en-US';
            
            recognitionRef.current.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setCommandText(prev => prev + ' ' + transcript);
                setIsListening(false);
            };
            
            recognitionRef.current.onerror = () => {
                setIsListening(false);
                toast.error('Voice recognition failed. Please try again.');
            };
            
            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, []);

    const handleFileChange = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            // CORRECTED: Upload the file to get a persistent URL
            const { file_url } = await UploadFile({ file });
            if (!file_url) {
                throw new Error("File upload did not return a URL.");
            }
            
            const fileData = {
                name: file.name,
                size: file.size,
                url: file_url // Use the persistent URL
            };
            setAttachedFile(fileData);
            toast.success(`File "${file.name}" attached successfully`);
        } catch (error) {
            console.error('File attachment error:', error);
            toast.error('Failed to attach file', { description: error.message });
        } finally {
            setIsUploading(false);
        }
    };

    const handleVoiceInput = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            if (recognitionRef.current) {
                setIsListening(true);
                recognitionRef.current.start();
            } else {
                toast.error('Voice recognition not supported in this browser');
            }
        }
    };

    const handleRun = () => {
        if (!commandText.trim()) {
            toast.warning('Please enter a command');
            return;
        }
        
        // Only use Shopify platforms
        if (shopifyPlatforms.length === 0) {
            toast.error('No Shopify store connected', {
                description: 'Please connect your Shopify store first.'
            });
            return;
        }
        
        const targetPlatforms = shopifyPlatforms.filter(p => selectedPlatforms.includes(p.name));

        onRunCommand(commandText, { 
            fileUrl: attachedFile?.url, 
            selectedPlatforms: targetPlatforms
        });
    };

    const handleSave = () => {
        if (!commandText.trim()) {
            toast.warning('Please enter a command to save');
            return;
        }
        onSaveCommand(commandText);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleRun();
        }
    };

    const handleTextareaResize = (e) => {
        const textarea = e.target;
        textarea.style.height = 'auto';
        const maxHeight = 200;
        textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
        textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden';
    };

    const handleSuggestionSelect = (suggestion) => {
        setCommandText(suggestion.text);
        setShowSuggestions(false);
        if (textareaRef.current) {
            textareaRef.current.focus();
        }
    };

    const handleQuickChipClick = (chipText) => {
        const fullCommand = commandSuggestions
            .flatMap(cat => cat.commands)
            .find(cmd => cmd.text.toLowerCase().includes(chipText.toLowerCase()));
        if (fullCommand) {
            handleSuggestionSelect(fullCommand);
        } else {
            setCommandText(chipText);
        }
    };

    return (
        <Card className="bg-white/80 backdrop-blur-sm border-slate-200/60 shadow-lg">
            <CardContent className="p-4 sm:p-6 space-y-4">
                <div className="relative">
                    <Brain className="absolute top-4 left-3 w-5 h-5 text-slate-400 z-10" />
                    <Textarea
                        ref={textareaRef}
                        value={commandText}
                        onChange={(e) => {
                            setCommandText(e.target.value);
                            // Hide suggestions once user starts typing
                            if (e.target.value.trim() !== '') {
                                setShowSuggestions(false);
                            }
                        }}
                        onKeyPress={handleKeyPress}
                        onInput={handleTextareaResize}
                        onFocus={() => {
                            // Show suggestions only if the textarea is empty
                            if (!commandText.trim()) {
                                setShowSuggestions(true);
                            }
                        }}
                        onBlur={() => {
                            // Hide suggestions if textarea is empty and blurred,
                            // but allow click events on suggestions to fire first
                            setTimeout(() => {
                                if (!commandText.trim()) {
                                    setShowSuggestions(false);
                                }
                            }, 100);
                        }}
                        placeholder="e.g., 'Apply a 10% discount to all products in the attached spreadsheet'"
                        className="pl-10 pr-4 py-4 min-h-[70px] sm:min-h-[80px] text-base resize-none overflow-hidden touch-manipulation"
                        disabled={isExecuting || isUploading}
                        style={{ height: 'auto' }}
                    />
                    
                    <div className="absolute top-2 right-2 flex gap-1">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isExecuting || isUploading}
                            className="h-8 w-8 text-slate-400 hover:text-slate-600"
                        >
                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={handleVoiceInput}
                            disabled={isExecuting}
                            className={`h-8 w-8 ${isListening ? 'text-red-500' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </Button>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".csv,.xlsx,.xls,.txt"
                        onChange={handleFileChange}
                    />
                </div>

                {/* Suggestions panel */}
                {showSuggestions && !commandText && (
                    <div className="border rounded-lg bg-white shadow-sm p-4 space-y-4 max-h-80 overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-slate-700">Command Suggestions</h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowSuggestions(false)}
                                className="h-6 w-6"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        <Tabs defaultValue={commandSuggestions[0].category} className="w-full">
                            <TabsList className="grid w-full grid-cols-3 mb-4">
                                {commandSuggestions.map((category) => {
                                    const IconComponent = category.icon;
                                    return (
                                        <TabsTrigger 
                                            key={category.category} 
                                            value={category.category}
                                            className="text-xs flex items-center gap-1"
                                        >
                                            <IconComponent className="w-3 h-3" />
                                            <span className="hidden sm:inline">{category.category.split(' ')[0]}</span>
                                        </TabsTrigger>
                                    );
                                })}
                            </TabsList>
                            {commandSuggestions.map((category) => (
                                <TabsContent key={category.category} value={category.category} className="space-y-2">
                                    {category.commands.map((command, idx) => (
                                        <div
                                            key={idx}
                                            className="p-3 rounded-lg border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50 cursor-pointer transition-colors"
                                            onClick={() => handleSuggestionSelect(command)}
                                        >
                                            <div className="font-medium text-slate-900 text-sm mb-1">
                                                {command.text}
                                            </div>
                                            <div className="text-xs text-slate-600">
                                                {command.description}
                                            </div>
                                        </div>
                                    ))}
                                </TabsContent>
                            ))}
                        </Tabs>
                    </div>
                )}

                {/* Platform selection and controls */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    {shopifyPlatforms.length > 1 && (
                        <div className="flex-1">
                            <Select
                                value={selectedPlatforms.join(',')}
                                onValueChange={(value) => setSelectedPlatforms(value.split(','))}
                                disabled={isExecuting}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Shopify stores" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={shopifyPlatforms.map(p => p.name).join(',')}>
                                        All Shopify Stores ({shopifyPlatforms.length})
                                    </SelectItem>
                                    {shopifyPlatforms.map(platform => (
                                        <SelectItem key={platform.id} value={platform.name}>
                                            {platform.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                    
                    {shopifyPlatforms.length === 0 && (
                        <div className="flex-1 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                            ⚠️ Connect your Shopify store to run commands
                        </div>
                    )}

                    <div className="flex gap-2 sm:gap-3">
                        <Button
                            variant="outline"
                            onClick={handleSave}
                            disabled={isExecuting || !commandText.trim()}
                            className="touch-manipulation"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Save
                        </Button>
                        <Button
                            onClick={handleRun}
                            disabled={isExecuting || !commandText.trim() || shopifyPlatforms.length === 0}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white touch-manipulation"
                        >
                            {isExecuting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Running...
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4 mr-2" />
                                    Run Command
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Attached file */}
                {attachedFile && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <Paperclip className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-blue-800 font-medium flex-1">
                            {attachedFile.name || 'Uploaded file'}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                // BULLETPROOF FIX: Multiple safety checks before URL operations
                                try {
                                    if (attachedFile && 
                                        attachedFile.url && 
                                        typeof attachedFile.url === 'string' && 
                                        attachedFile.url.startsWith('blob:')) {
                                        URL.revokeObjectURL(attachedFile.url);
                                    }
                                } catch (error) {
                                    console.warn('Safe cleanup: Could not revoke object URL', error);
                                }
                                setAttachedFile(null);
                            }}
                            className="h-6 w-6 text-blue-600 hover:text-blue-800"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                )}

                {/* Quick suggestion chips when not showing full suggestions and textarea is empty */}
                {!showSuggestions && !commandText && (
                    <div className="flex flex-wrap gap-2">
                        {[
                            "Find low stock items",
                            "Update SEO titles", 
                            "Apply discount",
                            "Check prices",
                            "Generate social posts"
                        ].map((chip, idx) => (
                            <Button
                                key={idx}
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickChipClick(chip)}
                                className="text-xs h-8 bg-white/80 hover:bg-indigo-50 hover:border-indigo-200 touch-manipulation"
                            >
                                <Sparkles className="w-3 h-3 mr-1" />
                                {chip}
                            </Button>
                        ))}
                    </div>
                )}

                {isListening && (
                    <div className="text-center py-4">
                        <div className="inline-flex items-center gap-2 text-red-600">
                            <div className="animate-pulse w-2 h-2 bg-red-600 rounded-full"></div>
                            <span className="text-sm font-medium">Listening...</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Speak your command clearly</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
