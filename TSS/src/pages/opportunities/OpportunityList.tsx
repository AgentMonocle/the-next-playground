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
import { useOpportunities, type UseOpportunitiesOptions } from '@/hooks/useOpportunities';
import type { Opportunity } from '@/types';
import { OPPORTUNITY_STAGES, STAGE_COLORS, PRODUCT_LINES, BASINS } from '@/types';

type BadgeColor = 'informative' | 'warning' | 'severe' | 'important' | 'success' | 'subtle';

const formatCurrency = (value?: number) =>
  value != null ? `$${value.toLocaleString()}` : '—';

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString() : '—';

const columns: TableColumnDefinition<Opportunity>[] = [
  createTableColumn<Opportunity>({
    columnId: 'opportunityId',
    compare: (a, b) => a.tss_opportunityId.localeCompare(b.tss_opportunityId),
    renderHeaderCell: () => 'Opportunity ID',
    renderCell: (item) => (
      <span className="font-mono text-sm text-gray-600">{item.tss_opportunityId}</span>
    ),
  }),
  createTableColumn<Opportunity>({
    columnId: 'name',
    compare: (a, b) => a.Title.localeCompare(b.Title),
    renderHeaderCell: () => 'Name',
    renderCell: (item) => (
      <span className="font-medium text-gray-900">{item.Title}</span>
    ),
  }),
  createTableColumn<Opportunity>({
    columnId: 'company',
    compare: (a, b) => a.tss_companyId.LookupValue.localeCompare(b.tss_companyId.LookupValue),
    renderHeaderCell: () => 'Company',
    renderCell: (item) => item.tss_companyId.LookupValue,
  }),
  createTableColumn<Opportunity>({
    columnId: 'stage',
    compare: (a, b) => a.tss_stage.localeCompare(b.tss_stage),
    renderHeaderCell: () => 'Stage',
    renderCell: (item) => (
      <Badge
        appearance="filled"
        color={STAGE_COLORS[item.tss_stage] as BadgeColor}
      >
        {item.tss_stage}
      </Badge>
    ),
  }),
  createTableColumn<Opportunity>({
    columnId: 'revenue',
    compare: (a, b) => (a.tss_revenue ?? 0) - (b.tss_revenue ?? 0),
    renderHeaderCell: () => 'Revenue',
    renderCell: (item) => formatCurrency(item.tss_revenue),
  }),
  createTableColumn<Opportunity>({
    columnId: 'productLine',
    compare: (a, b) => (a.tss_productLine ?? '').localeCompare(b.tss_productLine ?? ''),
    renderHeaderCell: () => 'Product Line',
    renderCell: (item) => item.tss_productLine ?? '—',
  }),
  createTableColumn<Opportunity>({
    columnId: 'closeDate',
    compare: (a, b) => (a.tss_closeDate ?? '').localeCompare(b.tss_closeDate ?? ''),
    renderHeaderCell: () => 'Close Date',
    renderCell: (item) => formatDate(item.tss_closeDate),
  }),
];

export function OpportunityList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState<string>('');
  const [productLine, setProductLine] = useState<string>('');
  const [basin, setBasin] = useState<string>('');

  const options: UseOpportunitiesOptions = useMemo(
    () => ({
      search: search || undefined,
      stage: stage || undefined,
      productLine: productLine || undefined,
      basin: basin || undefined,
    }),
    [search, stage, productLine, basin]
  );

  const { data: opportunities, isLoading, error, refetch } = useOpportunities(options);

  if (isLoading) return <LoadingState message="Loading opportunities..." />;
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Opportunities"
        subtitle={`${opportunities?.length ?? 0} opportunities`}
        createLabel="New Opportunity"
        createPath="/opportunities/new"
      />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by ID or name..."
        />
        <Dropdown
          placeholder="Stage"
          value={stage}
          onOptionSelect={(_, data) => setStage(data.optionValue ?? '')}
          clearable
          className="w-44"
        >
          {OPPORTUNITY_STAGES.map((s) => (
            <Option key={s} value={s}>{s}</Option>
          ))}
        </Dropdown>
        <Dropdown
          placeholder="Product Line"
          value={productLine}
          onOptionSelect={(_, data) => setProductLine(data.optionValue ?? '')}
          clearable
          className="w-44"
        >
          {PRODUCT_LINES.map((pl) => (
            <Option key={pl} value={pl}>{pl}</Option>
          ))}
        </Dropdown>
        <Dropdown
          placeholder="Basin"
          value={basin}
          onOptionSelect={(_, data) => setBasin(data.optionValue ?? '')}
          clearable
          className="w-44"
        >
          {BASINS.map((b) => (
            <Option key={b} value={b}>{b}</Option>
          ))}
        </Dropdown>
      </div>

      {/* Data Grid */}
      {!opportunities || opportunities.length === 0 ? (
        <EmptyState
          title="No opportunities found"
          description="Try adjusting your search or filters, or create a new opportunity."
          createLabel="New Opportunity"
          createPath="/opportunities/new"
        />
      ) : (
        <DataGrid
          items={opportunities}
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
          <DataGridBody<Opportunity>>
            {({ item, rowId }) => (
              <DataGridRow<Opportunity>
                key={rowId}
                onClick={() => navigate(`/opportunities/${item.id}`)}
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
