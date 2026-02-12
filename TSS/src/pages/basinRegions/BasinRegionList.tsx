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
  type TableColumnDefinition,
  createTableColumn,
} from '@fluentui/react-components';
import { PageHeader } from '@/components/shared/PageHeader';
import { SearchBar } from '@/components/shared/SearchBar';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { EmptyState } from '@/components/shared/EmptyState';
import { useBasinRegions } from '@/hooks/useBasinRegions';
import type { BasinRegion } from '@/types';

export function BasinRegionList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: basins, isLoading, error, refetch } = useBasinRegions({ search: search || undefined });

  const columns: TableColumnDefinition<BasinRegion>[] = useMemo(() => [
    createTableColumn<BasinRegion>({
      columnId: 'name',
      compare: (a, b) => a.Title.localeCompare(b.Title),
      renderHeaderCell: () => 'Basin/Region',
      renderCell: (item) => (
        <span className="font-medium text-gray-900">{item.Title}</span>
      ),
    }),
    createTableColumn<BasinRegion>({
      columnId: 'code',
      compare: (a, b) => a.tss_basinCode.localeCompare(b.tss_basinCode),
      renderHeaderCell: () => 'Code',
      renderCell: (item) => (
        <span className="font-mono text-sm text-gray-600">{item.tss_basinCode}</span>
      ),
    }),
    createTableColumn<BasinRegion>({
      columnId: 'description',
      renderHeaderCell: () => 'Description',
      renderCell: (item) => (
        <span className="text-sm text-gray-600 truncate">{item.tss_description ?? '—'}</span>
      ),
    }),
    createTableColumn<BasinRegion>({
      columnId: 'active',
      renderHeaderCell: () => 'Status',
      renderCell: (item) => (
        <Badge
          appearance="filled"
          color={item.tss_isActive ? 'success' : 'danger'}
        >
          {item.tss_isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    }),
  ], []);

  if (isLoading) return <LoadingState message="Loading basin/regions..." />;
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Basin/Regions"
        subtitle={`${basins?.length ?? 0} basin/regions`}
        createLabel="New Basin/Region"
        createPath="/basin-regions/new"
      />

      <div className="flex items-center gap-3 flex-wrap">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name or code..."
        />
      </div>

      {!basins || basins.length === 0 ? (
        <EmptyState
          title="No basin/regions found"
          description="Try adjusting your search, or create a new basin/region."
          createLabel="New Basin/Region"
          createPath="/basin-regions/new"
        />
      ) : (
        <DataGrid
          items={basins}
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
          <DataGridBody<BasinRegion>>
            {({ item, rowId }) => (
              <DataGridRow<BasinRegion>
                key={rowId}
                onClick={() => navigate(`/basin-regions/${item.id}`)}
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
