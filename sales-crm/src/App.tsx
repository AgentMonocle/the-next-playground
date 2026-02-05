import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout/Layout';
import LoginPage from './components/Layout/LoginPage';
import Dashboard from './components/Dashboard/Dashboard';
import CompanyList from './components/Companies/CompanyList';
import CompanyDetail from './components/Companies/CompanyDetail';
import ContactList from './components/Contacts/ContactList';
import ContactDetail from './components/Contacts/ContactDetail';
import Pipeline from './components/Pipeline/Pipeline';
import OpportunityDetail from './components/Pipeline/OpportunityDetail';
import Activities from './components/Activities/Activities';
import { useEffect, useState } from 'react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ms-blue mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { checkAuth, isLoading } = useAuthStore();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      await checkAuth();
      setInitialized(true);
    };
    init();
  }, [checkAuth]);

  if (!initialized || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ms-blue mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="companies" element={<CompanyList />} />
        <Route path="companies/:id" element={<CompanyDetail />} />
        <Route path="contacts" element={<ContactList />} />
        <Route path="contacts/:id" element={<ContactDetail />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="pipeline/:id" element={<OpportunityDetail />} />
        <Route path="activities" element={<Activities />} />
      </Route>
    </Routes>
  );
}

export default App;
