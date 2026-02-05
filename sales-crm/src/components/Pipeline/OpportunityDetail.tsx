import { useParams, Link } from 'react-router-dom';

export default function OpportunityDetail() {
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <div className="mb-6">
        <Link to="/pipeline" className="text-ms-blue hover:underline">
          ← Back to Pipeline
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Opportunity Details</h1>
        <p className="text-gray-600">
          Opportunity ID: {id}
        </p>
        <p className="text-gray-500 mt-4">
          Opportunity details, related contacts, and activity timeline will be loaded from SharePoint
          once the CRM_Opportunities list is set up.
        </p>
      </div>
    </div>
  );
}
