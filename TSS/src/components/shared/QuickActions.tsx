import { useNavigate } from 'react-router-dom';
import { Button } from '@fluentui/react-components';
import {
  Call24Regular,
  People24Regular,
  Location24Regular,
  Note24Regular,
} from '@fluentui/react-icons';

interface QuickActionsProps {
  companyId?: number;
  contactId?: number;
  opportunityId?: number;
}

export function QuickActions({ companyId, contactId, opportunityId }: QuickActionsProps) {
  const navigate = useNavigate();

  const buildUrl = (type: string) => {
    const params = new URLSearchParams({ type });
    if (companyId) params.set('companyId', String(companyId));
    if (contactId) params.set('contactId', String(contactId));
    if (opportunityId) params.set('opportunityId', String(opportunityId));
    return `/activities/new?${params.toString()}`;
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        appearance="outline"
        size="small"
        icon={<Call24Regular />}
        onClick={() => navigate(buildUrl('Call'))}
      >
        Log Call
      </Button>
      <Button
        appearance="outline"
        size="small"
        icon={<People24Regular />}
        onClick={() => navigate(buildUrl('Meeting'))}
      >
        Log Meeting
      </Button>
      <Button
        appearance="outline"
        size="small"
        icon={<Location24Regular />}
        onClick={() => navigate(buildUrl('Site Visit'))}
      >
        Log Site Visit
      </Button>
      <Button
        appearance="outline"
        size="small"
        icon={<Note24Regular />}
        onClick={() => navigate(buildUrl('Internal Note'))}
      >
        Add Note
      </Button>
    </div>
  );
}
