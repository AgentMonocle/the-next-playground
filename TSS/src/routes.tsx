import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorBoundary } from '@/components/shared/ErrorBoundary';
import { Dashboard } from '@/pages/Dashboard';
import { CompanyList } from '@/pages/companies/CompanyList';
import { CompanyDetail } from '@/pages/companies/CompanyDetail';
import { CompanyForm } from '@/pages/companies/CompanyForm';
import { ContactList } from '@/pages/contacts/ContactList';
import { ContactDetail } from '@/pages/contacts/ContactDetail';
import { ContactForm } from '@/pages/contacts/ContactForm';
import { OpportunityList } from '@/pages/opportunities/OpportunityList';
import { OpportunityDetail } from '@/pages/opportunities/OpportunityDetail';
import { OpportunityForm } from '@/pages/opportunities/OpportunityForm';
import { Pipeline } from '@/pages/Pipeline';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <ErrorBoundary><AppShell /></ErrorBoundary>,
    children: [
      { index: true, element: <Dashboard /> },
      // Companies
      { path: 'companies', element: <CompanyList /> },
      { path: 'companies/new', element: <CompanyForm /> },
      { path: 'companies/:id', element: <CompanyDetail /> },
      { path: 'companies/:id/edit', element: <CompanyForm /> },
      // Contacts
      { path: 'contacts', element: <ContactList /> },
      { path: 'contacts/new', element: <ContactForm /> },
      { path: 'contacts/:id', element: <ContactDetail /> },
      { path: 'contacts/:id/edit', element: <ContactForm /> },
      // Opportunities
      { path: 'opportunities', element: <OpportunityList /> },
      { path: 'opportunities/new', element: <OpportunityForm /> },
      { path: 'opportunities/:id', element: <OpportunityDetail /> },
      { path: 'opportunities/:id/edit', element: <OpportunityForm /> },
      // Pipeline
      { path: 'pipeline', element: <Pipeline /> },
      // Catch-all
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
