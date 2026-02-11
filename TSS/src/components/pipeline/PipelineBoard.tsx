import type { Opportunity, OpportunityStage } from '@/types';
import { OPPORTUNITY_STAGES } from '@/types';
import { PipelineColumn } from './PipelineColumn';

interface PipelineBoardProps {
  data: Record<OpportunityStage, Opportunity[]>;
  onStageChange: (opportunityId: number, newStage: OpportunityStage) => void;
}

export function PipelineBoard({ data, onStageChange }: PipelineBoardProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {OPPORTUNITY_STAGES.map((stage) => (
        <PipelineColumn
          key={stage}
          stage={stage}
          opportunities={data[stage] ?? []}
          onDrop={onStageChange}
        />
      ))}
    </div>
  );
}
