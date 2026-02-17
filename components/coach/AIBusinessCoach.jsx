import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Zap,
  TrendingUp,
  AlertTriangle,
  Send,
  Loader2,
  Sparkles,
  Sun,
  Target,
  Shield,
  MessageSquare,
  RefreshCw,
  CheckCircle,
  ArrowRight,
  DollarSign,
  Paperclip,
  Mic,
  X,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/apiClient';
import { supabase } from '@/lib/supabaseClient';

export default function AIBusinessCoach() {
  const [activeTab, setActiveTab] = useState('chat');
  const [briefing, setBriefing] = useState(null);
  const [opportunities, setOpportunities] = useState([]);
  const [risks, setRisks] = useState([]);
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);
  const [isOpportunitiesLoading, setIsOpportunitiesLoading] = useState(false);
  const [isRisksLoading, setIsRisksLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const loadedTabsRef = useRef(new Set());

  // Load most recent conversation history on mount
  useEffect(() => {
    loadRecentHistory();
  }, []);

  const loadRecentHistory = async () => {
    setIsHistoryLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get the most recent conversation
      const { data: conversations } = await supabase
        .from('orion_conversations')
        .select('id')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (!conversations || conversations.length === 0) return;

      const latestConvId = conversations[0].id;
      setConversationId(latestConvId);

      // Load its messages
      const { data: messages } = await supabase
        .from('orion_messages')
        .select('role, content, created_at')
        .eq('conversation_id', latestConvId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(50);

      if (messages && messages.length > 0) {
        setChatMessages(messages.map(m => ({ role: m.role, content: m.content })));
      }
    } catch (error) {
      console.error('[Orion] Failed to load history:', error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const startNewConversation = () => {
    setConversationId(null);
    setChatMessages([]);
  };

  // Auto-load each tab's data the first time the user visits it
  useEffect(() => {
    if (activeTab === 'briefing' && !loadedTabsRef.current.has('briefing')) {
      loadedTabsRef.current.add('briefing');
      loadBriefing();
    } else if (activeTab === 'opportunities' && !loadedTabsRef.current.has('opportunities')) {
      loadedTabsRef.current.add('opportunities');
      loadOpportunities();
    } else if (activeTab === 'risks' && !loadedTabsRef.current.has('risks')) {
      loadedTabsRef.current.add('risks');
      loadRisks();
    }
  }, [activeTab]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const loadBriefing = async () => {
    setIsBriefingLoading(true);
    try {
      const data = await api.functions.invoke('daily-business-briefing', {});
      setBriefing(data.data || data);
    } catch (error) {
      console.error('Failed to load briefing:', error);
    } finally {
      setIsBriefingLoading(false);
    }
  };

  const loadOpportunities = async () => {
    setIsOpportunitiesLoading(true);
    try {
      const data = await api.functions.invoke('growth-opportunity-detector', {});
      setOpportunities(data.data?.opportunities || data.opportunities || []);
    } catch (error) {
      console.error('Failed to load opportunities:', error);
    } finally {
      setIsOpportunitiesLoading(false);
    }
  };

  const loadRisks = async () => {
    setIsRisksLoading(true);
    try {
      const data = await api.functions.invoke('risk-alert-analyzer', {});
      setRisks(data.data?.risks || data.risks || []);
    } catch (error) {
      console.error('Failed to load risks:', error);
    } finally {
      setIsRisksLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() && uploadedFiles.length === 0) return;

    const userMessage = chatInput.trim();
    setChatInput('');

    const filesDisplay = uploadedFiles.length > 0
      ? `\n📎 ${uploadedFiles.map(f => f.name).join(', ')}`
      : '';

    setChatMessages(prev => [...prev, { role: 'user', content: userMessage + filesDisplay }]);
    setIsChatLoading(true);

    try {
      const response = await api.functions.chatWithCoach({
        message: userMessage,
        conversation_id: conversationId,
        uploaded_files: uploadedFiles,
      });

      console.log('[Orion] Got response:', response);
      console.log('[AI Coach] Response keys:', response ? Object.keys(response) : 'null/undefined');

      if (response && response.success) {
        setChatMessages((prev) => [
          ...prev,
          { role: 'assistant', content: response.response },
        ]);
        // Persist the conversation ID returned by the Edge Function
        if (response.conversation_id) {
          setConversationId(response.conversation_id);
        }
        setUploadedFiles([]);
      } else {
        throw new Error(response?.error || 'Failed to get AI response');
      }
    } catch (error) {
      console.error('[Orion] Error:', error);
      toast.error('Failed to get response from Orion');
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      try {
        // Read file as base64
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64Data = event.target.result.split(',')[1];
          setUploadedFiles((prev) => [
            ...prev,
            {
              name: file.name,
              type: file.type,
              data: base64Data,
            },
          ]);
        };
        reader.readAsDataURL(file);
        toast.success(`Uploaded ${file.name}`);
      } catch (error) {
        console.error('File upload error:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }
  };

  const removeFile = (index) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleVoiceInput = () => {
    // Use Web Speech API (Chrome/Edge)
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsRecording(true);
        toast.success('Listening...');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setChatInput(transcript);
        setIsRecording(false);
        toast.success('Voice input captured');
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        toast.error('Voice input failed');
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } else {
      toast.error('Voice input not supported in this browser. Try Chrome or Edge.');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const getHighlightIcon = (type) => {
    switch (type) {
      case 'win':
        return CheckCircle;
      case 'alert':
        return AlertTriangle;
      case 'opportunity':
        return Target;
      case 'insight':
        return Sparkles;
      default:
        return MessageSquare;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-green-600 to-emerald-500 text-white border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Zap className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Orion - Your AI Business Wingman</h2>
              <p className="text-green-100 text-sm font-normal">
                Your wingman for growth, strategy, and business success
              </p>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="chat">
            <MessageSquare className="w-4 h-4 mr-2" />
            Ask Orion
          </TabsTrigger>
          <TabsTrigger value="briefing">
            <Sun className="w-4 h-4 mr-2" />
            Daily Briefing
          </TabsTrigger>
          <TabsTrigger value="opportunities">
            <TrendingUp className="w-4 h-4 mr-2" />
            Opportunities
          </TabsTrigger>
          <TabsTrigger value="risks">
            <Shield className="w-4 h-4 mr-2" />
            Risk Alerts
          </TabsTrigger>
        </TabsList>

        {/* Daily Briefing Tab */}
        <TabsContent value="briefing" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={loadBriefing} disabled={isBriefingLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isBriefingLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          {briefing ? (
            <>
              {/* Greeting */}
              <Card>
                <CardContent className="pt-6">
                  <p className="text-lg font-medium text-slate-900 mb-2">{briefing.greeting}</p>
                  <p className="text-slate-600">{briefing.summary}</p>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              {briefing.quick_stats && (
                <div className="grid md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-500">Revenue (24h)</p>
                          <p className="text-2xl font-bold text-slate-900">
                            {briefing.quick_stats.revenue_24h}
                          </p>
                        </div>
                        <DollarSign className="w-8 h-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-500">Orders (24h)</p>
                          <p className="text-2xl font-bold text-slate-900">
                            {briefing.quick_stats.orders_24h}
                          </p>
                        </div>
                        <Zap className="w-8 h-8 text-blue-600" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-500">Trend</p>
                          <p className="text-2xl font-bold text-slate-900 capitalize">
                            {briefing.quick_stats.trend}
                          </p>
                        </div>
                        <TrendingUp
                          className={`w-8 h-8 ${
                            briefing.quick_stats.trend === 'up'
                              ? 'text-green-600'
                              : briefing.quick_stats.trend === 'down'
                              ? 'text-red-600'
                              : 'text-slate-600'
                          }`}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Highlights */}
              {briefing.highlights && briefing.highlights.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Today's Highlights</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {briefing.highlights.map((highlight, idx) => {
                      const Icon = getHighlightIcon(highlight.type);
                      return (
                        <div
                          key={idx}
                          className={`p-4 rounded-lg border ${getPriorityColor(
                            highlight.type === 'alert' ? 'high' : 'medium'
                          )}`}
                        >
                          <div className="flex items-start gap-3">
                            <Icon className="w-5 h-5 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-semibold mb-1">{highlight.title}</p>
                              <p className="text-sm mb-2">{highlight.description}</p>
                              {highlight.action && (
                                <p className="text-sm font-medium">→ {highlight.action}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Daily Focus */}
              {briefing.daily_focus && (
                <Alert className="bg-purple-50 border-purple-200">
                  <Target className="w-4 h-4" />
                  <AlertTitle>Your Daily Focus</AlertTitle>
                  <AlertDescription className="text-purple-900">
                    {briefing.daily_focus}
                  </AlertDescription>
                </Alert>
              )}

              {/* Motivation */}
              {briefing.motivation && (
                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                  <CardContent className="pt-6">
                    <p className="text-center text-slate-700 italic">{briefing.motivation}</p>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-12">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                  <p className="text-slate-600">Generating your daily briefing...</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Growth Opportunities Tab */}
        <TabsContent value="opportunities" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={loadOpportunities} disabled={isOpportunitiesLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isOpportunitiesLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          {opportunities.length > 0 ? (
            opportunities.map((opp, idx) => (
              <Card key={idx} className="border-l-4 border-l-green-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-base">{opp.title}</CardTitle>
                        <Badge className={getPriorityColor(opp.priority)}>{opp.priority}</Badge>
                      </div>
                      <p className="text-sm text-slate-600">{opp.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Estimated Revenue Potential:</span>
                      <span className="font-bold text-green-600">
                        ${opp.estimated_revenue?.toLocaleString() || 0}/month
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Effort Required:</span>
                      <Badge variant="outline" className="capitalize">
                        {opp.effort_required}
                      </Badge>
                    </div>
                    <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                      <p className="text-sm font-medium text-green-900 mb-1">Recommended Action:</p>
                      <p className="text-sm text-green-700">{opp.action}</p>
                    </div>
                    {opp.products_affected && opp.products_affected.length > 0 && (
                      <p className="text-xs text-slate-500">
                        Affects {opp.products_affected.length} products
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                  <p className="text-slate-600">Analyzing your store for growth opportunities...</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Risk Alerts Tab */}
        <TabsContent value="risks" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={loadRisks} disabled={isRisksLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isRisksLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          {risks.length > 0 ? (
            risks.map((risk, idx) => (
              <Card key={idx} className={`border-l-4 ${
                risk.severity === 'critical' || risk.severity === 'high'
                  ? 'border-l-red-500'
                  : risk.severity === 'medium'
                  ? 'border-l-yellow-500'
                  : 'border-l-blue-500'
              }`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <CardTitle className="text-base">{risk.title}</CardTitle>
                        <Badge className={getPriorityColor(risk.severity)}>
                          {risk.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">{risk.description}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Alert variant="destructive" className="bg-red-50">
                      <AlertDescription className="text-sm">
                        <span className="font-semibold">Potential Impact:</span> {risk.impact}
                      </AlertDescription>
                    </Alert>
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <p className="text-sm font-medium text-blue-900 mb-1">What To Do:</p>
                      <p className="text-sm text-blue-700">{risk.action}</p>
                    </div>
                    {risk.timeframe && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600">Act by:</span>
                        <Badge variant="outline" className="capitalize text-xs">
                          {risk.timeframe.replace('_', ' ')}
                        </Badge>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-12">
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-600" />
                  <p className="text-green-900 font-semibold mb-2">No Critical Risks Detected!</p>
                  <p className="text-green-700 text-sm">
                    Your store is looking healthy. Keep up the good work!
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat" className="space-y-4">
          <Card className="h-[600px] flex flex-col">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Ask Orion Anything
                </CardTitle>
                {chatMessages.length > 0 && (
                  <Button variant="outline" size="sm" onClick={startNewConversation}>
                    + New Chat
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {isHistoryLoading ? (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                  <p className="text-sm text-slate-500">Loading your conversation history...</p>
                </div>
              ) : chatMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Zap className="w-16 h-16 text-purple-400 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Hey, I'm Orion - Your Business Wingman
                  </h3>
                  <p className="text-sm text-slate-600 max-w-md mb-3">
                    Ask me anything about your business. I'm here to help you grow, spot opportunities, and tackle challenges head-on.
                  </p>
                  <div className="mt-6 grid gap-2">
                    <button
                      className="text-sm text-left px-4 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 transition-colors"
                      onClick={() => setChatInput('How can I increase my average order value?')}
                    >
                      💰 How can I grow my average order value?
                    </button>
                    <button
                      className="text-sm text-left px-4 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 transition-colors"
                      onClick={() => setChatInput('What products should I focus on promoting?')}
                    >
                      🚀 What should I be promoting right now?
                    </button>
                    <button
                      className="text-sm text-left px-4 py-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 transition-colors"
                      onClick={() => setChatInput('Give me a quick analysis of my business')}
                    >
                      📊 Give me a quick business analysis
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-3 ${
                          msg.role === 'user'
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-100 text-slate-900'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-100 rounded-lg px-4 py-3">
                        <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </>
              )}
            </CardContent>
            <div className="border-t p-4">
              {/* Uploaded Files Display */}
              {uploadedFiles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {uploadedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-sm"
                    >
                      {file.type.startsWith('image/') ? (
                        <ImageIcon className="w-4 h-4 text-purple-600" />
                      ) : (
                        <FileText className="w-4 h-4 text-purple-600" />
                      )}
                      <span className="text-purple-900">{file.name}</span>
                      <button
                        onClick={() => removeFile(idx)}
                        className="text-purple-600 hover:text-purple-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input Area */}
              <div className="flex gap-2 items-end">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="flex flex-col gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isChatLoading}
                    title="Upload file"
                  >
                    <Paperclip className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleVoiceInput}
                    disabled={isChatLoading}
                    className={isRecording ? 'bg-red-100 border-red-300' : ''}
                    title="Voice input"
                  >
                    <Mic className={`w-4 h-4 ${isRecording ? 'text-red-600 animate-pulse' : ''}`} />
                  </Button>
                </div>
                <textarea
                  placeholder="Ask Orion anything... (Shift+Enter for new line)"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !isChatLoading) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={isChatLoading}
                  rows={4}
                  className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={isChatLoading || (!chatInput.trim() && uploadedFiles.length === 0)}
                  className="self-end"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
