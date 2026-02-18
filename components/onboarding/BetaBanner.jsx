import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FlaskConical, Users, Sparkles, X } from 'lucide-react';
import { User } from '@/lib/entities';

export default function BetaBanner() {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = async () => {
    try {
      await User.updateMyUserData({ 
        'notification_preferences.beta_banner_dismissed': true 
      });
      setIsVisible(false);
    } catch (error) {
      console.error('Failed to dismiss beta banner:', error);
      setIsVisible(false); // Still hide it locally
    }
  };

  if (!isVisible) return null;

  return (
    <Card className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border-purple-200 shadow-lg mb-6">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-100 rounded-xl">
              <FlaskConical className="w-6 h-6 text-purple-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-purple-900 flex items-center gap-2">
                You're part of the Tandril Beta!
                <Sparkles className="w-5 h-5 text-purple-600" />
              </h3>
              <p className="text-purple-800 leading-relaxed">
                Welcome to the exclusive beta program. You're experiencing cutting-edge AI automation 
                that's shaping the future of e-commerce. Your feedback helps us build the perfect 
                AI business partner.
              </p>
              <div className="flex items-center gap-6 mt-4">
                <div className="flex items-center gap-2 text-sm text-purple-700">
                  <Users className="w-4 h-4" />
                  <span className="font-medium">Founding User</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-purple-700">
                  <FlaskConical className="w-4 h-4" />
                  <span className="font-medium">Beta Access</span>
                </div>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="text-purple-600 hover:bg-purple-100 -mt-1 -mr-1"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="mt-6 pt-4 border-t border-purple-200">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline"
              onClick={() => window.open('https://forms.gle/U9f2h1CEvGg3rE626', '_blank')}
              className="border-purple-300 text-purple-700 hover:bg-purple-100"
            >
              Share Feedback
            </Button>
            <Button
              variant="outline"
              className="border-purple-300 text-purple-700 hover:bg-purple-100"
              onClick={() => window.open('mailto:support@tandril.com', '_blank')}
            >
              Get Support
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}