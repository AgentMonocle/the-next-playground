// SharePoint CRM Entity Types

export interface Country {
  id: string;
  title: string;
  countryCode: string;
  region: string;
}

export interface Company {
  id: string;
  title: string;
  companyCode: string;
  subsidiary: boolean;
  parentCompanyId?: string;
  parentCompany?: Company;
  countryId?: string;
  country?: Country;
  industry?: string;
  website?: string;
  phone?: string;
  annualRevenue?: number;
  accountOwnerId?: string;
  accountOwner?: string;
  notes?: string;
  createdAt: string;
  modifiedAt: string;
}

export interface Contact {
  id: string;
  title: string; // Full name
  companyId?: string;
  company?: Company;
  email: string;
  phone?: string;
  preferredName?: string;
  jobTitle?: string;
  isPrimary: boolean;
  createdAt: string;
  modifiedAt: string;
}

export type OpportunityStage =
  | 'Lead'
  | 'Qualified'
  | 'Proposal'
  | 'Negotiation'
  | 'Closed Won'
  | 'Closed Lost';

export type OpportunitySource =
  | 'Website'
  | 'Referral'
  | 'Cold Call'
  | 'Trade Show'
  | 'Partner'
  | 'Other';

export type LostReason =
  | 'Price'
  | 'Competition'
  | 'No Budget'
  | 'No Decision'
  | 'Timing'
  | 'Other';

export interface Opportunity {
  id: string;
  title: string;
  companyId?: string;
  company?: Company;
  primaryContactId?: string;
  primaryContact?: Contact;
  stage: OpportunityStage;
  amount: number;
  closeDate: string;
  probability: number;
  ownerId?: string;
  owner?: string;
  source?: OpportunitySource;
  notes?: string;
  lostReason?: LostReason;
  createdAt: string;
  modifiedAt: string;
}

export type ActivityType = 'Call' | 'Email' | 'Meeting' | 'Task' | 'Note';

export interface Activity {
  id: string;
  title: string;
  activityType: ActivityType;
  companyId?: string;
  company?: Company;
  contactId?: string;
  contact?: Contact;
  opportunityId?: string;
  opportunity?: Opportunity;
  activityDate: string;
  description?: string;
  completed: boolean;
  ownerId?: string;
  owner?: string;
  createdAt: string;
  modifiedAt: string;
}

export type DocumentType = 'Proposal' | 'Contract' | 'Presentation' | 'Other';

export interface CRMDocument {
  id: string;
  title: string;
  companyId?: string;
  company?: Company;
  opportunityId?: string;
  opportunity?: Opportunity;
  documentLink: string;
  documentType: DocumentType;
  createdAt: string;
  modifiedAt: string;
}

// API Response Types
export interface SharePointListItem<T> {
  id: string;
  fields: T;
  createdDateTime: string;
  lastModifiedDateTime: string;
}

export interface SharePointListResponse<T> {
  value: SharePointListItem<T>[];
  '@odata.nextLink'?: string;
}

// Graph API Types
export interface GraphUser {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
  jobTitle?: string;
  department?: string;
}

export interface GraphEmail {
  id: string;
  subject: string;
  bodyPreview: string;
  receivedDateTime: string;
  from: {
    emailAddress: {
      address: string;
      name: string;
    };
  };
  toRecipients: Array<{
    emailAddress: {
      address: string;
      name: string;
    };
  }>;
}

export interface GraphCalendarEvent {
  id: string;
  subject: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  attendees: Array<{
    emailAddress: {
      address: string;
      name: string;
    };
    type: string;
  }>;
  location?: {
    displayName: string;
  };
}
