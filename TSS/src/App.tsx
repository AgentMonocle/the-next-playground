import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from '@azure/msal-react';
import { loginRequest } from '@/lib/auth/msalConfig';
import { Button } from '@fluentui/react-components';
import { ConnectivityCheck } from '@/components/ConnectivityCheck';

function App() {
  const { instance, accounts } = useMsal();

  const handleLogin = () => {
    instance.loginRedirect(loginRequest);
  };

  const handleLogout = () => {
    instance.logoutRedirect();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <UnauthenticatedTemplate>
        <div className="flex items-center justify-center min-h-screen">
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
        <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Tejas Sales System</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {accounts[0]?.name || accounts[0]?.username}
            </span>
            <Button appearance="subtle" size="small" onClick={handleLogout}>
              Sign out
            </Button>
          </div>
        </header>
        <main className="p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold">Dashboard</h2>
            <p className="text-gray-500">Stage 0 complete. Pipeline board coming in Stage 1.</p>
            <ConnectivityCheck />
          </div>
        </main>
      </AuthenticatedTemplate>
    </div>
  );
}

export default App;
