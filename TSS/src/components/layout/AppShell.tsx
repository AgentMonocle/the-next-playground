import { Outlet } from 'react-router-dom';
import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from '@azure/msal-react';
import { Button } from '@fluentui/react-components';
import { loginRequest } from '@/lib/auth/msalConfig';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppShell() {
  const { instance } = useMsal();

  const handleLogin = () => {
    instance.loginRedirect(loginRequest);
  };

  return (
    <>
      <UnauthenticatedTemplate>
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-gray-900">Tejas Sales System</h1>
            <p className="text-gray-600">Sign in with your Microsoft 365 account</p>
            <Button appearance="primary" size="large" onClick={handleLogin}>
              Sign in with Microsoft
            </Button>
          </div>
        </div>
      </UnauthenticatedTemplate>

      <AuthenticatedTemplate>
        <div className="flex h-screen bg-gray-50 overflow-hidden">
          <Sidebar />
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6">
              <div className="max-w-7xl mx-auto">
                <Outlet />
              </div>
            </main>
          </div>
        </div>
      </AuthenticatedTemplate>
    </>
  );
}
