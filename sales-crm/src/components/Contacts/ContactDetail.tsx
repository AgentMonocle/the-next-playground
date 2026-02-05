import { useParams, Link } from 'react-router-dom';

export default function ContactDetail() {
  const { id } = useParams<{ id: string }>();

  return (
    <div>
      <div className="mb-6">
        <Link to="/contacts" className="text-ms-blue hover:underline">
          ← Back to Contacts
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Contact Details</h1>
        <p className="text-gray-600">
          Contact ID: {id}
        </p>
        <p className="text-gray-500 mt-4">
          Contact details and related activities will be loaded from SharePoint once the CRM_Contacts list is set up.
        </p>
      </div>
    </div>
  );
}
