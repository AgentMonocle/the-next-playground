import { useState } from 'react';
import { Link } from 'react-router-dom';

interface Opportunity {
  id: string;
  title: string;
  company: string;
  amount: number;
  stage: string;
  closeDate: string;
  owner: string;
}

const stages = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];

const stageColors: Record<string, { bg: string; border: string }> = {
  Lead: { bg: 'bg-gray-50', border: 'border-gray-300' },
  Qualified: { bg: 'bg-blue-50', border: 'border-blue-300' },
  Proposal: { bg: 'bg-yellow-50', border: 'border-yellow-300' },
  Negotiation: { bg: 'bg-purple-50', border: 'border-purple-300' },
  'Closed Won': { bg: 'bg-green-50', border: 'border-green-300' },
  'Closed Lost': { bg: 'bg-red-50', border: 'border-red-300' },
};

export default function Pipeline() {
  const [opportunities] = useState<Opportunity[]>([]);
  const [isLoading] = useState(false);

  const getOpportunitiesByStage = (stage: string) =>
    opportunities.filter((opp) => opp.stage === stage);

  const getStageTotal = (stage: string) =>
    getOpportunitiesByStage(stage).reduce((sum, opp) => sum + opp.amount, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
        <button className="px-4 py-2 bg-ms-blue text-white rounded-lg hover:bg-ms-blue-dark transition-colors">
          + Add Opportunity
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ms-blue"></div>
        </div>
      ) : opportunities.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-6xl mb-4">📈</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Opportunities Yet</h2>
          <p className="text-gray-600 mb-4">
            Your sales pipeline will appear here as a Kanban board once you add opportunities.
          </p>
          <p className="text-sm text-gray-500">
            Create the CRM_Opportunities list in your SharePoint sales site to get started.
          </p>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const stageOpps = getOpportunitiesByStage(stage);
            const total = getStageTotal(stage);
            const colors = stageColors[stage];

            return (
              <div
                key={stage}
                className={`flex-shrink-0 w-72 ${colors.bg} rounded-lg border ${colors.border}`}
              >
                {/* Stage Header */}
                <div className="p-3 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">{stage}</h3>
                    <span className="text-sm text-gray-500">{stageOpps.length}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    ${total.toLocaleString()}
                  </p>
                </div>

                {/* Opportunities */}
                <div className="p-2 space-y-2 min-h-[200px]">
                  {stageOpps.map((opp) => (
                    <Link
                      key={opp.id}
                      to={`/pipeline/${opp.id}`}
                      className="block bg-white rounded-lg shadow-sm p-3 hover:shadow-md transition-shadow"
                    >
                      <h4 className="font-medium text-gray-900 text-sm truncate">
                        {opp.title}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">{opp.company}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm font-semibold text-ms-blue">
                          ${opp.amount.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-400">{opp.closeDate}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
