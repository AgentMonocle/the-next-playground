import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/companies', label: 'Companies', icon: '🏢' },
  { path: '/contacts', label: 'Contacts', icon: '👥' },
  { path: '/pipeline', label: 'Pipeline', icon: '📈' },
  { path: '/activities', label: 'Activities', icon: '📋' },
];

export default function Layout() {
  const { account, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md flex flex-col">
        {/* App Title */}
        <div className="h-16 flex items-center px-6 border-b drag-region">
          <h1 className="text-xl font-bold text-ms-blue no-drag">Sales CRM</h1>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-6 py-3 text-gray-700 hover:bg-gray-100 transition-colors ${
                  isActive ? 'bg-blue-50 text-ms-blue border-r-4 border-ms-blue' : ''
                }`
              }
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Info */}
        <div className="border-t p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-ms-blue text-white flex items-center justify-center font-semibold">
              {account?.name?.[0] || account?.username?.[0] || '?'}
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {account?.name || account?.username}
              </p>
              <p className="text-xs text-gray-500 truncate">{account?.username}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 w-full px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Header drag region */}
        <div className="h-8 bg-white border-b drag-region" />

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
