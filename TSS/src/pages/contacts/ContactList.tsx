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
import { useContacts, type UseContactsOptions } from '@/hooks/useContacts';
import { useCompanies } from '@/hooks/useCompanies';
import type { Contact } from '@/types';
import { DEPARTMENTS } from '@/types';

export function ContactList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState<string>('');

  const options: UseContactsOptions = useMemo(
    () => ({
      search: search || undefined,
      department: department || undefined,
      isActive: true,
    }),
    [search, department]
  );

  const { data: contacts, isLoading, error, refetch } = useContacts(options);
  const { data: companies } = useCompanies();

  // Build company lookup map: SharePoint ID → company name
  const companyMap = useMemo(() => {
    const map = new Map<number, string>();
    if (companies) {
      for (const c of companies) {
        map.set(c.id, c.Title);
      }
    }
    return map;
  }, [companies]);

  const getCompanyName = (contact: Contact): string =>
    (contact.tss_companyId?.LookupId && companyMap.get(contact.tss_companyId.LookupId)) || '—';

  const columns: TableColumnDefinition<Contact>[] = useMemo(() => [
    createTableColumn<Contact>({
      columnId: 'name',
      compare: (a, b) => a.Title.localeCompare(b.Title),
      renderHeaderCell: () => 'Full Name',
      renderCell: (item) => (
        <span className="font-medium text-gray-900">{item.Title}</span>
      ),
    }),
    createTableColumn<Contact>({
      columnId: 'email',
      compare: (a, b) => (a.tss_email ?? '').localeCompare(b.tss_email ?? ''),
      renderHeaderCell: () => 'Email',
      renderCell: (item) => (
        <span className="text-sm truncate">{item.tss_email ?? '—'}</span>
      ),
    }),
    createTableColumn<Contact>({
      columnId: 'phone',
      renderHeaderCell: () => 'Phone',
      renderCell: (item) => (
        <span className="text-sm truncate">{item.tss_phone ?? '—'}</span>
      ),
    }),
    createTableColumn<Contact>({
      columnId: 'company',
      renderHeaderCell: () => 'Company',
      renderCell: (item) => getCompanyName(item),
    }),
    createTableColumn<Contact>({
      columnId: 'jobTitle',
      compare: (a, b) => (a.tss_jobTitle ?? '').localeCompare(b.tss_jobTitle ?? ''),
      renderHeaderCell: () => 'Job Title',
      renderCell: (item) => item.tss_jobTitle ?? '—',
    }),
    createTableColumn<Contact>({
      columnId: 'decisionMaker',
      renderHeaderCell: () => 'DM',
      renderCell: (item) =>
        item.tss_isDecisionMaker ? (
          <Badge appearance="filled" color="important" size="small">DM</Badge>
        ) : null,
    }),
    createTableColumn<Contact>({
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
  ], [companyMap]);

  if (isLoading) return <LoadingState message="Loading contacts..." />;
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Contacts"
        subtitle={`${contacts?.length ?? 0} contacts`}
        createLabel="New Contact"
        createPath="/contacts/new"
      />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search by name or email..."
        />
        <Dropdown
          placeholder="Department"
          value={department}
          onOptionSelect={(_, data) => setDepartment(data.optionValue ?? '')}
          clearable
          className="w-44"
        >
          {DEPARTMENTS.map((d) => (
            <Option key={d} value={d}>{d}</Option>
          ))}
        </Dropdown>
      </div>

      {/* Data Grid */}
      {!contacts || contacts.length === 0 ? (
        <EmptyState
          title="No contacts found"
          description="Try adjusting your search or filters, or create a new contact."
          createLabel="New Contact"
          createPath="/contacts/new"
        />
      ) : (
        <DataGrid
          items={contacts}
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
          <DataGridBody<Contact>>
            {({ item, rowId }) => (
              <DataGridRow<Contact>
                key={rowId}
                onClick={() => navigate(`/contacts/${item.id}`)}
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
