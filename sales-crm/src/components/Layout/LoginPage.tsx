import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useEffect } from 'react';

export default function LoginPage() {
  const { login, isAuthenticated, isLoading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async () => {
    clearError();
    await login();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-ms-blue rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl text-white">📊</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sales CRM</h1>
          <p className="text-gray-600 mt-2">
            Sign in with your Microsoft 365 account to access your sales pipeline
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-ms-blue text-white rounded-lg hover:bg-ms-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 21 21" fill="currentColor">
                <path d="M0 0h10v10H0V0zm11 0h10v10H11V0zM0 11h10v10H0V11zm11 0h10v10H11V11z" />
              </svg>
              <span>Sign in with Microsoft</span>
            </>
          )}
        </button>

        <p className="mt-6 text-xs text-gray-500 text-center">
          By signing in, you agree to allow this application to access your SharePoint data, emails, and calendar.
        </p>

        {isLoading && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-700 text-sm text-center">
              A browser window will open for authentication. Please enter the code shown in the console/terminal.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
