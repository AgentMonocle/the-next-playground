import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge, Button, Spinner } from '@fluentui/react-components';
import {
  Calendar24Regular,
  Location24Regular,
  VideoClip24Regular,
  People24Regular,
  ChevronLeft24Regular,
  ChevronRight24Regular,
} from '@fluentui/react-icons';
import { useCalendarEvents, type CalendarEvent } from '@/hooks/useEmails';
import { useContacts } from '@/hooks/useContacts';

// ─── Helpers ────────────────────────────────────────────────────────────────

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day); // Sunday start
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date: Date): Date {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 7);
  return d;
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatWeekRange(start: Date): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString(undefined, opts)} - ${end.toLocaleDateString(undefined, opts)}, ${end.getFullYear()}`;
}

function getDayLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CalendarView() {
  const navigate = useNavigate();
  const [weekOffset, setWeekOffset] = useState(0);

  // Calculate date range
  const { startDate, endDate, weekStart } = useMemo(() => {
    const now = new Date();
    now.setDate(now.getDate() + weekOffset * 7);
    const ws = startOfWeek(now);
    const we = endOfWeek(now);
    return {
      startDate: ws.toISOString(),
      endDate: we.toISOString(),
      weekStart: ws,
    };
  }, [weekOffset]);

  const { data: events, isLoading, error } = useCalendarEvents(startDate, endDate);
  const { data: contacts } = useContacts();

  // Build email → contact map for matching
  const contactEmailMap = useMemo(() => {
    const map = new Map<string, { id: number; name: string }>();
    if (contacts) {
      for (const c of contacts) {
        if (c.tss_email) {
          map.set(c.tss_email.toLowerCase(), { id: c.id, name: c.Title });
        }
      }
    }
    return map;
  }, [contacts]);

  // Group events by day
  const groupedEvents = useMemo(() => {
    if (!events) return [];
    const groups = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const dayKey = getDayLabel(event.start.dateTime);
      const group = groups.get(dayKey) ?? [];
      group.push(event);
      groups.set(dayKey, group);
    }
    return Array.from(groups.entries());
  }, [events]);

  const handleLogActivity = (event: CalendarEvent) => {
    // Find CRM contact among attendees
    let matchedContactId: number | undefined;
    for (const attendee of event.attendees) {
      const match = contactEmailMap.get(attendee.emailAddress.address.toLowerCase());
      if (match) {
        matchedContactId = match.id;
        break;
      }
    }

    const params = new URLSearchParams({
      type: 'Meeting',
      Title: event.subject,
    });
    if (matchedContactId) params.set('contactId', String(matchedContactId));

    navigate(`/activities/new?${params.toString()}`);
  };

  return (
    <div className="bg-white rounded-lg border">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Calendar24Regular />
            Calendar
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">{formatWeekRange(weekStart)}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            appearance="subtle"
            size="small"
            icon={<ChevronLeft24Regular />}
            onClick={() => setWeekOffset(weekOffset - 1)}
          />
          <Button
            appearance="outline"
            size="small"
            onClick={() => setWeekOffset(0)}
          >
            Today
          </Button>
          <Button
            appearance="subtle"
            size="small"
            icon={<ChevronRight24Regular />}
            onClick={() => setWeekOffset(weekOffset + 1)}
          />
        </div>
      </div>

      {/* Content */}
      <div className="max-h-[500px] overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-8 gap-2">
            <Spinner size="tiny" />
            <span className="text-sm text-gray-400">Loading calendar...</span>
          </div>
        )}

        {error && (
          <div className="px-6 py-4">
            <p className="text-sm text-red-600">
              Failed to load calendar. Make sure Calendars.ReadWrite permission has been granted.
            </p>
          </div>
        )}

        {!isLoading && !error && groupedEvents.length === 0 && (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-gray-400">No meetings this week.</p>
          </div>
        )}

        {!isLoading && !error && groupedEvents.length > 0 && (
          <div className="divide-y divide-gray-100">
            {groupedEvents.map(([dayLabel, dayEvents]) => (
              <div key={dayLabel}>
                <div className="px-6 py-2 bg-gray-50">
                  <span className="text-xs font-medium text-gray-500">{dayLabel}</span>
                </div>
                {dayEvents.map((event) => {
                  // Check if any attendees match CRM contacts
                  const crmAttendees = event.attendees
                    .map((a) => contactEmailMap.get(a.emailAddress.address.toLowerCase()))
                    .filter(Boolean);
                  const hasCrmMatch = crmAttendees.length > 0;

                  return (
                    <div
                      key={event.id}
                      className={`px-6 py-3 flex items-start gap-3 ${
                        hasCrmMatch ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <div className="text-gray-400 flex-shrink-0 mt-0.5">
                        {event.isOnlineMeeting ? <VideoClip24Regular /> : <People24Regular />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {event.subject}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatTime(event.start.dateTime)} - {formatTime(event.end.dateTime)}
                        </p>
                        {event.location?.displayName && (
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <Location24Regular className="w-3 h-3" />
                            {event.location.displayName}
                          </p>
                        )}
                        {hasCrmMatch && (
                          <div className="flex items-center gap-1 mt-1">
                            {crmAttendees.map((match, i) => (
                              <Badge
                                key={i}
                                appearance="filled"
                                color="informative"
                                size="small"
                              >
                                {match!.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <Button
                        appearance="subtle"
                        size="small"
                        onClick={() => handleLogActivity(event)}
                        title="Log as Activity"
                      >
                        Log
                      </Button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
