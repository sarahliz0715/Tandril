import React from 'react';
import AIBusinessCoach from '../components/coach/AIBusinessCoach';

/**
 * AI Advisor Page (Orion)
 * Now using the AI Business Coach component which includes:
 * - Daily business briefing
 * - Growth opportunities detection
 * - Risk alerts
 * - Interactive chat with file upload and voice input
 */
export default function AIAdvisor() {
  return (
    <div className="h-full">
      <AIBusinessCoach />
    </div>
  );
}
