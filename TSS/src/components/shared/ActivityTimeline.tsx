import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Badge, Button } from '@fluentui/react-components';
import {
  Mail24Regular,
  Call24Regular,
  People24Regular,
  Location24Regular,
  Building24Regular,
  Book24Regular,
  Note24Regular,
  Document24Regular,
  Receipt24Regular,
  VehicleTruck24Regular,
  Add24Regular,
  ChevronDown24Regular,
} from '@fluentui/react-icons';
import type { Activity } from '@/types';

// ─── Icon Mapping ───────────────────────────────────────────────────────────

const ACTIVITY_ICONS: Record<string, React.ReactElement> = {
  Email: <Mail24Regular />,
  Call: <Call24Regular />,
  Meeting: <People24Regular />,
  'Site Visit': <Location24Regular />,
  'Trade Show': <Building24Regular />,
  Training: <Book24Regular />,
  'Internal Note': <Note24Regular />,
  'Quote Sent': <Document24Regular />,
  'PO Received': <Receipt24Regular />,
  Shipment: <VehicleTruck24Regular />,
};

const ACTIVITY_COLORS: Record<string, string> = {
  Email: 'text-blue-600 bg-blue-50',
  Call: 'text-green-600 bg-green-50',
  Meeting: 'text-amber-600 bg-amber-50',
  'Site Visit': 'text-red-600 bg-red-50',
  'Trade Show': 'text-purple-600 bg-purple-50',
  Training: 'text-gray-600 bg-gray-50',
  'Internal Note': 'text-gray-500 bg-gray-50',
  'Quote Sent': 'text-orange-600 bg-orange-50',
  'PO Received': 'text-green-700 bg-green-50',
  Shipment: 'text-sky-600 bg-sky-50',
};

type BadgeColor = 'informative' | 'warning' | 'severe' | 'important' | 'success' | 'subtle';

const TYPE_BADGE_COLORS: Record<string, string> = {
  Email: 'informative',
  Call: 'success',
  Meeting: 'warning',
  'Site Visit': 'severe',
  'Trade Show': 'important',
  Training: 'subtle',
  'Internal Note': 'subtle',
  'Quote Sent': 'important',
  'PO Received': 'success',
  Shipment: 'informative',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// ─── Component ──────────────────────────────────────────────────────────────

interface ActivityTimelineProps {
  activities: Activity[] | undefined;
  isLoading: boolean;
  /** Entity context for quick-entry pre-fill */
  entityType?: 'company' | 'contact' | 'opportunity';
  entityId?: number;
  /** Extra params for the "Log Activity" link (e.g., companyId from contact's company) */
  extraParams?: Record<string, string>;
  /** Max items to show initially (default 10) */
  initialLimit?: number;
}

export function ActivityTimeline({
  activities,
  isLoading,
  entityType,
  entityId,
  extraParams,
  initialLimit = 10,
}: ActivityTimelineProps) {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);

  const displayActivities = useMemo(() => {
    if (!activities) return [];
    return showAll ? activities : activities.slice(0, initialLimit);
  }, [activities, showAll, initialLimit]);

  const hasMore = (activities?.length ?? 0) > initialLimit;

  // Build URL params for new activity pre-fill
  const newActivityUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (entityType && entityId) {
      const paramName =
        entityType === 'company' ? 'companyId' :
        entityType === 'contact' ? 'contactId' :
        'opportunityId';
      params.set(paramName, String(entityId));
    }
    if (extraParams) {
      for (const [key, value] of Object.entries(extraParams)) {
        params.set(key, value);
      }
    }
    const qs = params.toString();
    return `/activities/new${qs ? `?${qs}` : ''}`;
  }, [entityType, entityId, extraParams]);

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">
          Activity History ({activities?.length ?? 0})
        </h3>
        <Button
          appearance="subtle"
          size="small"
          icon={<Add24Regular />}
          onClick={() => navigate(newActivityUrl)}
        >
          Log Activity
        </Button>
      </div>

      {isLoading && (
        <p className="text-sm text-gray-400 py-4">Loading activities...</p>
      )}

      {!isLoading && displayActivities.length === 0 && (
        <p className="text-sm text-gray-400 py-4">No activities recorded yet.</p>
      )}

      {displayActivities.length > 0 && (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-2 bottom-2 w-px bg-gray-200" />

          <div className="space-y-1">
            {displayActivities.map((activity) => (
              <div key={activity.id} className="relative flex gap-4 py-2 pl-0">
                {/* Icon */}
                <div
                  className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    ACTIVITY_COLORS[activity.tss_activityType] ?? 'text-gray-500 bg-gray-50'
                  }`}
                >
                  {ACTIVITY_ICONS[activity.tss_activityType] ?? <Note24Regular />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        to={`/activities/${activity.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline"
                      >
                        {activity.Title}
                      </Link>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge
                          appearance="filled"
                          color={(TYPE_BADGE_COLORS[activity.tss_activityType] ?? 'subtle') as BadgeColor}
                          size="small"
                        >
                          {activity.tss_activityType}
                        </Badge>
                        {activity.tss_direction && (
                          <Badge appearance="outline" size="small" color="informative">
                            {activity.tss_direction}
                          </Badge>
                        )}
                        {activity.tss_isAutoCreated && (
                          <Badge appearance="outline" size="small" color="subtle">
                            Auto
                          </Badge>
                        )}
                        <span className="text-xs text-gray-400">
                          {activity.tss_owner}
                        </span>
                      </div>
                    </div>
                    <span
                      className="text-xs text-gray-400 flex-shrink-0 mt-0.5"
                      title={formatFullDate(activity.tss_activityDate)}
                    >
                      {formatRelativeTime(activity.tss_activityDate)}
                    </span>
                  </div>

                  {/* Description (truncated) */}
                  {activity.tss_description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {activity.tss_description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Show More / Show Less */}
      {hasMore && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <Button
            appearance="transparent"
            size="small"
            icon={<ChevronDown24Regular />}
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show less' : `Show all ${activities?.length} activities`}
          </Button>
        </div>
      )}
    </div>
  );
}
