import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CalendarEvent } from '@/lib/entities';
import { AIWorkflow } from '@/lib/entities';
import { AdCampaign } from '@/lib/entities';
import { User } from '@/lib/entities';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, Loader2, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { handleAuthError } from '@/utils/authHelpers';
import { NoDataEmptyState } from '../components/common/EmptyState';

export default function Calendar() {
  const [events, setEvents] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const navigate = useNavigate();

  // Memoize beta access check
  const hasBetaAccess = useMemo(() => {
    return currentUser && currentUser.user_mode === 'beta';
  }, [currentUser]);

  // Load calendar data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [user, eventsData, workflowsData, campaignsData] = await Promise.all([
        User.me(),
        CalendarEvent.list().catch(err => {
          console.error('Error fetching events:', err);
          return [];
        }),
        AIWorkflow.list().catch(err => {
          console.error('Error fetching workflows:', err);
          return [];
        }),
        AdCampaign.list().catch(err => {
          console.error('Error fetching campaigns:', err);
          return [];
        })
      ]);

      setCurrentUser(user);
      
      // Filter valid data
      const validEvents = eventsData.filter(e => 
        e && typeof e === 'object' && e.id
      );
      const validWorkflows = workflowsData.filter(w => 
        w && typeof w === 'object' && w.id
      );
      const validCampaigns = campaignsData.filter(c => 
        c && typeof c === 'object' && c.id
      );
      
      setEvents(validEvents);
      setWorkflows(validWorkflows);
      setCampaigns(validCampaigns);
    } catch (error) {
      console.error('Failed to load calendar:', error);
      
      if (handleAuthError(error, navigate, { showToast: true })) {
        return;
      }
      
      toast.error("Failed to load calendar", {
        description: "Please try refreshing the page."
      });
      
      setEvents([]);
      setWorkflows([]);
      setCampaigns([]);
    } finally {
      setIsLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Get events for a specific date
  const getEventsForDate = useCallback((date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      return isSameDay(eventDate, date);
    });
  }, [events]);

  // Handle month navigation
  const handlePrevMonth = useCallback(() => {
    setCurrentMonth(prev => subMonths(prev, 1));
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentMonth(prev => addMonths(prev, 1));
  }, []);

  // Handle date click
  const handleDateClick = useCallback((date) => {
    setSelectedDate(date);
  }, []);

  // Event type colors
  const eventColors = {
    sale: 'bg-green-100 text-green-800 border-green-200',
    marketing_campaign: 'bg-blue-100 text-blue-800 border-blue-200',
    workflow_run: 'bg-purple-100 text-purple-800 border-purple-200',
    platform_update: 'bg-orange-100 text-orange-800 border-orange-200',
    manual_note: 'bg-slate-100 text-slate-800 border-slate-200',
    ad_campaign: 'bg-pink-100 text-pink-800 border-pink-200'
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-slate-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              <CalendarIcon className="w-8 h-8 text-indigo-600" />
              Calendar
            </h1>
            <p className="text-slate-600 mt-2">
              Track your campaigns, workflows, and important dates
            </p>
          </div>

          <Button onClick={() => toast.info("Create event feature coming soon!")}>
            <Plus className="w-4 h-4 mr-2" />
            Add Event
          </Button>
        </div>

        {/* Calendar Navigation */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-xl font-semibold">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <Button variant="outline" size="icon" onClick={handleNextMonth}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Grid */}
        <Card>
          <CardContent className="p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="text-center text-sm font-semibold text-slate-600 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map(day => {
                const dayEvents = getEventsForDate(day);
                const isToday = isSameDay(day, new Date());
                const isSelected = selectedDate && isSameDay(day, selectedDate);

                return (
                  <div
                    key={day.toString()}
                    onClick={() => handleDateClick(day)}
                    className={`
                      min-h-24 p-2 border rounded-lg cursor-pointer transition-all
                      ${isToday ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200'}
                      ${isSelected ? 'ring-2 ring-indigo-500' : ''}
                      ${!isSameMonth(day, currentMonth) ? 'opacity-40' : ''}
                      hover:bg-slate-50
                    `}
                  >
                    <div className="text-sm font-semibold text-slate-900 mb-1">
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 2).map(event => (
                        <div
                          key={event.id}
                          className={`text-xs p-1 rounded border ${eventColors[event.event_type] || eventColors.manual_note}`}
                        >
                          {event.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-xs text-slate-500">
                          +{dayEvents.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Selected Date Events */}
        {selectedDate && (
          <Card className="mt-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                Events for {format(selectedDate, 'MMMM d, yyyy')}
              </h3>
              {getEventsForDate(selectedDate).length > 0 ? (
                <div className="space-y-3">
                  {getEventsForDate(selectedDate).map(event => (
                    <div key={event.id} className="flex items-start gap-3 p-3 border rounded-lg">
                      <Badge className={eventColors[event.event_type] || eventColors.manual_note}>
                        {event.event_type.replace('_', ' ')}
                      </Badge>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900">{event.title}</h4>
                        {event.description && (
                          <p className="text-sm text-slate-600 mt-1">{event.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-center py-4">
                  No events scheduled for this date
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Legend */}
        <Card className="mt-6">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Event Types</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(eventColors).map(([type, color]) => (
                <Badge key={type} className={color}>
                  {type.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}