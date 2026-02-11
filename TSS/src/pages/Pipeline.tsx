import { useCallback } from 'react';
import { Button, Dropdown, Option } from '@fluentui/react-components';
import { ArrowReset24Regular } from '@fluentui/react-icons';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { PipelineBoard } from '@/components/pipeline/PipelineBoard';
import { useOpportunitiesByStage, useUpdateOpportunity } from '@/hooks/useOpportunities';
import { useUIStore } from '@/stores/uiStore';
import { OPPORTUNITY_STAGES, BASINS, PRODUCT_LINES } from '@/types';
import type { OpportunityStage } from '@/types';

export function Pipeline() {
  const { data, isLoading, error, refetch } = useOpportunitiesByStage();
  const updateOpportunity = useUpdateOpportunity();
  const { pipelineFilters, setPipelineFilters, clearPipelineFilters } = useUIStore();

  const handleStageChange = useCallback(
    async (opportunityId: number, newStage: OpportunityStage) => {
      await updateOpportunity.mutateAsync({
        id: opportunityId,
        data: { tss_stage: newStage },
      });
    },
    [updateOpportunity]
  );

  if (isLoading) return <LoadingState message="Loading pipeline..." />;
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!data) return <ErrorState message="No pipeline data available" />;

  // Apply filters
  const filteredData = { ...data };
  for (const stage of OPPORTUNITY_STAGES) {
    let opps = filteredData[stage];
    if (pipelineFilters.productLine) {
      opps = opps.filter((o) => o.tss_productLine === pipelineFilters.productLine);
    }
    if (pipelineFilters.basin) {
      opps = opps.filter((o) => o.tss_basin === pipelineFilters.basin);
    }
    filteredData[stage] = opps;
  }

  const totalOpps = OPPORTUNITY_STAGES.reduce((sum, s) => sum + filteredData[s].length, 0);
  const totalRevenue = OPPORTUNITY_STAGES.reduce(
    (sum, s) => sum + filteredData[s].reduce((r, o) => r + (o.tss_revenue ?? 0), 0),
    0
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pipeline"
        subtitle={`${totalOpps} opportunities · $${totalRevenue.toLocaleString()} total`}
        createLabel="New Opportunity"
        createPath="/opportunities/new"
      />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Dropdown
          placeholder="Product Line"
          value={pipelineFilters.productLine ?? ''}
          onOptionSelect={(_, d) =>
            setPipelineFilters({ ...pipelineFilters, productLine: d.optionValue || undefined })
          }
          clearable
          className="w-48"
        >
          {PRODUCT_LINES.map((pl) => (
            <Option key={pl} value={pl}>{pl}</Option>
          ))}
        </Dropdown>
        <Dropdown
          placeholder="Basin"
          value={pipelineFilters.basin ?? ''}
          onOptionSelect={(_, d) =>
            setPipelineFilters({ ...pipelineFilters, basin: d.optionValue || undefined })
          }
          clearable
          className="w-44"
        >
          {BASINS.map((b) => (
            <Option key={b} value={b}>{b}</Option>
          ))}
        </Dropdown>
        {(pipelineFilters.productLine || pipelineFilters.basin) && (
          <Button
            appearance="subtle"
            icon={<ArrowReset24Regular />}
            onClick={clearPipelineFilters}
            size="small"
          >
            Clear Filters
          </Button>
        )}
      </div>

      {/* Board */}
      <PipelineBoard data={filteredData} onStageChange={handleStageChange} />
    </div>
  );
}
