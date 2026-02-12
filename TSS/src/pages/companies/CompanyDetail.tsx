import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button, Badge } from '@fluentui/react-components';
import { Edit24Regular, Delete24Regular, ChevronDown24Regular, ChevronRight24Regular } from '@fluentui/react-icons';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { BasinPicker } from '@/components/shared/BasinPicker';
import { useCompany, useCompanyTree, useDeleteCompany } from '@/hooks/useCompanies';
import { useContactsByCompany } from '@/hooks/useContacts';
import { useOpportunities } from '@/hooks/useOpportunities';
import { useCompanyBasins, useAddCompanyBasin, useRemoveCompanyBasin } from '@/hooks/useBasinRegions';
import { useLookupMaps } from '@/hooks/useLookupMaps';
import { STAGE_COLORS } from '@/types';
import { useState, useMemo } from 'react';

type BadgeColor = 'informative' | 'warning' | 'severe' | 'important' | 'success' | 'subtle';

const formatCurrency = (value?: number) =>
  value != null ? `$${value.toLocaleString()}` : '—';

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString() : '—';

const CLOSED_STAGES = new Set<string>(['Close', 'After Action']);

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-4 py-1.5">
      <dt className="w-36 text-sm font-medium text-gray-500 flex-shrink-0">{label}</dt>
      <dd className="text-sm text-gray-900">{value}</dd>
    </div>
  );
}

export function CompanyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPastOpps, setShowPastOpps] = useState(false);

  const companyId = id ? Number(id) : undefined;
  const { data: company, isLoading, error, refetch } = useCompany(companyId);
  const { data: subsidiaries } = useCompanyTree(companyId);
  const { data: contacts } = useContactsByCompany(companyId);
  const { data: allOpps } = useOpportunities({ companyId, top: 500 });
  const { data: companyBasins } = useCompanyBasins(companyId);
  const addBasin = useAddCompanyBasin();
  const removeBasin = useRemoveCompanyBasin();
  const deleteCompany = useDeleteCompany();
  const { countryMap, companyMap, resolve } = useLookupMaps();

  // Split opps into active and past
  const { activeOpps, pastOpps } = useMemo(() => {
    if (!allOpps) return { activeOpps: [], pastOpps: [] };
    const active = allOpps.filter((o) => !CLOSED_STAGES.has(o.tss_stage));
    const past = allOpps.filter((o) => CLOSED_STAGES.has(o.tss_stage));
    return { activeOpps: active, pastOpps: past };
  }, [allOpps]);

  // Basin IDs from junction records
  const selectedBasinIds = useMemo(
    () => (companyBasins ?? []).map((cb) => cb.tss_basinRegionId.LookupId),
    [companyBasins]
  );

  const handleBasinChange = (newIds: number[]) => {
    if (!companyId) return;
    const currentIds = new Set(selectedBasinIds);
    const targetIds = new Set(newIds);

    // Add new ones
    for (const bid of newIds) {
      if (!currentIds.has(bid)) {
        addBasin.mutate({ companyId, basinRegionId: bid });
      }
    }

    // Remove old ones
    for (const cb of companyBasins ?? []) {
      if (!targetIds.has(cb.tss_basinRegionId.LookupId)) {
        removeBasin.mutate({ junctionId: cb.id, companyId });
      }
    }
  };

  if (isLoading) return <LoadingState message="Loading company..." />;
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!company) return <ErrorState message="Company not found" />;

  const handleDelete = async () => {
    if (!companyId) return;
    await deleteCompany.mutateAsync(companyId);
    navigate('/companies');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={company.Title}
        subtitle={company.tss_companyCode}
        actions={
          <>
            <Button
              appearance="secondary"
              icon={<Edit24Regular />}
              onClick={() => navigate(`/companies/${companyId}/edit`)}
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

      <Badge appearance="filled" color={company.tss_isActive ? 'success' : 'danger'}>
        {company.tss_isActive ? 'Active' : 'Inactive'}
      </Badge>

      {/* General Info */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-semibold text-gray-900 mb-3">General Information</h3>
        <dl>
          <InfoRow label="Industry" value={company.tss_industry} />
          <InfoRow label="Type" value={company.tss_companyType} />
          <InfoRow label="Country" value={resolve(company.tss_countryId?.LookupId, countryMap)} />
        </dl>
      </div>

      {/* Basin/Regions */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Basin/Regions</h3>
        <BasinPicker
          selectedIds={selectedBasinIds}
          onChange={handleBasinChange}
        />
      </div>

      {/* Contact Info */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
        <dl>
          <InfoRow label="Phone" value={company.tss_phone} />
          <InfoRow
            label="Website"
            value={company.tss_website}
          />
          <InfoRow label="Address" value={company.tss_address} />
        </dl>
      </div>

      {/* Parent Company */}
      {company.tss_isSubsidiary && company.tss_parentCompanyId && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Parent Company</h3>
          <Link
            to={`/companies/${company.tss_parentCompanyId.LookupId}`}
            className="text-blue-600 hover:underline"
          >
            {resolve(company.tss_parentCompanyId.LookupId, companyMap)}
          </Link>
        </div>
      )}

      {/* Subsidiaries */}
      {subsidiaries && subsidiaries.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold text-gray-900 mb-3">
            Subsidiaries ({subsidiaries.length})
          </h3>
          <ul className="space-y-1">
            {subsidiaries.map((sub) => (
              <li key={sub.id}>
                <Link
                  to={`/companies/${sub.id}`}
                  className="text-blue-600 hover:underline text-sm"
                >
                  {sub.Title} ({sub.tss_companyCode})
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Active Opportunities */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">
            Active Opportunities ({activeOpps.length})
          </h3>
          <Button
            appearance="subtle"
            size="small"
            onClick={() => navigate(`/opportunities/new?companyId=${companyId}`)}
          >
            New Opportunity
          </Button>
        </div>
        {activeOpps.length > 0 ? (
          <div className="divide-y">
            {activeOpps.map((opp) => (
              <div key={opp.id} className="flex items-center justify-between py-2">
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/opportunities/${opp.id}`}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    {opp.Title}
                  </Link>
                  <p className="text-xs text-gray-500">
                    {opp.tss_opportunityId}
                    {opp.tss_productLine && ` · ${opp.tss_productLine}`}
                    {opp.tss_revenue != null && ` · ${formatCurrency(opp.tss_revenue)}`}
                  </p>
                </div>
                <Badge
                  appearance="filled"
                  color={STAGE_COLORS[opp.tss_stage] as BadgeColor}
                  size="small"
                >
                  {opp.tss_stage}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No active opportunities for this company.</p>
        )}
      </div>

      {/* Past Opportunities (collapsible) */}
      {pastOpps.length > 0 && (
        <div className="bg-white rounded-lg border p-6">
          <button
            type="button"
            className="flex items-center gap-2 w-full text-left"
            onClick={() => setShowPastOpps(!showPastOpps)}
          >
            {showPastOpps ? <ChevronDown24Regular /> : <ChevronRight24Regular />}
            <h3 className="font-semibold text-gray-900">
              Past Opportunities ({pastOpps.length})
            </h3>
          </button>
          {showPastOpps && (
            <div className="divide-y mt-3">
              {pastOpps.map((opp) => (
                <div key={opp.id} className="flex items-center justify-between py-2">
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/opportunities/${opp.id}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      {opp.Title}
                    </Link>
                    <p className="text-xs text-gray-500">
                      {opp.tss_opportunityId}
                      {opp.tss_closeStatus && ` · ${opp.tss_closeStatus}`}
                      {opp.tss_closeDate && ` · ${formatDate(opp.tss_closeDate)}`}
                      {opp.tss_revenue != null && ` · ${formatCurrency(opp.tss_revenue)}`}
                    </p>
                  </div>
                  <Badge
                    appearance="filled"
                    color={STAGE_COLORS[opp.tss_stage] as BadgeColor}
                    size="small"
                  >
                    {opp.tss_stage}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Related Contacts */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">
            Contacts ({contacts?.length ?? 0})
          </h3>
          <Button
            appearance="subtle"
            size="small"
            onClick={() => navigate(`/contacts/new?companyId=${companyId}`)}
          >
            Add Contact
          </Button>
        </div>
        {contacts && contacts.length > 0 ? (
          <div className="divide-y">
            {contacts.map((contact) => (
              <div key={contact.id} className="flex items-center justify-between py-2">
                <div>
                  <Link
                    to={`/contacts/${contact.id}`}
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    {contact.Title}
                  </Link>
                  <p className="text-xs text-gray-500">
                    {contact.tss_jobTitle}
                    {contact.tss_email && ` · ${contact.tss_email}`}
                  </p>
                </div>
                <div className="flex gap-1">
                  {contact.tss_isDecisionMaker && (
                    <Badge appearance="outline" size="small" color="important">DM</Badge>
                  )}
                  {contact.tss_isInfluencer && (
                    <Badge appearance="outline" size="small" color="informative">Inf</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No contacts linked to this company.</p>
        )}
      </div>

      {/* Notes */}
      {company.tss_notes && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Notes</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{company.tss_notes}</p>
        </div>
      )}

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Deactivate Company"
        message={`Are you sure you want to deactivate "${company.Title}"? The company will be hidden from active lists.`}
        confirmLabel="Deactivate"
        onConfirm={handleDelete}
        danger
      />
    </div>
  );
}
