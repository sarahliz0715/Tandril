import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User } from '@/lib/entities';
import { useLocation } from 'react-router-dom';

const SAVE_INTERVAL = 30000; // Save every 30 seconds
const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];

export default function ActivityTracker() {
    const [isTracking, setIsTracking] = useState(false);
    const accumulatedTimeRef = useRef(0);
    const lastActivityTimeRef = useRef(Date.now());
    const location = useLocation();

    // Function to save accumulated time to the backend
    const saveTime = useCallback(async () => {
        if (accumulatedTimeRef.current > 0) {
            try {
                const user = await User.me();
                const currentTotal = user.total_session_seconds || 0;
                const newTotal = currentTotal + Math.round(accumulatedTimeRef.current / 1000);
                
                await User.updateMyUserData({ total_session_seconds: newTotal });
                accumulatedTimeRef.current = 0; // Reset after saving
            } catch (error) {
                // Not logged in, or error saving. Stop tracking.
                setIsTracking(false);
                console.warn("Could not save session time. User might be logged out.");
            }
        }
    }, []);

    // Effect to start/stop tracking based on user auth
    useEffect(() => {
        User.me()
            .then(() => setIsTracking(true))
            .catch(() => setIsTracking(false));
    }, [location.pathname]); // Re-check auth on page navigation

    // Effect for the main tracking logic
    useEffect(() => {
        if (!isTracking) return;

        let intervalId;

        const handleActivity = () => {
            lastActivityTimeRef.current = Date.now();
        };

        // Add activity listeners
        ACTIVITY_EVENTS.forEach(event => window.addEventListener(event, handleActivity));

        // Start the timer to accumulate time
        intervalId = setInterval(() => {
            const now = Date.now();
            // Only accumulate time if user has been active in the last minute
            if (now - lastActivityTimeRef.current < 60000) {
                accumulatedTimeRef.current += (now - lastActivityTimeRef.current);
            }
            lastActivityTimeRef.current = now;
        }, 10000); // Check every 10 seconds

        // Set up interval to save data
        const saveIntervalId = setInterval(saveTime, SAVE_INTERVAL);

        // Add listener for when the user leaves the page
        window.addEventListener('beforeunload', saveTime);

        // Cleanup function
        return () => {
            clearInterval(intervalId);
            clearInterval(saveIntervalId);
            window.removeEventListener('beforeunload', saveTime);
            ACTIVITY_EVENTS.forEach(event => window.removeEventListener(event, handleActivity));
            saveTime(); // Final save on component unmount
        };
    }, [isTracking, saveTime]);

    return null; // This component doesn't render anything
}