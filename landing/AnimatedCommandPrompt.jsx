import React, { useState, useEffect } from 'react';
import { Bot } from 'lucide-react';

const commands = [
    'Create a 20% off flash sale for all my "Summer Collection" products for 48 hours.',
    'Find my top 5 selling products last month and generate a report.',
    'Update SEO titles for all products in the "Apparel" category to include "organic cotton".',
    'Which of my active ad campaigns have a ROAS below 2.0? Pause them.',
    'Draft an email to customers who purchased more than twice, offering a special discount.',
    'Sync inventory levels for SKU #12345 across Shopify and Amazon.',
];

export default function AnimatedCommandPrompt() {
    const [currentCommand, setCurrentCommand] = useState('');
    const [commandIndex, setCommandIndex] = useState(0);
    const [charIndex, setCharIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const typeSpeed = isDeleting ? 50 : 100;
        const currentFullCommand = commands[commandIndex];

        const timeout = setTimeout(() => {
            if (isDeleting) {
                if (charIndex > 0) {
                    setCurrentCommand(currentFullCommand.substring(0, charIndex - 1));
                    setCharIndex(charIndex - 1);
                } else {
                    setIsDeleting(false);
                    setCommandIndex((prevIndex) => (prevIndex + 1) % commands.length);
                }
            } else {
                if (charIndex < currentFullCommand.length) {
                    setCurrentCommand(currentFullCommand.substring(0, charIndex + 1));
                    setCharIndex(charIndex + 1);
                } else {
                    // Pause at the end of the command
                    setTimeout(() => setIsDeleting(true), 2000);
                }
            }
        }, typeSpeed);

        return () => clearTimeout(timeout);
    }, [charIndex, isDeleting, commandIndex]);

    return (
        <div className="bg-white rounded-xl shadow-2xl p-4 border border-slate-200 flex items-center gap-3">
            <Bot className="w-6 h-6 text-indigo-500 flex-shrink-0" />
            <p className="text-sm sm:text-base text-slate-700 font-medium whitespace-nowrap overflow-hidden">
                {currentCommand}
                <span className="animate-pulse">|</span>
            </p>
        </div>
    );
}