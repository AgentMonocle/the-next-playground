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
import { ActivityList } from '@/pages/activities/ActivityList';
import { ActivityDetail } from '@/pages/activities/ActivityDetail';
import { ActivityForm } from '@/pages/activities/ActivityForm';
import { BasinRegionList } from '@/pages/basinRegions/BasinRegionList';
import { BasinRegionDetail } from '@/pages/basinRegions/BasinRegionDetail';
import { BasinRegionForm } from '@/pages/basinRegions/BasinRegionForm';

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
      // Activities
      { path: 'activities', element: <ActivityList /> },
      { path: 'activities/new', element: <ActivityForm /> },
      { path: 'activities/:id', element: <ActivityDetail /> },
      { path: 'activities/:id/edit', element: <ActivityForm /> },
      // Pipeline
      { path: 'pipeline', element: <Pipeline /> },
      // Basin/Regions
      { path: 'basin-regions', element: <BasinRegionList /> },
      { path: 'basin-regions/new', element: <BasinRegionForm /> },
      { path: 'basin-regions/:id', element: <BasinRegionDetail /> },
      { path: 'basin-regions/:id/edit', element: <BasinRegionForm /> },
      // Catch-all
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
