import { useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { Badge, Spinner } from '@fluentui/react-components';
import { getGraphClient } from '@/lib/graph/graphClient';
import { getSiteId } from '@/lib/graph/sharepoint';

type Status = 'checking' | 'connected' | 'error';

export function ConnectivityCheck() {
  const { instance, accounts } = useMsal();
  const [status, setStatus] = useState<Status>('checking');
  const [siteId, setSiteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const account = accounts[0];
    if (!account) return;

    // Ensure MSAL knows the active account
    if (!instance.getActiveAccount()) {
      instance.setActiveAccount(account);
    }

    async function checkConnectivity() {
      try {
        const client = getGraphClient(instance);
        const id = await getSiteId(client);
        setSiteId(id);
        setStatus('connected');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setStatus('error');
      }
    }
    checkConnectivity();
  }, [instance, accounts]);

  return (
    <div className="bg-white rounded-lg border p-4 space-y-2">
      <h3 className="font-semibold text-sm text-gray-700">Stage 0 — System Status</h3>
      <div className="flex items-center gap-2">
        {status === 'checking' && <Spinner size="tiny" />}
        <span className="text-sm">SharePoint Site:</span>
        {status === 'connected' && <Badge appearance="filled" color="success">Connected</Badge>}
        {status === 'error' && <Badge appearance="filled" color="danger">Error</Badge>}
      </div>
      {siteId && <p className="text-xs text-gray-400 font-mono">Site ID: {siteId}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
