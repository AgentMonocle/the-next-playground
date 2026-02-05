import { useState } from 'react';

interface Activity {
  id: string;
  title: string;
  activityType: 'Call' | 'Email' | 'Meeting' | 'Task' | 'Note';
  company: string;
  contact: string;
  activityDate: string;
  description: string;
  completed: boolean;
}

const activityTypeIcons: Record<string, string> = {
  Call: '📞',
  Email: '📧',
  Meeting: '📅',
  Task: '✅',
  Note: '📝',
};

const activityTypeColors: Record<string, string> = {
  Call: 'bg-green-100 text-green-800',
  Email: 'bg-blue-100 text-blue-800',
  Meeting: 'bg-purple-100 text-purple-800',
  Task: 'bg-yellow-100 text-yellow-800',
  Note: 'bg-gray-100 text-gray-800',
};

export default function Activities() {
  const [activities] = useState<Activity[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [isLoading] = useState(false);

  const filteredActivities = filterType === 'all'
    ? activities
    : activities.filter((a) => a.activityType === filterType);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Activities</h1>
        <button className="px-4 py-2 bg-ms-blue text-white rounded-lg hover:bg-ms-blue-dark transition-colors">
          + Log Activity
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2">
        {['all', 'Call', 'Email', 'Meeting', 'Task', 'Note'].map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterType === type
                ? 'bg-ms-blue text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {type === 'all' ? 'All' : `${activityTypeIcons[type]} ${type}`}
          </button>
        ))}
      </div>

      {/* Activities List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ms-blue"></div>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Activities Yet</h2>
          <p className="text-gray-600 mb-4">
            Activities like calls, emails, meetings, and tasks will appear here.
          </p>
          <p className="text-sm text-gray-500">
            Create the CRM_Activities list in your SharePoint sales site to get started.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="divide-y divide-gray-200">
            {filteredActivities.map((activity) => (
              <div key={activity.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                      activityTypeColors[activity.activityType]
                    }`}
                  >
                    {activityTypeIcons[activity.activityType]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{activity.title}</h3>
                      {activity.completed && (
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                          Completed
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {activity.company} • {activity.contact}
                    </p>
                    {activity.description && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {activity.description}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-sm text-gray-400">
                    {activity.activityDate}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
