import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from '@/utils';
import { User } from '@/api/entities';
import ChatInterface from '../components/advisor/ChatInterface';
import AIAvatar from '../components/advisor/AIAvatar';
import { useAIAdvisorConversations } from '@/hooks/useAIAdvisorConversations';
import DashboardAdvisor from '../components/dashboard/DashboardAdvisor';
import { agentSDK } from "@/agents";
import { handleAuthError } from '@/utils/authHelpers';
import { useConfirmDialog, ConfirmDialog } from '@/hooks/useConfirmDialog';
import { NoDataEmptyState } from '../components/common/EmptyState';

// shadcn/ui components
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// lucide-react icons
import { Loader2, Plus, Trash2, MessageSquare, AlertCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

// Conversation List Component
const ConversationList = ({ conversations, selectedId, onSelect, onNewChat, onDelete }) => {
    if (conversations.length === 0) {
        return (
            <div className="flex flex-col h-full bg-slate-50 border-r">
                <div className="p-4 border-b">
                    <h2 className="text-xl font-bold text-slate-900">Conversations</h2>
                    <p className="text-sm text-slate-500">Your chat history with Orion.</p>
                </div>
                <div className="p-4 border-b">
                    <Button className="w-full" onClick={onNewChat}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Chat
                    </Button>
                </div>
                <div className="flex-1 flex items-center justify-center p-6">
                    <NoDataEmptyState
                        entityName="Conversations"
                        onCreate={onNewChat}
                    />
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 border-r">
            <div className="p-4 border-b">
                <h2 className="text-xl font-bold text-slate-900">Conversations</h2>
                <p className="text-sm text-slate-500">Your chat history with Orion.</p>
            </div>
            <div className="p-4 border-b">
                <Button className="w-full" onClick={onNewChat}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Chat
                </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
                {conversations.map((convo) => (
                    <div
                        key={convo.id}
                        onClick={() => onSelect(convo.id)}
                        className={`relative flex items-center justify-between p-3 cursor-pointer hover:bg-slate-100 transition-colors duration-150 group
                                    ${selectedId === convo.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700'}`}
                    >
                        <div className="flex-1 min-w-0 pr-8">
                            <p className="truncate text-sm">
                                {convo.metadata?.name || `Chat ${new Date(convo.created_at).toLocaleDateString()}`}
                            </p>
                            <p className="text-xs text-slate-500 truncate mt-1">
                                {convo.last_message || 'Start a new conversation'}
                            </p>
                        </div>
                        {selectedId === convo.id && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(convo.id);
                                }}
                                className="absolute right-3 p-1 rounded-full text-slate-400 hover:bg-red-100 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Delete conversation"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function AIAdvisor() {
    const [isLoadingUser, setIsLoadingUser] = useState(true);
    const [user, setUser] = useState(null);
    const location = useLocation();
    const navigate = useNavigate();
    const { isOpen, config, confirm, cancel } = useConfirmDialog();
    
    const searchParams = new URLSearchParams(location.search);
    const conversationIdFromUrl = searchParams.get('conversationId');

    // Use the custom hook for conversation management logic
    const {
        conversations,
        selectedConversationId,
        createNewConversation,
        handleConversationSelect,
        handleConversationDelete: originalHandleConversationDelete,
        initialPrompt,
        setInitialPrompt,
        loadingConversations,
        error: conversationsError
    } = useAIAdvisorConversations(conversationIdFromUrl, navigate);

    // Memoize beta access check
    const hasBetaAccess = useMemo(() => {
        return user && user.user_mode === 'beta';
    }, [user]);

    // Load user data
    const loadUserData = useCallback(async () => {
        setIsLoadingUser(true);
        try {
            const currentUser = await User.me();
            setUser(currentUser);
        } catch (error) {
            console.error('Error loading user data:', error);
            
            if (handleAuthError(error, navigate, { showToast: true })) {
                return;
            }

            toast.error("Failed to load user data", {
                description: "Please try refreshing the page."
            });
        } finally {
            setIsLoadingUser(false);
        }
    }, [navigate]);

    useEffect(() => {
        loadUserData();
    }, [loadUserData]);

    // Wrapped delete handler with confirmation dialog
    const handleConversationDelete = useCallback(async (conversationId) => {
        const conversation = conversations.find(c => c.id === conversationId);
        const conversationName = conversation?.metadata?.name || 
                                `Chat from ${new Date(conversation?.created_at).toLocaleDateString()}`;

        await confirm({
            title: 'Delete Conversation?',
            description: `Are you sure you want to delete "${conversationName}"? This action cannot be undone.`,
            confirmText: 'Delete',
            variant: 'destructive',
            onConfirm: async () => {
                try {
                    await originalHandleConversationDelete(conversationId);
                    toast.success("Conversation deleted");
                } catch (error) {
                    console.error('Error deleting conversation:', error);
                    
                    if (handleAuthError(error, navigate)) {
                        return;
                    }

                    toast.error("Failed to delete conversation", {
                        description: "Please try again."
                    });
                }
            }
        });
    }, [conversations, confirm, originalHandleConversationDelete, navigate]);

    // Combine loading states for a single loading screen
    const overallLoading = isLoadingUser || loadingConversations;

    // Show error if conversations failed to load
    useEffect(() => {
        if (conversationsError && !overallLoading) {
            toast.error("Failed to load conversations", {
                description: "Please try refreshing the page."
            });
        }
    }, [conversationsError, overallLoading]);

    if (overallLoading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                    <p className="text-lg font-medium text-slate-600">Loading AI Advisor...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="h-screen flex items-center justify-center p-6">
                <Card className="max-w-md">
                    <CardContent className="p-6 text-center">
                        <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
                        <p className="text-slate-600 mb-4">Unable to load AI Advisor</p>
                        <Button onClick={loadUserData}>
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col">
            {/* Beta Banner - only shows if needed */}
            {hasBetaAccess && (
                <Alert className="m-4 mb-0 border-blue-200 bg-blue-50">
                    <Sparkles className="h-4 w-4 text-blue-600" />
                    <AlertTitle className="text-blue-900">Beta Feature</AlertTitle>
                    <AlertDescription className="text-blue-700">
                        Orion is your AI business advisor. Ask questions about your Shopify store, get strategic advice, or request help with specific tasks.
                    </AlertDescription>
                </Alert>
            )}

            <div className="flex-1 flex min-h-0">
                {/* Desktop Conversations sidebar - Always visible on desktop */}
                <div className="hidden lg:flex w-80 border-r bg-slate-50/50 flex-col">
                    <ConversationList
                        conversations={conversations}
                        selectedId={selectedConversationId}
                        onSelect={handleConversationSelect}
                        onNewChat={createNewConversation}
                        onDelete={handleConversationDelete}
                    />
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Mobile Header - Only visible on mobile */}
                    <div className="lg:hidden border-b bg-white p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">AI Advisor</h2>
                            <Button onClick={() => createNewConversation()} size="sm">
                                <Plus className="w-4 h-4 mr-2" />
                                New Chat
                            </Button>
                        </div>
                        {conversations.length > 0 ? (
                            <Select value={selectedConversationId || ''} onValueChange={handleConversationSelect}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select conversation..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {conversations.map((conv) => (
                                        <SelectItem key={conv.id} value={conv.id}>
                                            {conv.metadata?.name || `Chat ${new Date(conv.created_at).toLocaleDateString()}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Alert>
                                <AlertDescription>
                                    No conversations yet. Start a new chat below!
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                    
                    {/* Chat/Welcome Area - takes all remaining space */}
                    <div className="flex-1 bg-white min-h-0">
                         {selectedConversationId ? (
                            <ChatInterface 
                                key={selectedConversationId}
                                conversationId={selectedConversationId}
                                initialPrompt={initialPrompt}
                                onPromptUsed={() => setInitialPrompt('')}
                                user={user}
                            />
                        ) : (
                            <div className="h-full flex items-center justify-center p-8 overflow-y-auto">
                               <div className="w-full max-w-2xl">
                                    <DashboardAdvisor />
                               </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <ConfirmDialog isOpen={isOpen} config={config} onCancel={cancel} />
        </div>
    );
}