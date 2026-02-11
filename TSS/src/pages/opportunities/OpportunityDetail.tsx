import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button, Badge, Dropdown, Option } from '@fluentui/react-components';
import { Edit24Regular } from '@fluentui/react-icons';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { useOpportunity, useUpdateOpportunity } from '@/hooks/useOpportunities';
import {
  OPPORTUNITY_STAGES,
  STAGE_COLORS,
  type OpportunityStage,
  type CloseStatus,
  type PursuitDecision,
} from '@/types';

type BadgeColor = 'informative' | 'warning' | 'severe' | 'important' | 'success' | 'subtle' | 'danger';

const formatCurrency = (value?: number) =>
  value != null ? `$${value.toLocaleString()}` : '—';

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString() : '—';

const CLOSE_STATUS_COLORS: Record<CloseStatus, BadgeColor> = {
  Won: 'success',
  Lost: 'danger',
  Cancelled: 'warning',
};

const PURSUIT_DECISION_COLORS: Record<PursuitDecision, BadgeColor> = {
  Pursue: 'success',
  'No-Bid': 'danger',
  Pending: 'warning',
};

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-4 py-1.5">
      <dt className="w-36 text-sm font-medium text-gray-500 flex-shrink-0">{label}</dt>
      <dd className="text-sm text-gray-900">{value}</dd>
    </div>
  );
}

export function OpportunityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const opportunityId = id ? Number(id) : undefined;
  const { data: opportunity, isLoading, error, refetch } = useOpportunity(opportunityId);
  const updateOpportunity = useUpdateOpportunity();

  if (isLoading) return <LoadingState message="Loading opportunity..." />;
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!opportunity) return <ErrorState message="Opportunity not found" />;

  const handleStageChange = async (newStage: OpportunityStage) => {
    if (!opportunityId || newStage === opportunity.tss_stage) return;
    await updateOpportunity.mutateAsync({
      id: opportunityId,
      data: { tss_stage: newStage },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={opportunity.Title}
        subtitle={opportunity.tss_opportunityId}
        actions={
          <>
            <Dropdown
              placeholder="Change Stage"
              value={opportunity.tss_stage}
              onOptionSelect={(_, data) => {
                if (data.optionValue) {
                  handleStageChange(data.optionValue as OpportunityStage);
                }
              }}
              className="w-44"
            >
              {OPPORTUNITY_STAGES.map((s) => (
                <Option key={s} value={s}>{s}</Option>
              ))}
            </Dropdown>
            <Button
              appearance="secondary"
              icon={<Edit24Regular />}
              onClick={() => navigate(`/opportunities/${opportunityId}/edit`)}
            >
              Edit
            </Button>
          </>
        }
      />

      <Badge
        appearance="filled"
        color={STAGE_COLORS[opportunity.tss_stage] as BadgeColor}
      >
        {opportunity.tss_stage}
      </Badge>

      {/* Deal Info */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Deal Info</h3>
        <dl>
          <InfoRow label="Revenue" value={formatCurrency(opportunity.tss_revenue)} />
          <InfoRow
            label="Probability"
            value={opportunity.tss_probability != null ? `${opportunity.tss_probability}%` : null}
          />
          <InfoRow label="Product Line" value={opportunity.tss_productLine} />
          <InfoRow label="Basin" value={opportunity.tss_basin} />
          <InfoRow label="PO Number" value={opportunity.tss_poNumber} />
          {opportunity.tss_isTaxExempt != null && (
            <div className="flex gap-4 py-1.5">
              <dt className="w-36 text-sm font-medium text-gray-500 flex-shrink-0">Tax Exempt</dt>
              <dd>
                <Badge
                  appearance="filled"
                  color={opportunity.tss_isTaxExempt ? 'success' : 'subtle'}
                >
                  {opportunity.tss_isTaxExempt ? 'Yes' : 'No'}
                </Badge>
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Dates */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Dates</h3>
        <dl>
          <InfoRow label="Bid Due Date" value={formatDate(opportunity.tss_bidDueDate)} />
          <InfoRow label="Delivery Date" value={formatDate(opportunity.tss_deliveryDate)} />
          <InfoRow label="Close Date" value={formatDate(opportunity.tss_closeDate)} />
        </dl>
      </div>

      {/* Pursuit */}
      {(opportunity.tss_pursuitDecision || opportunity.tss_pursuitRationale) && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Pursuit</h3>
          <dl>
            {opportunity.tss_pursuitDecision && (
              <div className="flex gap-4 py-1.5">
                <dt className="w-36 text-sm font-medium text-gray-500 flex-shrink-0">Decision</dt>
                <dd>
                  <Badge
                    appearance="filled"
                    color={PURSUIT_DECISION_COLORS[opportunity.tss_pursuitDecision]}
                  >
                    {opportunity.tss_pursuitDecision}
                  </Badge>
                </dd>
              </div>
            )}
            <InfoRow label="Rationale" value={opportunity.tss_pursuitRationale} />
          </dl>
        </div>
      )}

      {/* Close Info */}
      {(opportunity.tss_stage === 'Close' || opportunity.tss_closeStatus) && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Close Info</h3>
          <dl>
            {opportunity.tss_closeStatus && (
              <div className="flex gap-4 py-1.5">
                <dt className="w-36 text-sm font-medium text-gray-500 flex-shrink-0">Close Status</dt>
                <dd>
                  <Badge
                    appearance="filled"
                    color={CLOSE_STATUS_COLORS[opportunity.tss_closeStatus]}
                  >
                    {opportunity.tss_closeStatus}
                  </Badge>
                </dd>
              </div>
            )}
            <InfoRow label="Close Reason" value={opportunity.tss_closeReason} />
          </dl>
        </div>
      )}

      {/* Related */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Related</h3>
        <dl>
          <div className="flex gap-4 py-1.5">
            <dt className="w-36 text-sm font-medium text-gray-500 flex-shrink-0">Company</dt>
            <dd>
              <Link
                to={`/companies/${opportunity.tss_companyId.LookupId}`}
                className="text-sm text-blue-600 hover:underline"
              >
                {opportunity.tss_companyId.LookupValue}
              </Link>
            </dd>
          </div>
          {opportunity.tss_primaryContactId && (
            <div className="flex gap-4 py-1.5">
              <dt className="w-36 text-sm font-medium text-gray-500 flex-shrink-0">Primary Contact</dt>
              <dd>
                <Link
                  to={`/contacts/${opportunity.tss_primaryContactId.LookupId}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {opportunity.tss_primaryContactId.LookupValue}
                </Link>
              </dd>
            </div>
          )}
          {opportunity.tss_relatedOpportunityId && (
            <div className="flex gap-4 py-1.5">
              <dt className="w-36 text-sm font-medium text-gray-500 flex-shrink-0">Related Opportunity</dt>
              <dd>
                <Link
                  to={`/opportunities/${opportunity.tss_relatedOpportunityId.LookupId}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {opportunity.tss_relatedOpportunityId.LookupValue}
                </Link>
              </dd>
            </div>
          )}
          <div className="flex gap-4 py-1.5">
            <dt className="w-36 text-sm font-medium text-gray-500 flex-shrink-0">Owner</dt>
            <dd className="text-sm text-gray-900">
              {opportunity.tss_owner.LookupValue}
              {opportunity.tss_owner.Email && (
                <span className="text-gray-500"> ({opportunity.tss_owner.Email})</span>
              )}
            </dd>
          </div>
        </dl>
      </div>

      {/* Notes */}
      {opportunity.tss_notes && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Notes</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{opportunity.tss_notes}</p>
        </div>
      )}
    </div>
  );
}
