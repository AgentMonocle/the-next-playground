import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Badge } from '@fluentui/react-components';
import {
  Briefcase24Regular,
  People24Regular,
  Building24Regular,
  Board24Regular,
  Add24Regular,
} from '@fluentui/react-icons';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { useCompanies } from '@/hooks/useCompanies';
import { useContacts } from '@/hooks/useContacts';
import { useOpportunities, useOpportunitiesByStage } from '@/hooks/useOpportunities';
import type { Opportunity, OpportunityStage } from '@/types';
import { OPPORTUNITY_STAGES, STAGE_COLORS } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function stageBadgeColor(stage: OpportunityStage) {
  return STAGE_COLORS[stage] as
    | 'informative'
    | 'warning'
    | 'severe'
    | 'important'
    | 'success'
    | 'subtle';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
}

function StatCard({ icon, label, value, subtitle }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-gray-500">{icon}</div>
        <span className="text-sm font-medium text-gray-500">{label}</span>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

interface RecentOpportunityRowProps {
  opportunity: Opportunity;
  onClick: () => void;
}

function RecentOpportunityRow({ opportunity, onClick }: RecentOpportunityRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between py-3 px-4 hover:bg-gray-50 rounded-md transition-colors text-left"
    >
      <div className="flex flex-col gap-0.5 min-w-0 mr-4">
        <span className="text-sm font-medium text-gray-900 truncate">
          {opportunity.Title}
        </span>
        <span className="text-xs text-gray-500 truncate">
          {opportunity.tss_companyId?.LookupValue ?? 'No company'}
        </span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Badge appearance="filled" color={stageBadgeColor(opportunity.tss_stage)} size="small">
          {opportunity.tss_stage}
        </Badge>
        {opportunity.tss_revenue != null && (
          <span className="text-sm font-semibold text-gray-700 tabular-nums">
            {formatCurrency(opportunity.tss_revenue)}
          </span>
        )}
      </div>
    </button>
  );
}

interface PipelineStageCardProps {
  stage: OpportunityStage;
  count: number;
  revenue: number;
  maxRevenue: number;
}

function PipelineStageCard({ stage, count, revenue, maxRevenue }: PipelineStageCardProps) {
  const barWidth = maxRevenue > 0 ? Math.max((revenue / maxRevenue) * 100, 2) : 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <Badge appearance="filled" color={stageBadgeColor(stage)} size="small">
          {stage}
        </Badge>
        <span className="text-xs text-gray-400">{count} opp{count !== 1 ? 's' : ''}</span>
      </div>
      <p className="text-lg font-bold text-gray-900">{formatCurrency(revenue)}</p>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-300"
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function Dashboard() {
  const navigate = useNavigate();

  const companies = useCompanies();
  const contacts = useContacts();
  const opportunities = useOpportunities();
  const pipeline = useOpportunitiesByStage();

  // Derive stats from pipeline data
  const pipelineStats = useMemo(() => {
    if (!pipeline.data) return null;

    const stages = OPPORTUNITY_STAGES.map((stage) => {
      const opps = pipeline.data[stage] ?? [];
      const totalRevenue = opps.reduce((sum, o) => sum + (o.tss_revenue ?? 0), 0);
      return { stage, count: opps.length, revenue: totalRevenue };
    });

    const maxRevenue = Math.max(...stages.map((s) => s.revenue), 0);
    return { stages, maxRevenue };
  }, [pipeline.data]);

  // Last 5 modified opportunities
  const recentOpportunities = useMemo(() => {
    if (!opportunities.data) return [];
    // Already ordered by Modified desc from the hook, just take first 5
    return opportunities.data.slice(0, 5);
  }, [opportunities.data]);

  // Stage breakdown summary string for the stat card
  const stageBreakdown = useMemo(() => {
    if (!pipelineStats) return '';
    return pipelineStats.stages
      .filter((s) => s.count > 0)
      .map((s) => `${s.stage}: ${s.count}`)
      .join(', ');
  }, [pipelineStats]);

  // ─── Loading & Error ────────────────────────────────────────────────────────

  const isLoading =
    companies.isLoading || contacts.isLoading || opportunities.isLoading || pipeline.isLoading;

  const error = companies.error ?? contacts.error ?? opportunities.error ?? pipeline.error;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" subtitle="Pipeline summary and quick stats" />
        <LoadingState message="Loading dashboard data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" subtitle="Pipeline summary and quick stats" />
        <ErrorState
          message={error instanceof Error ? error.message : 'Failed to load dashboard data.'}
          onRetry={() => {
            companies.refetch();
            contacts.refetch();
            opportunities.refetch();
            pipeline.refetch();
          }}
        />
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  const totalCompanies = companies.data?.length ?? 0;
  const totalContacts = contacts.data?.length ?? 0;
  const totalOpportunities = opportunities.data?.length ?? 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader title="Dashboard" subtitle="Pipeline summary and quick stats" />

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Building24Regular />}
          label="Total Companies"
          value={totalCompanies}
        />
        <StatCard
          icon={<People24Regular />}
          label="Total Contacts"
          value={totalContacts}
        />
        <StatCard
          icon={<Briefcase24Regular />}
          label="Total Opportunities"
          value={totalOpportunities}
        />
        <StatCard
          icon={<Board24Regular />}
          label="By Stage"
          value={totalOpportunities}
          subtitle={stageBreakdown || 'No opportunities yet'}
        />
      </div>

      {/* Quick-Access Buttons */}
      <div className="flex items-center gap-3">
        <Button
          appearance="primary"
          icon={<Add24Regular />}
          onClick={() => navigate('/opportunities/new')}
        >
          New Opportunity
        </Button>
        <Button
          appearance="outline"
          icon={<Board24Regular />}
          onClick={() => navigate('/pipeline')}
        >
          View Pipeline
        </Button>
      </div>

      {/* Two-column layout: Recent Opportunities + Pipeline Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Opportunities */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900">Recent Opportunities</h3>
            <p className="text-xs text-gray-400 mt-0.5">Last 5 modified</p>
          </div>
          <div className="divide-y divide-gray-100">
            {recentOpportunities.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-400">
                No opportunities yet. Create one to get started.
              </div>
            ) : (
              recentOpportunities.map((opp) => (
                <RecentOpportunityRow
                  key={opp.id}
                  opportunity={opp}
                  onClick={() => navigate(`/opportunities/${opp.id}`)}
                />
              ))
            )}
          </div>
          {recentOpportunities.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-100">
              <Button
                appearance="transparent"
                size="small"
                onClick={() => navigate('/opportunities')}
              >
                View all opportunities
              </Button>
            </div>
          )}
        </div>

        {/* Pipeline Summary */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900">Pipeline Summary</h3>
            <p className="text-xs text-gray-400 mt-0.5">Count and revenue by stage</p>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pipelineStats?.stages.map(({ stage, count, revenue }) => (
              <PipelineStageCard
                key={stage}
                stage={stage}
                count={count}
                revenue={revenue}
                maxRevenue={pipelineStats.maxRevenue}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
