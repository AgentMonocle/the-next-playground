import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button, Badge } from '@fluentui/react-components';
import { Edit24Regular, Delete24Regular } from '@fluentui/react-icons';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useActivity, useDeleteActivity } from '@/hooks/useActivities';
import { useLookupMaps } from '@/hooks/useLookupMaps';
import { useState } from 'react';

type BadgeColor = 'informative' | 'warning' | 'severe' | 'important' | 'success' | 'subtle';

const ACTIVITY_TYPE_COLORS: Record<string, string> = {
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

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex gap-4 py-1.5">
      <dt className="w-36 text-sm font-medium text-gray-500 flex-shrink-0">{label}</dt>
      <dd className="text-sm text-gray-900">{String(value)}</dd>
    </div>
  );
}

const formatDateTime = (value?: string) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        dateStyle: 'long',
        timeStyle: 'short',
      })
    : '—';

export function ActivityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const activityId = id ? Number(id) : undefined;
  const { data: activity, isLoading, error, refetch } = useActivity(activityId);
  const deleteActivity = useDeleteActivity();
  const { companyMap, contactMap, opportunityMap, resolve } = useLookupMaps();

  if (isLoading) return <LoadingState message="Loading activity..." />;
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!activity) return <ErrorState message="Activity not found" />;

  const handleDelete = async () => {
    if (!activityId) return;
    await deleteActivity.mutateAsync(activityId);
    navigate('/activities');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={activity.Title}
        subtitle={formatDateTime(activity.tss_activityDate)}
        actions={
          <>
            <Button
              appearance="secondary"
              icon={<Edit24Regular />}
              onClick={() => navigate(`/activities/${activityId}/edit`)}
            >
              Edit
            </Button>
            <Button
              appearance="subtle"
              icon={<Delete24Regular />}
              onClick={() => setShowDeleteDialog(true)}
            >
              Delete
            </Button>
          </>
        }
      />

      {/* Type & Direction Badges */}
      <div className="flex items-center gap-2">
        <Badge
          appearance="filled"
          color={(ACTIVITY_TYPE_COLORS[activity.tss_activityType] ?? 'subtle') as BadgeColor}
        >
          {activity.tss_activityType}
        </Badge>
        {activity.tss_direction && (
          <Badge appearance="outline" color="informative">
            {activity.tss_direction}
          </Badge>
        )}
        {activity.tss_isAutoCreated && (
          <Badge appearance="outline" color="subtle">
            Auto
          </Badge>
        )}
      </div>

      {/* Details */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Details</h3>
        <dl>
          <InfoRow label="Owner" value={activity.tss_owner} />
          <InfoRow label="Duration" value={activity.tss_duration ? `${activity.tss_duration} min` : undefined} />
          <InfoRow label="Source" value={activity.tss_source} />
          <InfoRow label="Created" value={formatDateTime(activity.Created)} />
          <InfoRow label="Modified" value={formatDateTime(activity.Modified)} />
        </dl>
      </div>

      {/* Description */}
      {activity.tss_description && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Description</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{activity.tss_description}</p>
        </div>
      )}

      {/* Linked Records */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Linked Records</h3>
        <dl>
          {activity.tss_companyId?.LookupId && (
            <div className="flex gap-4 py-1.5">
              <dt className="w-36 text-sm font-medium text-gray-500 flex-shrink-0">Company</dt>
              <dd>
                <Link
                  to={`/companies/${activity.tss_companyId.LookupId}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {resolve(activity.tss_companyId.LookupId, companyMap)}
                </Link>
              </dd>
            </div>
          )}
          {activity.tss_contactId?.LookupId && (
            <div className="flex gap-4 py-1.5">
              <dt className="w-36 text-sm font-medium text-gray-500 flex-shrink-0">Contact</dt>
              <dd>
                <Link
                  to={`/contacts/${activity.tss_contactId.LookupId}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {resolve(activity.tss_contactId.LookupId, contactMap)}
                </Link>
              </dd>
            </div>
          )}
          {activity.tss_opportunityId?.LookupId && (
            <div className="flex gap-4 py-1.5">
              <dt className="w-36 text-sm font-medium text-gray-500 flex-shrink-0">Opportunity</dt>
              <dd>
                <Link
                  to={`/opportunities/${activity.tss_opportunityId.LookupId}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {resolve(activity.tss_opportunityId.LookupId, opportunityMap)}
                </Link>
              </dd>
            </div>
          )}
          {!activity.tss_companyId?.LookupId && !activity.tss_contactId?.LookupId && !activity.tss_opportunityId?.LookupId && (
            <p className="text-sm text-gray-400">No linked records</p>
          )}
        </dl>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Activity"
        message={`Are you sure you want to permanently delete "${activity.Title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        danger
      />
    </div>
  );
}
