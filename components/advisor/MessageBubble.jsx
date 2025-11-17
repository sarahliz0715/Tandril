import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";
import { Copy, Zap, CheckCircle2, AlertCircle, Loader2, ChevronRight, Clock } from 'lucide-react';
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import FunctionCall from './FunctionCall';
import AIAvatar from './AIAvatar';

export default function MessageBubble({ message }) {
    const isUser = message.role === 'user';
    
    return (
        <div className={cn("flex gap-3 mb-3", isUser ? "justify-end" : "justify-start")}>
            {!isUser && (
                <AIAvatar size="sm" isThinking={message.status === 'in_progress'} />
            )}
            <div className={cn("max-w-[85%] min-w-0", isUser && "flex flex-col items-end")}>
                {message.content && (
                    <div className={cn(
                        "rounded-2xl px-4 py-2.5 shadow-sm break-words overflow-hidden",
                        isUser ? "bg-indigo-600 text-white rounded-br-lg" : "bg-white border border-slate-200 rounded-bl-lg"
                    )}>
                        {isUser ? (
                            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                        ) : (
                            <ReactMarkdown 
                                className="text-sm prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 
                                          prose-p:break-words prose-li:break-words prose-headings:break-words prose-p:my-2
                                          prose-pre:overflow-x-auto prose-pre:max-w-full prose-ul:my-2 prose-ol:my-2"
                                components={{
                                    code: ({ inline, className, children, ...props }) => {
                                        const match = /language-(\w+)/.exec(className || '');
                                        return !inline && match ? (
                                            <div className="relative group/code my-2 max-w-full overflow-hidden">
                                                <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto max-w-full">
                                                    <code className={className} {...props}>{children}</code>
                                                </pre>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover/code:opacity-100 bg-slate-800 hover:bg-slate-700"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(String(children).replace(/\n$/, ''));
                                                        toast.success('Code copied');
                                                    }}
                                                >
                                                    <Copy className="h-3 w-3 text-slate-400" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <code className="px-1 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-mono break-all">
                                                {children}
                                            </code>
                                        );
                                    },
                                    a: ({ children, ...props }) => (
                                        <a {...props} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline break-all">{children}</a>
                                    ),
                                    p: ({ children }) => <p className="my-2 leading-relaxed break-words">{children}</p>,
                                    ul: ({ children }) => <ul className="my-2 ml-4 list-disc space-y-1">{children}</ul>,
                                    ol: ({ children }) => <ol className="my-2 ml-4 list-decimal space-y-1">{children}</ol>,
                                    li: ({ children }) => <li className="my-0.5 break-words">{children}</li>,
                                    h1: ({ children }) => <h1 className="text-lg font-semibold my-3 break-words">{children}</h1>,
                                    h2: ({ children }) => <h2 className="text-base font-semibold my-2 break-words">{children}</h2>,
                                    h3: ({ children }) => <h3 className="text-sm font-semibold my-2 break-words">{children}</h3>,
                                    blockquote: ({ children }) => (
                                        <blockquote className="border-l-2 border-slate-300 pl-3 my-2 text-slate-600 italic break-words">
                                            {children}
                                        </blockquote>
                                    ),
                                }}
                            >
                                {message.content}
                            </ReactMarkdown>
                        )}
                    </div>
                )}
                
                {message.tool_calls?.length > 0 && (
                    <div className="space-y-2 mt-2 max-w-full">
                        {message.tool_calls.map((toolCall, idx) => (
                            <FunctionCall key={idx} toolCall={toolCall} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}