import { useParams, useNavigate } from 'react-router-dom';
import { Button, Badge } from '@fluentui/react-components';
import { Edit24Regular, Delete24Regular } from '@fluentui/react-icons';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useBasinRegion, useDeleteBasinRegion } from '@/hooks/useBasinRegions';
import { useLookupMaps } from '@/hooks/useLookupMaps';
import { useState } from 'react';

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-4 py-1.5">
      <dt className="w-36 text-sm font-medium text-gray-500 flex-shrink-0">{label}</dt>
      <dd className="text-sm text-gray-900">{value}</dd>
    </div>
  );
}

export function BasinRegionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const basinId = id ? Number(id) : undefined;
  const { data: basin, isLoading, error, refetch } = useBasinRegion(basinId);
  const deleteBasin = useDeleteBasinRegion();
  const { countryMap, resolve } = useLookupMaps();

  if (isLoading) return <LoadingState message="Loading basin/region..." />;
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!basin) return <ErrorState message="Basin/Region not found" />;

  const handleDelete = async () => {
    if (!basinId) return;
    await deleteBasin.mutateAsync(basinId);
    navigate('/basin-regions');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={basin.Title}
        subtitle={basin.tss_basinCode}
        actions={
          <>
            <Button
              appearance="secondary"
              icon={<Edit24Regular />}
              onClick={() => navigate(`/basin-regions/${basinId}/edit`)}
            >
              Edit
            </Button>
            <Button
              appearance="subtle"
              icon={<Delete24Regular />}
              onClick={() => setShowDeleteDialog(true)}
            >
              Deactivate
            </Button>
          </>
        }
      />

      <Badge appearance="filled" color={basin.tss_isActive ? 'success' : 'danger'}>
        {basin.tss_isActive ? 'Active' : 'Inactive'}
      </Badge>

      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Basin/Region Information</h3>
        <dl>
          <InfoRow label="Name" value={basin.Title} />
          <InfoRow label="Code" value={basin.tss_basinCode} />
          <InfoRow label="Country" value={resolve(basin.tss_countryId?.LookupId, countryMap)} />
          <InfoRow label="Description" value={basin.tss_description} />
        </dl>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Deactivate Basin/Region"
        message={`Are you sure you want to deactivate "${basin.Title}"? It will be hidden from active lists.`}
        confirmLabel="Deactivate"
        onConfirm={handleDelete}
        danger
      />
    </div>
  );
}
