import React, { useState, useEffect, useCallback } from 'react';
import { User } from '@/lib/entities';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Timer } from "lucide-react";

const InactivityManager = () => {
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const logout = useCallback(async () => {
    try {
      await User.logout();
      window.location.reload(); // Force a reload to go to the login state
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, []);

  const resetTimer = useCallback(() => {
    if (user?.inactivity_timeout_minutes) {
      if (window.logoutTimer) clearTimeout(window.logoutTimer);
      if (window.warningTimer) clearTimeout(window.warningTimer);
      
      const timeoutMinutes = user.inactivity_timeout_minutes;
      
      // Show warning modal 1 minute before logout
      window.warningTimer = setTimeout(() => {
        setShowModal(true);
      }, (timeoutMinutes - 1) * 60 * 1000);

      // Logout after the full timeout
      window.logoutTimer = setTimeout(logout, timeoutMinutes * 60 * 1000);
    }
  }, [user, logout]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await User.me();
        setUser(currentUser);
      } catch (error) {
        // User not logged in, do nothing
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
      
      const handleActivity = () => {
        resetTimer();
      };
      
      events.forEach(event => window.addEventListener(event, handleActivity));
      resetTimer();

      return () => {
        events.forEach(event => window.removeEventListener(event, handleActivity));
        clearTimeout(window.logoutTimer);
        clearTimeout(window.warningTimer);
      };
    }
  }, [user, resetTimer]);
  
  useEffect(() => {
    let interval;
    if (showModal) {
      setCountdown(60);
      interval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showModal]);

  const handleStayLoggedIn = () => {
    setShowModal(false);
    resetTimer();
  };

  if (!showModal) return null;

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Timer className="w-5 h-5" />
            Are you still there?
          </DialogTitle>
        </DialogHeader>
        <p className="text-slate-600">You've been inactive for a while. For your security, you will be automatically logged out.</p>
        <p className="text-center text-2xl font-bold my-4">
          Logging out in {countdown} seconds
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={logout}>Log Out Now</Button>
          <Button className="gradient-accent text-white" onClick={handleStayLoggedIn}>
            I'm Still Here
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InactivityManager;