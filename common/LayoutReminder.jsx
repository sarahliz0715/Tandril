import React, { useState, useEffect } from 'react';
import { User } from '@/api/entities';
import { AnimatePresence, motion } from 'framer-motion';
import { Lightbulb, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LayoutReminder() {
    const [isVisible, setIsVisible] = useState(false);
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkUser = async () => {
            try {
                const currentUser = await User.me();
                setUser(currentUser);
                if (!currentUser.layout_reminder_dismissed) {
                    setIsVisible(true);
                }
            } catch (error) {
                // Silently handle - user likely not authenticated or on public page
                // This is expected behavior, not an error
                console.log("LayoutReminder: User not authenticated, skipping reminder");
            } finally {
                setIsLoading(false);
            }
        };
        checkUser();
    }, []);

    const handleDismiss = async () => {
        setIsVisible(false);
        if (user) {
            try {
                await User.updateMyUserData({ layout_reminder_dismissed: true });
            } catch (error) {
                console.log("Could not save reminder dismissal, but hiding anyway");
            }
        }
    };

    // Don't render anything while loading or if no user
    if (isLoading || !user) {
        return null;
    }

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-6 flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <Lightbulb className="w-5 h-5 text-indigo-600" />
                        <p className="text-sm text-indigo-800">
                            <span className="font-semibold">Pro Tip:</span> You can drag, drop, and hide these widgets to customize your workspace!
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-indigo-600 hover:bg-indigo-100" onClick={handleDismiss}>
                        <X className="w-4 h-4" />
                    </Button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}