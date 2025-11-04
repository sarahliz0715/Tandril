import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Fingerprint, Loader2, Shield, AlertTriangle } from "lucide-react";

export default function SecondaryAuthModal({ isOpen, onClose, onAuthenticated, title, description }) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAuthenticating(false);
    }
  }, [isOpen]);

  const handleAuth = async () => {
    setIsAuthenticating(true);
    
    // Simulate a WebAuthn API call or biometric verification
    // In a real implementation, this would call navigator.credentials.get() for WebAuthn
    // or trigger the device's biometric authentication
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsAuthenticating(false);
    onAuthenticated();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-orange-500" />
            {title || "Verification Required"}
          </DialogTitle>
          <DialogDescription className="pt-2">
            {description || "For your security, please verify your identity to proceed with this action."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center justify-center space-y-6 py-8">
          <div className="p-4 rounded-full bg-blue-50 border border-blue-200">
            <Fingerprint className="w-12 h-12 text-blue-500" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-slate-700 font-medium">
              Use your device's security to continue
            </p>
            <p className="text-sm text-slate-500">
              Fingerprint, face recognition, or PIN
            </p>
          </div>
          
          {/* Risk warning for high-impact commands */}
          <div className="w-full p-3 rounded-lg bg-orange-50 border border-orange-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-orange-700">
                This action may affect multiple products, orders, or customers across your platforms. 
                Make sure you want to proceed.
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isAuthenticating}>
            Cancel
          </Button>
          <Button onClick={handleAuth} disabled={isAuthenticating} className="gradient-accent text-white">
            {isAuthenticating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Fingerprint className="mr-2 h-4 w-4" />
                Authenticate
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}