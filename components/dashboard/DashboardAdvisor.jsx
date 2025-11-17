
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Sparkles, Mic, MicOff } from 'lucide-react';
import { createPageUrl } from '@/utils';
import AIAvatar from '../advisor/AIAvatar';
import { toast } from 'sonner';
import { User } from '@/api/entities';

export default function DashboardAdvisor() {
    const navigate = useNavigate();
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const recognitionRef = useRef(null);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                await User.me();
                setIsAuthenticated(true);
            } catch (error) {
                if (error.response?.status === 401) {
                    console.log('User not authenticated in DashboardAdvisor');
                    navigate(createPageUrl('Home'));
                    return;
                }
                console.error('Error checking auth in DashboardAdvisor:', error);
            } finally {
                setLoading(false);
            }
        };
        checkAuth();
    }, [navigate]);

    const handleStartConversation = useCallback((prompt) => {
        if (!prompt || !prompt.trim()) return;
        const url = createPageUrl(`AIAdvisor?prompt=${encodeURIComponent(prompt)}`);
        navigate(url);
    }, [navigate]);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'en-US';
            
            recognitionRef.current.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                handleStartConversation(transcript);
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
    }, [handleStartConversation]);

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

    const suggestedPrompts = [
        "What are my top 3 growth opportunities?",
        "Analyze my best-selling products.",
        "Draft a marketing email for my new collection.",
        "Summarize last week's performance."
    ];

    const handleSubmit = (e) => {
        e.preventDefault();
        if (input.trim()) {
            handleStartConversation(input.trim());
        }
    };

    if (loading || !isAuthenticated) {
        return null; // Don't render anything while loading or if user is not authenticated
    }

    return (
        <Card className="bg-white/80 backdrop-blur-sm shadow-lg">
            <CardHeader className="p-4 sm:p-6 flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-lg sm:text-xl">
                    <AIAvatar size="md" />
                    <div>
                        <span className="text-slate-900">AI Business Advisor</span>
                        <p className="text-sm font-normal text-slate-500">Ready for your questions</p>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
                <form onSubmit={handleSubmit} className="relative mb-4">
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask me anything about your business..."
                        className="pr-24 min-h-[60px]"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                handleSubmit(e);
                            }
                        }}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={handleVoiceInput}
                            className={`h-8 w-8 ${isListening ? 'text-red-500' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                        </Button>
                        <Button
                            type="submit"
                            size="icon"
                            className="w-8 h-8 bg-indigo-600 hover:bg-indigo-700"
                            disabled={!input.trim()}
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                </form>
                <div className="flex flex-wrap gap-2">
                    {suggestedPrompts.map((prompt, i) => (
                        <Button
                            key={i}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => handleStartConversation(prompt)}
                        >
                            <Sparkles className="w-3 h-3 mr-2" />
                            {prompt}
                        </Button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
