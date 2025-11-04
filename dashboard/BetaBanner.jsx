import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FlaskConical, LifeBuoy, ChevronDown, Users, Sparkles, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { User } from '@/api/entities';

export default function BetaBanner() {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const currentUser = await User.me();
                setUser(currentUser);
                // Check if user has dismissed the banner
                if (currentUser?.notification_preferences?.beta_banner_dismissed) {
                    setIsVisible(false);
                }
            } catch (error) {
                console.error('Error fetching user for beta banner:', error);
            }
        };
        fetchUser();
    }, []);

    const handleDismiss = async () => {
        try {
            await User.updateMyUserData({ 
                notification_preferences: {
                    ...user?.notification_preferences,
                    beta_banner_dismissed: true 
                }
            });
            setIsVisible(false);
        } catch (error) {
            console.error('Failed to dismiss beta banner:', error);
            setIsVisible(false); // Still hide it locally
        }
    };

    if (!isVisible) return null;

    return (
        <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200 rounded-lg mb-6 shadow-sm overflow-hidden">
            <div 
                className="flex items-center justify-between p-4 cursor-pointer" 
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                        <FlaskConical className="w-5 h-5 text-purple-600 flex-shrink-0" />
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-purple-900 flex items-center gap-2">
                            You're a Tandril Beta User!
                            <Sparkles className="w-4 h-4 text-purple-600" />
                        </span>
                        {!isExpanded && (
                            <span className="hidden sm:inline text-sm text-purple-800">
                                Thank you for helping shape the future of AI e-commerce
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDismiss();
                        }}
                        className="text-purple-600 hover:bg-purple-100 h-8 w-8"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm"
                        className="h-8 border-purple-300 bg-white/70 hover:bg-purple-100/50 text-purple-800 text-xs"
                        onClick={(e) => {
                            e.stopPropagation();
                            window.open('https://forms.gle/U9f2h1CEvGg3rE626', '_blank');
                        }}
                    >
                        <LifeBuoy className="w-3 h-3 mr-1.5" />
                        Feedback
                    </Button>
                    <ChevronDown className={`w-5 h-5 text-purple-700 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>
            </div>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-6 pt-2 border-t border-purple-200">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                                        <Users className="w-4 h-4" />
                                        As a Beta User, You Get:
                                    </h4>
                                    <ul className="text-sm text-purple-800 space-y-1">
                                        <li>• Early access to cutting-edge AI features</li>
                                        <li>• Direct input on product development</li>
                                        <li>• Priority support and feedback channels</li>
                                        <li>• Special recognition as a founding user</li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-purple-900 mb-2">
                                        Help Us Improve:
                                    </h4>
                                    <p className="text-sm text-purple-800 mb-3">
                                        Your experience and feedback directly shapes how Tandril evolves. 
                                        Every suggestion helps us build the perfect AI business partner.
                                    </p>
                                    <div className="flex gap-2">
                                        <Button 
                                            size="sm"
                                            variant="outline"
                                            className="text-xs border-purple-300 text-purple-700 hover:bg-purple-100"
                                            onClick={() => window.open('https://forms.gle/U9f2h1CEvGg3rE626', '_blank')}
                                        >
                                            Share Feedback
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-xs border-purple-300 text-purple-700 hover:bg-purple-100"
                                            onClick={() => window.open('mailto:support@tandril.com', '_blank')}
                                        >
                                            Contact Support
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}