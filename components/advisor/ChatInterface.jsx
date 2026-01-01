import React, { useState, useEffect, useCallback } from 'react';
import { agentSDK } from "@/agents";
import { User } from '@/api/entities';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Bot } from 'lucide-react';
import { toast } from 'sonner';
import MessageBubble from './MessageBubble';
import AIAvatar from './AIAvatar';
import { updateUserMemory } from '@/api/functions';

// Custom hook to manage AI advisor conversations
export const useAIAdvisorConversations = ({ conversationId, user }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [conversation, setConversation] = useState(null);
    const [streamingMessage, setStreamingMessage] = useState(''); // New state for streaming AI responses
    const [attachedFiles, setAttachedFiles] = useState([]); // New state for file attachments
    const navigate = useNavigate();

    // Effect to load conversation history and subscribe to updates
    useEffect(() => {
        // If conversationId is 'new', reset states for a fresh chat
        if (conversationId === 'new') {
            setMessages([]);
            setIsLoading(false);
            setConversation(null); // No existing conversation data for a new chat
            setStreamingMessage('');
            setAttachedFiles([]);
            return;
        }

        // If conversationId is not provided, do nothing
        if (!conversationId) return;

        setIsLoading(true);
        setMessages([]); // Clear messages when loading a new conversation
        setConversation(null); // Clear conversation state on ID change
        setStreamingMessage('');
        setAttachedFiles([]);

        const loadAndSubscribe = async () => {
            try {
                // Authentication check before loading conversation
                await User.me(); 

                const conv = await agentSDK.getConversation(conversationId);
                setConversation(conv);
                setMessages(conv.messages || []);
                setIsLoading(false);

                // Subscribe to real-time conversation updates
                const unsubscribe = agentSDK.subscribeToConversation(conversationId, (data) => {
                    setMessages(data.messages || []);
                });
                return unsubscribe;
            } catch (error) {
                if (error.response?.status === 401) {
                    toast.error("You are not authenticated. Redirecting to home.");
                    navigate(createPageUrl('Home'));
                } else {
                    console.error("Error loading conversation:", error);
                    toast.error("Failed to load conversation history.");
                }
                setIsLoading(false);
                return () => {}; // Return a no-op function for unsubscribe
            }
        };

        let unsubscribePromise = loadAndSubscribe();
        
        // Cleanup function for useEffect
        return () => {
            unsubscribePromise.then(unsubscribe => {
                if (typeof unsubscribe === 'function') unsubscribe();
            });
        };
    }, [conversationId, navigate]);

    // Function to check for memory-worthy information in user messages
    const checkForMemoryUpdates = useCallback(async (userMessage) => {
        const memoryTriggers = [
            /remind me to (.+)/i,
            /my wife['']?s name is (.+)/i,
            /my husband['']?s name is (.+)/i,
            /my birthday is (.+)/i,
            /i prefer (.+)/i,
            /my goal is (.+)/i,
            /i want to remember (.+)/i
        ];

        for (const trigger of memoryTriggers) {
            const match = userMessage.match(trigger);
            if (match) {
                try {
                    let memoryItem;
                    
                    if (trigger.source.includes('remind me')) {
                        memoryItem = {
                            type: 'reminder',
                            content: match[1],
                        };
                    } else if (trigger.source.includes('wife') || trigger.source.includes('husband')) {
                        memoryItem = {
                            type: 'fact',
                            key: trigger.source.includes('wife') ? 'wife_name' : 'husband_name',
                            value: match[1],
                            content: `User's ${trigger.source.includes('wife') ? 'wife' : 'husband'} is named ${match[1]}`
                        };
                    } else if (trigger.source.includes('birthday')) {
                        memoryItem = {
                            type: 'fact',
                            key: 'birthday',
                            value: match[1],
                            content: `User's birthday is ${match[1]}`
                        };
                    } else { // Generic preference, goal, or "i want to remember"
                        memoryItem = {
                            type: 'preference', // A more general category for these
                            content: match[1] // Extract the content after the trigger phrase
                        };
                    }

                    await updateUserMemory({ memory_item: memoryItem });
                    toast.success('💭 Saved to memory');
                } catch (error) {
                    console.error('Failed to save memory:', error);
                }
                // Break after the first match to avoid multiple memory saves for one message
                break; 
            }
        }
    }, []); // No dependencies needed as it only uses passed parameters

    // Handler for sending messages - now accepts content and file URLs explicitly
    const handleSendMessage = useCallback(async (messageContent, messageFileUrls = []) => {
        const trimmedContent = messageContent.trim();
        if ((!trimmedContent && messageFileUrls.length === 0) || isLoading) return;

        setIsLoading(true);
        setInput(''); // Clear input immediately for better UX
        setStreamingMessage(''); // Reset streaming message
        setAttachedFiles([]); // Clear attached files

        try {
            if (conversationId === 'new') {
                // First message of a new chat: create conversation, then add message
                const newConversation = await agentSDK.createConversation({
                    agent_name: 'business_advisor',
                    metadata: {
                        name: `Chat: ${trimmedContent.substring(0, 30)}...`, // Name based on first message
                        user_id: user?.id, // Pass user ID from props for new conversation
                    }
                });
                
                // Immediately add the user's message to the local state for a snappy UI
                const tempMessage = { role: 'user', content: trimmedContent, created_date: new Date().toISOString(), file_urls: messageFileUrls };
                setMessages([tempMessage]);
                
                // Add message to the newly created conversation
                await agentSDK.addMessage(newConversation, tempMessage);
                
                // Navigate to the new chat URL and show a toast
                navigate(createPageUrl('AIAdvisor', { conversationId: newConversation.id }));
                toast.success('New conversation created!');

                // Check for memory updates after message is 'sent'
                await checkForMemoryUpdates(trimmedContent);

            } else {
                // Existing conversation: just add the message
                // Use conversation object if loaded, fallback to {id: conversationId}
                await agentSDK.addMessage(conversation || { id: conversationId }, {
                    role: 'user',
                    content: trimmedContent,
                    file_urls: messageFileUrls,
                });

                // Check for memory updates after message is 'sent'
                await checkForMemoryUpdates(trimmedContent);
            }
        } catch (error) {
            if (error.response?.status === 401) {
                toast.error("Authentication required to send messages. Redirecting to home.");
                navigate(createPageUrl('Home'));
            } else {
                toast.error("Failed to send message. Please try again.");
                console.error("Send message error:", error);
                setInput(trimmedContent); // Restore input on error
                setAttachedFiles(messageFileUrls); // Restore attached files on error
            }
        } finally {
            setIsLoading(false);
        }
    }, [conversationId, conversation, user, navigate, checkForMemoryUpdates, isLoading]); // Added isLoading to dependencies

    return {
        messages,
        input,
        setInput,
        isLoading,
        conversation,
        handleSendMessage,
        streamingMessage,
        setStreamingMessage,
        attachedFiles,
        setAttachedFiles,
    };
};

export default function ChatInterface({ conversationId, initialPrompt, onPromptUsed, user }) {
    // Use the custom hook to manage conversation logic
    const { 
        messages, 
        input, 
        setInput, 
        isLoading, 
        conversation, 
        handleSendMessage,
        streamingMessage,
        setStreamingMessage,
        attachedFiles,
        setAttachedFiles,
    } = useAIAdvisorConversations({ conversationId, user });

    // Effect to handle initial prompts (e.g., from suggestion chips)
    useEffect(() => {
        if (initialPrompt) {
            setInput(initialPrompt);
            onPromptUsed(); // Notify parent component that the prompt has been used
        }
    }, [initialPrompt, onPromptUsed, setInput]);
    
    // Ref for controlling scroll behavior
    const scrollAreaRef = React.useRef(null);

    // Effect to scroll to the bottom of the chat when new messages arrive
    useEffect(() => {
        if (scrollAreaRef.current) {
            const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (viewport) {
                setTimeout(() => {
                    viewport.scrollTop = viewport.scrollHeight;
                }, 100); // Small delay to ensure content is rendered before scrolling
            }
        }
    }, [messages, streamingMessage]); // Also scroll when streaming message updates

    return (
        <div className="flex flex-col h-full bg-white">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <AIAvatar />
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                                {/* Display conversation name or default for new/Orion */}
                                {conversationId === 'new' ? 'New Conversation' : conversation?.metadata?.name || 'Orion'}
                            </h3>
                            <p className="text-xs text-slate-500">Your strategic business partner</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <ScrollArea className="flex-1 p-4 sm:p-6" ref={scrollAreaRef}>
                {isLoading && messages.length === 0 && !streamingMessage ? ( // Show loading spinner if initially loading and no messages/streaming
                    <div className="flex items-center justify-center py-8 h-full">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-400 mr-2" />
                        <span className="text-slate-500">Loading conversation...</span>
                    </div>
                ) : (
                    <div className="space-y-6 max-w-4xl mx-auto">
                        {messages.length > 0 ? ( // Display messages if available
                            messages.map((msg, index) => (
                                <MessageBubble key={`${conversationId}-${index}-${msg.created_at}`} message={msg} />
                            ))
                        ) : (
                            // Empty state with introductory message and suggestion chips
                            <div className="text-center py-8 h-full flex flex-col justify-center">
                                <Bot className="mx-auto h-12 w-12 text-slate-300" />
                                <h3 className="mt-4 text-lg font-medium text-slate-900">Hello! I'm Orion, your AI Business Advisor</h3>
                                <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">I'm here to help you grow your business. You can type your questions or select a prompt below.</p>
                                
                                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
                                    <button 
                                        onClick={() => setInput("Analyze my store and suggest the top 5 best things to automate")}
                                        className="p-3 text-left text-sm bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                                    >
                                        "Suggest top 5 automations for my store"
                                    </button>
                                    <button 
                                        onClick={() => setInput("What are my top opportunities for growth right now?")}
                                        className="p-3 text-left text-sm bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                                    >
                                        "What are my top opportunities for growth?"
                                    </button>
                                    <button 
                                        onClick={() => setInput("Analyze my best-selling products and suggest improvements")}
                                        className="p-3 text-left text-sm bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                                    >
                                        "Analyze my best-selling products"
                                    </button>
                                    <button 
                                        onClick={() => setInput("Help me create a 90-day business growth plan")}
                                        className="p-3 text-left bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors text-sm"
                                    >
                                        "Create a 90-day growth plan"
                                    </button>
                                </div>
                            </div>
                        )}
                        {/* Thinking indicator for AI response */}
                        {isLoading && messages.length > 0 && !streamingMessage && (
                            <div className="flex gap-3">
                                <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center mt-0.5">
                                    <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                                </div>
                                <div className="rounded-2xl px-4 py-2.5 bg-white border border-slate-200 flex items-center">
                                    <Loader2 className="w-4 h-4 text-slate-500 animate-spin mr-2" />
                                    <span className="text-sm text-slate-500">Thinking...</span>
                                </div>
                            </div>
                        )}
                        {/* Streaming message from AI */}
                        {streamingMessage && (
                            <div className="flex gap-3">
                                <div className="h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center mt-0.5 flex-shrink-0">
                                    <Bot className="h-4 w-4 text-slate-500" />
                                </div>
                                <div className="rounded-2xl px-4 py-2.5 bg-white border border-slate-200 flex-1 min-w-0">
                                    <span className="text-sm text-slate-700 break-words whitespace-pre-wrap">{streamingMessage}</span>
                                    <span className="animate-pulse text-sm text-slate-500">_</span> {/* Cursor effect */}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </ScrollArea>

            <div className="p-4 border-t border-slate-200 flex-shrink-0 bg-white">
                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(input, attachedFiles); }} className="relative max-w-4xl mx-auto">
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(input, attachedFiles);
                            }
                        }}
                        placeholder={"Ask me anything about your business..."}
                        className="pr-12 min-h-[60px] max-h-[200px] resize-none"
                        disabled={isLoading}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
                        <Button
                            type="submit"
                            size="icon"
                            className="w-8 h-8 bg-indigo-600 hover:bg-indigo-700"
                            disabled={(!input.trim() && attachedFiles.length === 0) || isLoading}
                        >
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}