
import React, { useState, useEffect, useCallback } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Trash2 } from 'lucide-react';


export default function ConversationList({ conversations, selectedConversationId, onConversationSelect, onConversationDelete }) {
  return (
    <ScrollArea className="flex-1">
      <div className="p-2">
        {conversations.length > 0 ? (
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedConversationId === conversation.id
                    ? 'bg-indigo-100 border border-indigo-200'
                    : 'hover:bg-slate-100 border border-transparent'
                }`}
                onClick={() => onConversationSelect(conversation.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <MessageSquare className={`w-4 h-4 ${
                      selectedConversationId === conversation.id ? 'text-indigo-600' : 'text-slate-400'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {conversation.metadata?.name || 'New Conversation'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(conversation.created_date).toLocaleDateString()}
                    </p>
                    {conversation.messages && conversation.messages.length > 0 && (
                      <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                        {conversation.messages[conversation.messages.length - 1]?.content?.substring(0, 60) || ''}...
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onConversationDelete(conversation.id);
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-200 rounded"
                >
                  <Trash2 className="w-3 h-3 text-slate-500" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="mx-auto h-8 w-8 text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">No conversations yet</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
