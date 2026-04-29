import React, { useState, useEffect, useCallback } from 'react';
import { Bell, X, AlertTriangle, Lightbulb, Info, CheckCircle, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/apiClient';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const TYPE_ICON = {
  critical:    { Icon: AlertTriangle, color: 'text-red-500',    bg: 'bg-red-50' },
  opportunity: { Icon: Lightbulb,     color: 'text-yellow-500', bg: 'bg-yellow-50' },
  info:        { Icon: Info,           color: 'text-blue-500',   bg: 'bg-blue-50' },
  maintenance: { Icon: Bell,           color: 'text-slate-500',  bg: 'bg-slate-50' },
};

export default function NotificationBell() {
  const [alerts, setAlerts] = useState([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const loadAlerts = useCallback(async () => {
    try {
      const data = await api.entities.SmartAlert.filter({ is_dismissed: false }, '-created_at', 20);
      setAlerts(data || []);
    } catch (e) {
      // silently ignore — bell degrades gracefully if table isn't migrated yet
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  // Realtime: refresh bell whenever a new smart_alert is inserted for this user
  useEffect(() => {
    const channel = supabase
      .channel('notification-bell')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'smart_alerts' }, () => {
        loadAlerts();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadAlerts]);

  const unread = alerts.filter(a => !a.is_read).length;

  const markRead = async (id) => {
    try {
      await api.entities.SmartAlert.update(id, { is_read: true });
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
    } catch { /* ignore */ }
  };

  const dismiss = async (id, e) => {
    e.stopPropagation();
    try {
      await api.entities.SmartAlert.update(id, { is_dismissed: true });
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await Promise.all(alerts.filter(a => !a.is_read).map(a =>
        api.entities.SmartAlert.update(a.id, { is_read: true })
      ));
      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
    } catch { /* ignore */ }
  };

  const handleAlertClick = (alert) => {
    markRead(alert.id);
    if (alert.suggested_actions?.length > 0 && alert.suggested_actions[0].command) {
      const cmd = encodeURIComponent(alert.suggested_actions[0].command);
      navigate(createPageUrl(`Commands?prompt=${cmd}`));
      setOpen(false);
    }
  };

  const { Icon: BellIcon } = TYPE_ICON.maintenance;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8" title="Notifications">
          <Bell className="h-4 w-4 text-slate-600" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0 shadow-xl" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <span className="font-semibold text-slate-900 text-sm">Notifications</span>
          <div className="flex items-center gap-1">
            {unread > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-500 hover:text-slate-800" onClick={markAllRead}>
                <Check className="h-3 w-3 mr-1" /> Mark all read
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-500 hover:text-slate-800"
              onClick={() => { navigate(createPageUrl('CustomAlerts')); setOpen(false); }}>
              Manage alerts
            </Button>
          </div>
        </div>

        {/* Alert list */}
        <div className="max-h-96 overflow-y-auto">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <Bell className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            alerts.map(alert => {
              const { Icon, color, bg } = TYPE_ICON[alert.alert_type] || TYPE_ICON.maintenance;
              const hasAction = alert.suggested_actions?.length > 0 && alert.suggested_actions[0].command;
              return (
                <div
                  key={alert.id}
                  className={`relative flex gap-3 px-4 py-3 border-b border-slate-50 transition-colors
                    ${!alert.is_read ? 'bg-blue-50/40' : 'bg-white'}
                    ${hasAction ? 'cursor-pointer hover:bg-slate-50' : ''}`}
                  onClick={() => hasAction && handleAlertClick(alert)}
                >
                  <div className={`mt-0.5 flex-shrink-0 h-7 w-7 rounded-full ${bg} flex items-center justify-center`}>
                    <Icon className={`h-3.5 w-3.5 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-start justify-between gap-1">
                      <p className={`text-sm font-medium leading-snug ${!alert.is_read ? 'text-slate-900' : 'text-slate-700'}`}>
                        {alert.title}
                      </p>
                      {!alert.is_read && <span className="flex-shrink-0 mt-1.5 h-2 w-2 rounded-full bg-blue-500" />}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{alert.message}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[11px] text-slate-400">
                        {new Date(alert.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </p>
                      {hasAction && <ChevronRight className="h-3 w-3 text-slate-400" />}
                    </div>
                  </div>
                  <button
                    onClick={(e) => dismiss(alert.id, e)}
                    className="absolute top-2 right-2 h-5 w-5 flex items-center justify-center rounded text-slate-300 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
