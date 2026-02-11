import { Badge } from '@fluentui/react-components';
import { useNavigate } from 'react-router-dom';
import type { Opportunity } from '@/types';

interface PipelineCardProps {
  opportunity: Opportunity;
}

const formatCurrency = (value?: number) =>
  value != null ? `$${value.toLocaleString()}` : '';

export function PipelineCard({ opportunity }: PipelineCardProps) {
  const navigate = useNavigate();

  const daysInStage = Math.floor(
    (Date.now() - new Date(opportunity.Modified).getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div
      onClick={() => navigate(`/opportunities/${opportunity.id}`)}
      className="bg-white rounded-lg border p-3 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 truncate">
            {opportunity.Title}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {opportunity.tss_companyId?.LookupValue}
          </p>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        {opportunity.tss_revenue != null && (
          <span className="text-sm font-semibold text-green-700">
            {formatCurrency(opportunity.tss_revenue)}
          </span>
        )}
        {!opportunity.tss_revenue && <span />}
        <span className="text-xs text-gray-400">{daysInStage}d</span>
      </div>

      <div className="mt-2 flex items-center gap-1 flex-wrap">
        {opportunity.tss_productLine && (
          <Badge appearance="outline" size="small" color="brand">
            {opportunity.tss_productLine}
          </Badge>
        )}
        {opportunity.tss_pursuitDecision && (
          <Badge
            appearance="outline"
            size="small"
            color={
              opportunity.tss_pursuitDecision === 'Pursue'
                ? 'success'
                : opportunity.tss_pursuitDecision === 'No-Bid'
                  ? 'danger'
                  : 'warning'
            }
          >
            {opportunity.tss_pursuitDecision}
          </Badge>
        )}
      </div>

      <p className="mt-1 text-[10px] text-gray-400 font-mono">
        {opportunity.tss_opportunityId}
      </p>
    </div>
  );
}
