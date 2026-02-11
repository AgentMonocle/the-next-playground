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
import { useCompanies, type UseCompaniesOptions } from '@/hooks/useCompanies';
import { useCountries } from '@/hooks/useReferenceData';
import type { Company } from '@/types';
import { INDUSTRIES, COMPANY_TYPES, BASINS } from '@/types';

export function CompanyList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState<string>('');
  const [companyType, setCompanyType] = useState<string>('');
  const [basin, setBasin] = useState<string>('');

  const options: UseCompaniesOptions = useMemo(
    () => ({
      search: search || undefined,
      industry: industry || undefined,
      companyType: companyType || undefined,
      basin: basin || undefined,
    }),
    [search, industry, companyType, basin]
  );

  const { data: companies, isLoading, error, refetch } = useCompanies(options);
  const { data: countries } = useCountries();

  // Build country lookup map: SharePoint ID → country name
  const countryMap = useMemo(() => {
    const map = new Map<number, string>();
    if (countries) {
      for (const c of countries) {
        map.set(c.id, c.Title);
      }
    }
    return map;
  }, [countries]);

  const getCountryName = (company: Company): string =>
    (company.tss_countryId?.LookupId && countryMap.get(company.tss_countryId.LookupId)) || '—';

  const columns: TableColumnDefinition<Company>[] = useMemo(() => [
    createTableColumn<Company>({
      columnId: 'name',
      compare: (a, b) => a.Title.localeCompare(b.Title),
      renderHeaderCell: () => 'Company Name',
      renderCell: (item) => (
        <span className="font-medium text-gray-900">{item.Title}</span>
      ),
    }),
    createTableColumn<Company>({
      columnId: 'code',
      compare: (a, b) => a.tss_companyCode.localeCompare(b.tss_companyCode),
      renderHeaderCell: () => 'Code',
      renderCell: (item) => (
        <span className="font-mono text-sm text-gray-600">{item.tss_companyCode}</span>
      ),
    }),
    createTableColumn<Company>({
      columnId: 'industry',
      compare: (a, b) => (a.tss_industry ?? '').localeCompare(b.tss_industry ?? ''),
      renderHeaderCell: () => 'Industry',
      renderCell: (item) => item.tss_industry ?? '—',
    }),
    createTableColumn<Company>({
      columnId: 'type',
      compare: (a, b) => (a.tss_companyType ?? '').localeCompare(b.tss_companyType ?? ''),
      renderHeaderCell: () => 'Type',
      renderCell: (item) => item.tss_companyType ?? '—',
    }),
    createTableColumn<Company>({
      columnId: 'country',
      renderHeaderCell: () => 'Country',
      renderCell: (item) => getCountryName(item),
    }),
    createTableColumn<Company>({
      columnId: 'basin',
      renderHeaderCell: () => 'Basin',
      renderCell: (item) => item.tss_basin ?? '—',
    }),
    createTableColumn<Company>({
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
  ], [countryMap]);

  if (isLoading) return <LoadingState message="Loading companies..." />;
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Companies"
        subtitle={`${companies?.length ?? 0} companies`}
        createLabel="New Company"
        createPath="/companies/new"
      />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name or code..."
        />
        <Dropdown
          placeholder="Industry"
          value={industry}
          onOptionSelect={(_, data) => setIndustry(data.optionValue ?? '')}
          clearable
          className="w-44"
        >
          {INDUSTRIES.map((i) => (
            <Option key={i} value={i}>{i}</Option>
          ))}
        </Dropdown>
        <Dropdown
          placeholder="Type"
          value={companyType}
          onOptionSelect={(_, data) => setCompanyType(data.optionValue ?? '')}
          clearable
          className="w-44"
        >
          {COMPANY_TYPES.map((t) => (
            <Option key={t} value={t}>{t}</Option>
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
      {!companies || companies.length === 0 ? (
        <EmptyState
          title="No companies found"
          description="Try adjusting your search or filters, or create a new company."
          createLabel="New Company"
          createPath="/companies/new"
        />
      ) : (
        <DataGrid
          items={companies}
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
          <DataGridBody<Company>>
            {({ item, rowId }) => (
              <DataGridRow<Company>
                key={rowId}
                onClick={() => navigate(`/companies/${item.id}`)}
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
