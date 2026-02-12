import { useLocation, useNavigate } from 'react-router-dom';
import {
  Button,
  Tooltip,
} from '@fluentui/react-components';
import {
  Home24Regular,
  Home24Filled,
  Building24Regular,
  Building24Filled,
  People24Regular,
  People24Filled,
  Briefcase24Regular,
  Briefcase24Filled,
  Board24Regular,
  Board24Filled,
  ClipboardTask24Regular,
  ClipboardTask24Filled,
  Globe24Regular,
  Globe24Filled,
  Settings24Regular,
  Settings24Filled,
  PanelLeftContract24Regular,
  PanelLeftExpand24Regular,
} from '@fluentui/react-icons';
import { useUIStore } from '@/stores/uiStore';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactElement;
  iconFilled: React.ReactElement;
}

const NAV_ITEMS: NavItem[] = [
  {
    path: '/',
    label: 'Dashboard',
    icon: <Home24Regular />,
    iconFilled: <Home24Filled />,
  },
  {
    path: '/companies',
    label: 'Companies',
    icon: <Building24Regular />,
    iconFilled: <Building24Filled />,
  },
  {
    path: '/contacts',
    label: 'Contacts',
    icon: <People24Regular />,
    iconFilled: <People24Filled />,
  },
  {
    path: '/opportunities',
    label: 'Opportunities',
    icon: <Briefcase24Regular />,
    iconFilled: <Briefcase24Filled />,
  },
  {
    path: '/activities',
    label: 'Activities',
    icon: <ClipboardTask24Regular />,
    iconFilled: <ClipboardTask24Filled />,
  },
  {
    path: '/pipeline',
    label: 'Pipeline',
    icon: <Board24Regular />,
    iconFilled: <Board24Filled />,
  },
  {
    path: '/basin-regions',
    label: 'Basin/Regions',
    icon: <Globe24Regular />,
    iconFilled: <Globe24Filled />,
  },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarCollapsed, toggleSidebar } = useUIStore();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside
      className={`flex flex-col bg-white border-r border-gray-200 transition-all duration-200 ${
        sidebarCollapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Logo / Brand */}
      <div className="flex items-center h-14 px-4 border-b border-gray-200">
        {!sidebarCollapsed && (
          <span className="font-bold text-lg text-gray-900 truncate">TSS</span>
        )}
        <div className={sidebarCollapsed ? 'mx-auto' : 'ml-auto'}>
          <Tooltip
            content={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            relationship="label"
          >
            <Button
              appearance="subtle"
              size="small"
              icon={sidebarCollapsed ? <PanelLeftExpand24Regular /> : <PanelLeftContract24Regular />}
              onClick={toggleSidebar}
            />
          </Tooltip>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path);
          return (
            <Tooltip
              key={item.path}
              content={item.label}
              relationship="label"
              visible={sidebarCollapsed ? undefined : false}
            >
              <button
                onClick={() => navigate(item.path)}
                className={`flex items-center w-full px-4 py-2.5 text-sm transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                } ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}
              >
                <span className="flex-shrink-0">
                  {active ? item.iconFilled : item.icon}
                </span>
                {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            </Tooltip>
          );
        })}
      </nav>

      {/* Bottom nav — Settings */}
      <div className="border-t border-gray-200 py-2">
        <Tooltip
          content="Settings"
          relationship="label"
          visible={sidebarCollapsed ? undefined : false}
        >
          <button
            onClick={() => navigate('/settings')}
            className={`flex items-center w-full px-4 py-2.5 text-sm transition-colors ${
              isActive('/settings')
                ? 'bg-blue-50 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            } ${sidebarCollapsed ? 'justify-center' : 'gap-3'}`}
          >
            <span className="flex-shrink-0">
              {isActive('/settings') ? <Settings24Filled /> : <Settings24Regular />}
            </span>
            {!sidebarCollapsed && <span className="truncate">Settings</span>}
          </button>
        </Tooltip>
      </div>
    </aside>
  );
}
