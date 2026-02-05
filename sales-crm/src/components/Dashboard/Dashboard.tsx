import { useEffect, useState } from 'react';

interface PipelineStats {
  totalOpportunities: number;
  totalValue: number;
  byStage: Record<string, { count: number; value: number }>;
}

export default function Dashboard() {
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch real data from SharePoint
    // For now, show placeholder data
    setStats({
      totalOpportunities: 0,
      totalValue: 0,
      byStage: {
        Lead: { count: 0, value: 0 },
        Qualified: { count: 0, value: 0 },
        Proposal: { count: 0, value: 0 },
        Negotiation: { count: 0, value: 0 },
        'Closed Won': { count: 0, value: 0 },
        'Closed Lost': { count: 0, value: 0 },
      },
    });
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ms-blue"></div>
      </div>
    );
  }

  const stages = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
  const stageColors: Record<string, string> = {
    Lead: 'bg-gray-100 text-gray-800',
    Qualified: 'bg-blue-100 text-blue-800',
    Proposal: 'bg-yellow-100 text-yellow-800',
    Negotiation: 'bg-purple-100 text-purple-800',
    'Closed Won': 'bg-green-100 text-green-800',
    'Closed Lost': 'bg-red-100 text-red-800',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Total Opportunities
          </h3>
          <p className="mt-2 text-3xl font-bold text-gray-900">
            {stats?.totalOpportunities || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Pipeline Value
          </h3>
          <p className="mt-2 text-3xl font-bold text-ms-blue">
            ${(stats?.totalValue || 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
            Win Rate
          </h3>
          <p className="mt-2 text-3xl font-bold text-ms-green">--</p>
        </div>
      </div>

      {/* Pipeline by Stage */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pipeline by Stage</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {stages.map((stage) => {
            const stageData = stats?.byStage[stage] || { count: 0, value: 0 };
            return (
              <div
                key={stage}
                className={`rounded-lg p-4 ${stageColors[stage]}`}
              >
                <h4 className="font-medium text-sm">{stage}</h4>
                <p className="text-2xl font-bold mt-1">{stageData.count}</p>
                <p className="text-sm opacity-75">
                  ${stageData.value.toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">Getting Started</h2>
        <p className="text-blue-800 mb-4">
          Welcome to your Sales CRM! To get started:
        </p>
        <ol className="list-decimal list-inside text-blue-800 space-y-2">
          <li>Configure your Azure AD credentials in <code className="bg-blue-100 px-1 rounded">electron/auth/msalConfig.ts</code></li>
          <li>Create the CRM lists in SharePoint (CRM_Countries, CRM_Companies, etc.)</li>
          <li>Import your reference data from the PM site</li>
          <li>Start adding opportunities to your pipeline!</li>
        </ol>
      </div>
    </div>
  );
}
