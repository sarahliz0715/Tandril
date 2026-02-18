// Intelligent Automation Scheduler Edge Function
// Schedules automations at optimal times based on AI analysis and learning

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { mode = 'analyze' } = await req.json();

    console.log(`[Intelligent Scheduler] Mode: ${mode} for user ${user.id}`);

    if (mode === 'analyze') {
      // Analyze all automations and provide scheduling recommendations
      const schedule = await analyzeAndSchedule(supabaseClient, user.id);

      return new Response(
        JSON.stringify({
          success: true,
          data: schedule,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } else if (mode === 'execute_pending') {
      // Execute automations that are scheduled for now
      const results = await executePendingAutomations(supabaseClient, user.id);

      return new Response(
        JSON.stringify({
          success: true,
          data: results,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } else {
      throw new Error(`Invalid mode: ${mode}`);
    }
  } catch (error) {
    console.error('[Intelligent Scheduler] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

async function analyzeAndSchedule(supabaseClient: any, userId: string): Promise<any> {
  // Get all active automations
  const { data: automations, error: automationsError } = await supabaseClient
    .from('automations')
    .select('*')
    .eq('user_id', userId)
    .eq('enabled', true);

  if (automationsError || !automations) {
    throw new Error('Failed to fetch automations');
  }

  // Get performance history
  const { data: performanceData } = await supabaseClient
    .from('automation_performance')
    .select('*')
    .eq('user_id', userId)
    .order('executed_at', { ascending: false })
    .limit(200);

  // Analyze each automation and create intelligent schedule
  const schedule = [];

  for (const automation of automations) {
    const automationPerformance = (performanceData || []).filter(
      (p) => p.automation_id === automation.id
    );

    const analysis = await analyzeAutomationSchedule(
      automation,
      automationPerformance
    );

    schedule.push({
      automation_id: automation.id,
      automation_name: automation.name,
      current_schedule: automation.schedule_config,
      recommended_schedule: analysis.recommended_schedule,
      reasoning: analysis.reasoning,
      confidence: analysis.confidence,
      estimated_improvement: analysis.estimated_improvement,
      next_run_at: analysis.next_run_at,
    });

    // Update the automation's AI-recommended schedule
    if (analysis.confidence > 0.7) {
      await supabaseClient
        .from('automations')
        .update({
          ai_recommended_schedule: analysis.recommended_schedule,
          ai_schedule_confidence: analysis.confidence,
          next_ai_scheduled_run: analysis.next_run_at,
        })
        .eq('id', automation.id);
    }
  }

  return {
    schedule,
    summary: {
      total_automations: automations.length,
      high_confidence_recommendations: schedule.filter((s) => s.confidence > 0.8).length,
      potential_improvements: schedule.filter(
        (s) => s.estimated_improvement && s.estimated_improvement > 10
      ).length,
    },
    generated_at: new Date().toISOString(),
  };
}

async function analyzeAutomationSchedule(
  automation: any,
  performanceHistory: any[]
): Promise<any> {
  const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

  if (!anthropicApiKey) {
    return basicSchedulingLogic(automation, performanceHistory);
  }

  const systemPrompt = `You are an AI scheduling expert optimizing e-commerce automation timing.

Analyze the automation's performance history and recommend the optimal schedule.

Automation Details:
- Name: ${automation.name}
- Trigger Type: ${automation.trigger_type}
- Current Schedule: ${JSON.stringify(automation.schedule_config || 'Not scheduled')}
- Description: ${automation.description || 'N/A'}

Performance History (last ${performanceHistory.length} runs):
${JSON.stringify(
  performanceHistory.map((p) => ({
    executed_at: p.executed_at,
    success_rate: p.success_rate,
    execution_time_ms: p.execution_time_ms,
    items_affected: p.items_affected,
    day_of_week: new Date(p.executed_at).toLocaleDateString('en-US', { weekday: 'long' }),
    hour_of_day: new Date(p.executed_at).getHours(),
  })),
  null,
  2
)}

Respond in JSON:
{
  "recommended_schedule": {
    "frequency": "daily" | "weekly" | "hourly" | "every_X_hours",
    "time_of_day": "HH:MM" (24-hour format),
    "days_of_week": [0-6] (0=Sunday, optional),
    "timezone": "UTC"
  },
  "reasoning": "Clear explanation of why this schedule is optimal",
  "confidence": 0.0-1.0,
  "estimated_improvement": percentage (e.g., 15 means 15% better),
  "next_run_at": "ISO timestamp for next recommended run",
  "patterns_detected": [
    "Pattern description..."
  ]
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: 'Analyze this automation and recommend the optimal schedule.',
        },
      ],
    }),
  });

  if (!response.ok) {
    return basicSchedulingLogic(automation, performanceHistory);
  }

  const result = await response.json();
  const contentText = result.content[0].text;

  const jsonMatch = contentText.match(/```json\n([\s\S]*?)\n```/) || contentText.match(/({[\s\S]*})/);
  const jsonText = jsonMatch ? jsonMatch[1] : contentText;

  return JSON.parse(jsonText);
}

function basicSchedulingLogic(automation: any, performanceHistory: any[]): any {
  // Fallback scheduling logic
  const now = new Date();

  // Default: run once per day at 9am
  const recommendedSchedule = {
    frequency: 'daily',
    time_of_day: '09:00',
    timezone: 'UTC',
  };

  const nextRun = new Date(now);
  nextRun.setHours(9, 0, 0, 0);
  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  return {
    recommended_schedule: recommendedSchedule,
    reasoning: 'Default daily schedule at 9am UTC (business hours)',
    confidence: 0.5,
    estimated_improvement: null,
    next_run_at: nextRun.toISOString(),
    patterns_detected: ['No sufficient performance data for pattern detection'],
  };
}

async function executePendingAutomations(supabaseClient: any, userId: string): Promise<any> {
  const now = new Date();

  // Get automations scheduled to run now (within 5 minute window)
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  const { data: pendingAutomations } = await supabaseClient
    .from('automations')
    .select('*')
    .eq('user_id', userId)
    .eq('enabled', true)
    .gte('next_ai_scheduled_run', fiveMinutesAgo.toISOString())
    .lte('next_ai_scheduled_run', fiveMinutesFromNow.toISOString());

  if (!pendingAutomations || pendingAutomations.length === 0) {
    return {
      executed: 0,
      message: 'No automations scheduled for this time',
    };
  }

  const results = [];

  for (const automation of pendingAutomations) {
    try {
      // Execute the automation (this would call the actual automation execution function)
      console.log(`[Intelligent Scheduler] Executing automation ${automation.id}: ${automation.name}`);

      // For now, just log that we would execute it
      // In production, this would call the automation execution endpoint

      results.push({
        automation_id: automation.id,
        automation_name: automation.name,
        success: true,
        executed_at: now.toISOString(),
      });

      // Calculate next run time based on schedule
      const nextRun = calculateNextRun(automation.ai_recommended_schedule, now);

      // Update next_ai_scheduled_run
      await supabaseClient
        .from('automations')
        .update({
          next_ai_scheduled_run: nextRun.toISOString(),
          last_executed_at: now.toISOString(),
        })
        .eq('id', automation.id);
    } catch (error) {
      console.error(`[Intelligent Scheduler] Failed to execute automation ${automation.id}:`, error);
      results.push({
        automation_id: automation.id,
        automation_name: automation.name,
        success: false,
        error: error.message,
      });
    }
  }

  return {
    executed: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  };
}

function calculateNextRun(schedule: any, currentTime: Date): Date {
  const next = new Date(currentTime);

  if (!schedule) {
    // Default: next day same time
    next.setDate(next.getDate() + 1);
    return next;
  }

  switch (schedule.frequency) {
    case 'hourly':
      next.setHours(next.getHours() + 1);
      break;

    case 'every_X_hours':
      const hours = schedule.hours || 1;
      next.setHours(next.getHours() + hours);
      break;

    case 'daily': {
      const [hours, minutes] = (schedule.time_of_day || '09:00').split(':').map(Number);
      next.setDate(next.getDate() + 1);
      next.setHours(hours, minutes, 0, 0);
      break;
    }

    case 'weekly': {
      const [hours, minutes] = (schedule.time_of_day || '09:00').split(':').map(Number);
      next.setDate(next.getDate() + 7);
      next.setHours(hours, minutes, 0, 0);
      break;
    }

    default:
      next.setDate(next.getDate() + 1);
  }

  return next;
}
