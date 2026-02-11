import type { Opportunity, OpportunityStage } from '@/types';
import { STAGE_COLORS } from '@/types';
import { PipelineCard } from './PipelineCard';

interface PipelineColumnProps {
  stage: OpportunityStage;
  opportunities: Opportunity[];
  companyMap?: Map<number, string>;
  onDrop?: (opportunityId: number, newStage: OpportunityStage) => void;
}

const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

const stageHeaderColors: Record<string, string> = {
  informative: 'bg-blue-500',
  warning: 'bg-yellow-500',
  severe: 'bg-orange-500',
  important: 'bg-red-500',
  success: 'bg-green-500',
  subtle: 'bg-gray-400',
};

export function PipelineColumn({ stage, opportunities, companyMap, onDrop }: PipelineColumnProps) {
  const totalRevenue = opportunities.reduce((sum, o) => sum + (o.tss_revenue ?? 0), 0);
  const colorKey = STAGE_COLORS[stage];
  const headerColor = stageHeaderColors[colorKey] ?? 'bg-gray-400';

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const opportunityId = Number(e.dataTransfer.getData('text/plain'));
    if (opportunityId && onDrop) {
      onDrop(opportunityId, stage);
    }
  };

  const handleDragStart = (e: React.DragEvent, opportunityId: number) => {
    e.dataTransfer.setData('text/plain', String(opportunityId));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className="flex flex-col min-w-[260px] max-w-[320px] flex-1"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Column Header */}
      <div className="rounded-t-lg overflow-hidden">
        <div className={`${headerColor} h-1`} />
        <div className="bg-white border border-t-0 px-3 py-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">{stage}</h3>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
              {opportunities.length}
            </span>
          </div>
          {totalRevenue > 0 && (
            <p className="text-xs text-gray-500 mt-0.5">
              {formatCurrency(totalRevenue)}
            </p>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="flex-1 bg-gray-50 border border-t-0 rounded-b-lg p-2 space-y-2 min-h-[200px] overflow-y-auto max-h-[calc(100vh-280px)]">
        {opportunities.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">No opportunities</p>
        ) : (
          opportunities.map((opp) => (
            <div
              key={opp.id}
              draggable
              onDragStart={(e) => handleDragStart(e, opp.id)}
              className="cursor-grab active:cursor-grabbing"
            >
              <PipelineCard
                opportunity={opp}
                companyName={companyMap?.get(opp.tss_companyId?.LookupId) ?? undefined}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
