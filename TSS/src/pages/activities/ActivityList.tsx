import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DataGrid,
  DataGridHeader,
  DataGridRow,
  DataGridHeaderCell,
  DataGridBody,
  DataGridCell,
  Badge,
  Dropdown,
  Option,
  type TableColumnDefinition,
  createTableColumn,
} from '@fluentui/react-components';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchBar } from '@/components/shared/SearchBar';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { useActivities, type UseActivitiesOptions } from '@/hooks/useActivities';
import { useLookupMaps } from '@/hooks/useLookupMaps';
import type { Activity } from '@/types';
import { ACTIVITY_TYPES } from '@/types';

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

type BadgeColor = 'informative' | 'warning' | 'severe' | 'important' | 'success' | 'subtle';

const formatDateTime = (value?: string) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';

export function ActivityList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [activityType, setActivityType] = useState<string>('');

  const options: UseActivitiesOptions = useMemo(
    () => ({
      search: search || undefined,
      activityType: activityType || undefined,
    }),
    [search, activityType]
  );

  const { data: activities, isLoading, error, refetch } = useActivities(options);
  const { companyMap, contactMap, resolve } = useLookupMaps();

  const columns: TableColumnDefinition<Activity>[] = useMemo(() => [
    createTableColumn<Activity>({
      columnId: 'date',
      compare: (a, b) => (a.tss_activityDate ?? '').localeCompare(b.tss_activityDate ?? ''),
      renderHeaderCell: () => 'Date',
      renderCell: (item) => (
        <span className="text-sm text-gray-600">{formatDateTime(item.tss_activityDate)}</span>
      ),
    }),
    createTableColumn<Activity>({
      columnId: 'subject',
      compare: (a, b) => a.Title.localeCompare(b.Title),
      renderHeaderCell: () => 'Subject',
      renderCell: (item) => (
        <span className="font-medium text-gray-900">{item.Title}</span>
      ),
    }),
    createTableColumn<Activity>({
      columnId: 'type',
      compare: (a, b) => a.tss_activityType.localeCompare(b.tss_activityType),
      renderHeaderCell: () => 'Type',
      renderCell: (item) => (
        <Badge
          appearance="filled"
          color={(ACTIVITY_TYPE_COLORS[item.tss_activityType] ?? 'subtle') as BadgeColor}
          size="small"
        >
          {item.tss_activityType}
        </Badge>
      ),
    }),
    createTableColumn<Activity>({
      columnId: 'company',
      renderHeaderCell: () => 'Company',
      renderCell: (item) => resolve(item.tss_companyId?.LookupId, companyMap),
    }),
    createTableColumn<Activity>({
      columnId: 'contact',
      renderHeaderCell: () => 'Contact',
      renderCell: (item) => resolve(item.tss_contactId?.LookupId, contactMap),
    }),
    createTableColumn<Activity>({
      columnId: 'owner',
      compare: (a, b) => a.tss_owner.localeCompare(b.tss_owner),
      renderHeaderCell: () => 'Owner',
      renderCell: (item) => item.tss_owner,
    }),
    createTableColumn<Activity>({
      columnId: 'direction',
      renderHeaderCell: () => 'Direction',
      renderCell: (item) => item.tss_direction ?? '—',
    }),
  ], [companyMap, contactMap]);

  if (isLoading) return <LoadingState message="Loading activities..." />;
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Activities"
        subtitle={`${activities?.length ?? 0} activities`}
        createLabel="Log Activity"
        createPath="/activities/new"
      />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by subject..."
        />
        <Dropdown
          placeholder="Activity Type"
          value={activityType}
          onOptionSelect={(_, data) => setActivityType(data.optionValue ?? '')}
          clearable
          className="w-44"
        >
          {ACTIVITY_TYPES.map((t) => (
            <Option key={t} value={t}>{t}</Option>
          ))}
        </Dropdown>
      </div>

      {/* Data Grid */}
      {!activities || activities.length === 0 ? (
        <EmptyState
          title="No activities found"
          description="Try adjusting your search or filters, or log a new activity."
          createLabel="Log Activity"
          createPath="/activities/new"
        />
      ) : (
        <DataGrid
          items={activities}
          columns={columns}
          sortable
          getRowId={(item) => String(item.id)}
          focusMode="composite"
          className="bg-white rounded-lg border"
        >
          <DataGridHeader>
            <DataGridRow>
              {({ renderHeaderCell }) => (
                <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
              )}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<Activity>>
            {({ item, rowId }) => (
              <DataGridRow<Activity>
                key={rowId}
                onClick={() => navigate(`/activities/${item.id}`)}
                className="cursor-pointer hover:bg-gray-50"
              >
                {({ renderCell }) => (
                  <DataGridCell>{renderCell(item)}</DataGridCell>
                )}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      )}
    </div>
  );
}
