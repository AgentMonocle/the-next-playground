import { useParams, Link } from 'react-router-dom';

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <div className="mb-6">
        <Link to="/companies" className="text-ms-blue hover:underline">
          ← Back to Companies
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Company Details</h1>
        <p className="text-gray-600">
          Company ID: {id}
        </p>
        <p className="text-gray-500 mt-4">
          Company details will be loaded from SharePoint once the CRM_Companies list is set up.
        </p>
      </div>
    </div>
  );
}
