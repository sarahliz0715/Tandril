
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    Mic, MicOff, Send, Paperclip, Zap, Package, TrendingUp, 
    DollarSign, RefreshCw, Plus, X, Volume2, VolumeX
} from 'lucide-react';
import { toast } from 'sonner';

const QUICK_COMMANDS = [
    { text: "Check low stock items", icon: Package, category: "inventory" },
    { text: "Show today's orders", icon: TrendingUp, category: "orders" },
    { text: "Update product prices", icon: DollarSign, category: "pricing" },
    { text: "Sync all platforms", icon: RefreshCw, category: "sync" },
];

export default function MobileCommandInterface({ 
    onSubmit, 
    isLoading, 
    platforms = [],
    value = "",
    onChange 
}) {
    const [isListening, setIsListening] = useState(false);
    const [isSpeechEnabled, setIsSpeechEnabled] = useState(true);
    const [showQuickCommands, setShowQuickCommands] = useState(true);
    const textareaRef = useRef(null);
    const recognitionRef = useRef(null);

    const initializeSpeechRecognition = useCallback(() => {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            setIsSpeechEnabled(false);
            return;
        }

        const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onstart = () => {
            setIsListening(true);
        };

        recognitionRef.current.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            onChange(transcript);
            setIsListening(false);
        };

        recognitionRef.current.onerror = (event) => {
            setIsListening(false);
            if (event.error !== 'aborted') {
                toast.error('Voice recognition failed. Please try again.');
            }
        };

        recognitionRef.current.onend = () => {
            setIsListening(false);
        };
    }, [onChange]); // Added onChange as a dependency

    useEffect(() => {
        initializeSpeechRecognition();
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, [initializeSpeechRecognition]); // Added initializeSpeechRecognition as a dependency

    const startListening = () => {
        if (!recognitionRef.current || !isSpeechEnabled) {
            toast.error('Speech recognition not available on this device.');
            return;
        }

        try {
            recognitionRef.current.start();
        } catch (error) {
            toast.error('Could not start voice recognition.');
        }
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.abort();
        }
        setIsListening(false);
    };

    const handleVoiceToggle = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    const handleSubmit = () => {
        if (!value.trim()) {
            toast.error('Please enter a command.');
            return;
        }
        onSubmit();
    };

    const handleQuickCommand = (command) => {
        onChange(command.text);
        setShowQuickCommands(false);
        // Auto-submit quick commands after a brief delay
        setTimeout(() => {
            onSubmit();
        }, 500);
    };

    const connectedCount = platforms.filter(p => p.status === 'connected').length;

    return (
        <div className="space-y-4">
            {/* Platform Status Bar - Mobile optimized */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">
                        {connectedCount} platform{connectedCount !== 1 ? 's' : ''} connected
                    </span>
                </div>
                {connectedCount === 0 && (
                    <Button size="sm" variant="outline" className="text-xs">
                        <Plus className="w-3 h-3 mr-1" />
                        Connect
                    </Button>
                )}
            </div>

            {/* Quick Commands - Mobile carousel */}
            {showQuickCommands && (
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-medium text-slate-900">Quick Actions</h3>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setShowQuickCommands(false)}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {QUICK_COMMANDS.map((command, index) => (
                                <Button
                                    key={index}
                                    variant="outline"
                                    className="justify-start h-12 text-left"
                                    onClick={() => handleQuickCommand(command)}
                                >
                                    <command.icon className="w-4 h-4 mr-3 flex-shrink-0" />
                                    <span className="truncate">{command.text}</span>
                                </Button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Command Input - Mobile optimized */}
            <Card>
                <CardContent className="p-4 space-y-4">
                    <div className="relative">
                        <Textarea
                            ref={textareaRef}
                            placeholder={isListening ? "Listening..." : "Tell your AI what to do..."}
                            value={value}
                            onChange={(e) => onChange(e.target.value)}
                            className="min-h-[80px] text-base resize-none pr-12"
                            disabled={isLoading || isListening}
                        />
                        
                        {/* Voice Button - Prominent on mobile */}
                        {isSpeechEnabled && (
                            <Button
                                type="button"
                                variant={isListening ? "destructive" : "ghost"}
                                size="icon"
                                className="absolute bottom-2 right-2 h-8 w-8"
                                onClick={handleVoiceToggle}
                                disabled={isLoading}
                            >
                                {isListening ? (
                                    <MicOff className="w-4 h-4" />
                                ) : (
                                    <Mic className="w-4 h-4" />
                                )}
                            </Button>
                        )}
                    </div>

                    {/* Voice Status Indicator */}
                    {isListening && (
                        <div className="flex items-center justify-center gap-2 py-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-sm text-slate-600">Listening... Tap mic to stop</span>
                            <Volume2 className="w-4 h-4 text-red-500" />
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <Button
                            onClick={handleSubmit}
                            disabled={isLoading || !value.trim() || isListening}
                            className="flex-1 h-12 text-base font-medium"
                        >
                            {isLoading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Processing...
                                </div>
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Send Command
                                </>
                            )}
                        </Button>
                        
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-12 w-12"
                            disabled={isLoading}
                        >
                            <Paperclip className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Help Text */}
                    <div className="text-xs text-slate-500 text-center">
                        Try: "Show me products running low on stock" or tap a quick action above
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
