import React from 'react';
import { cn } from '@/lib/utils';
import { Bot, MessageCircle, Activity } from 'lucide-react';

export default function AIAvatar({ isThinking, isSpeaking, size = 'md' }) {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-16 h-16',
    };

    return (
        <div className={cn('relative rounded-full flex-shrink-0', sizeClasses[size])}>
            <div className="rounded-full w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-indigo-600 border-2 border-white/50 shadow-lg">
                <Bot className="w-1/2 h-1/2 text-white" />
            </div>
            {isThinking && (
                <div className="absolute inset-0 rounded-full bg-indigo-500/30 animate-pulse flex items-center justify-center">
                    <Bot className="w-1/2 h-1/2 text-white/70" />
                </div>
            )}
            {isSpeaking && (
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full flex items-center justify-center animate-pulse">
                     <Activity className="w-2 h-2 text-white" />
                </div>
            )}
        </div>
    );
}