import { useState } from 'react';
import {
  Switch,
  Card,
  CardHeader,
  Text,
  Badge,
  Button,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Spinner,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import {
  Mail24Regular,
  Info24Regular,
  ShieldCheckmark24Regular,
} from '@fluentui/react-icons';
import { useMsal } from '@azure/msal-react';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  useMonitoringStatus,
  useEnableMonitoring,
  useDisableMonitoring,
} from '@/hooks/useEmailMonitoring';

export function Settings() {
  const { accounts } = useMsal();
  const account = accounts[0];

  const { data: status, isLoading, error } = useMonitoringStatus();
  const enableMutation = useEnableMonitoring();
  const disableMutation = useDisableMonitoring();

  const [showEnableDialog, setShowEnableDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);

  const isMutating = enableMutation.isPending || disableMutation.isPending;

  const handleToggle = () => {
    if (status?.monitoring) {
      setShowDisableDialog(true);
    } else {
      setShowEnableDialog(true);
    }
  };

  const confirmEnable = () => {
    enableMutation.mutate(undefined, {
      onSettled: () => setShowEnableDialog(false),
    });
  };

  const confirmDisable = () => {
    disableMutation.mutate(undefined, {
      onSettled: () => setShowDisableDialog(false),
    });
  };

  const formatExpiration = (iso: string) => {
    const date = new Date(iso);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />

      {/* User Info */}
      <Card>
        <CardHeader
          header={
            <Text weight="semibold" size={400}>
              Account
            </Text>
          }
          description={
            <Text size={200} className="text-gray-500">
              Signed in as {account?.name ?? account?.username}
            </Text>
          }
        />
      </Card>

      {/* Email Monitoring */}
      <Card>
        <CardHeader
          image={<Mail24Regular className="text-blue-600" />}
          header={
            <Text weight="semibold" size={400}>
              Email Monitoring
            </Text>
          }
          description={
            <Text size={200} className="text-gray-500">
              Automatically link emails to CRM activities
            </Text>
          }
        />

        <div className="px-4 pb-4 space-y-4">
          {error && (
            <MessageBar intent="error">
              <MessageBarBody>
                Unable to check monitoring status. The daemon service may be unavailable.
              </MessageBarBody>
            </MessageBar>
          )}

          {(enableMutation.isError || disableMutation.isError) && (
            <MessageBar intent="error">
              <MessageBarBody>
                {(enableMutation.error ?? disableMutation.error)?.message ??
                  'An error occurred. Please try again.'}
              </MessageBarBody>
            </MessageBar>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Text>Email monitoring</Text>
              {isLoading ? (
                <Spinner size="tiny" />
              ) : status?.monitoring ? (
                <Badge appearance="filled" color="success">Active</Badge>
              ) : (
                <Badge appearance="outline" color="subtle">Off</Badge>
              )}
            </div>

            <Switch
              checked={status?.monitoring ?? false}
              disabled={isLoading || isMutating || !!error}
              onChange={handleToggle}
            />
          </div>

          {status?.monitoring && status.expirationDateTime && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <ShieldCheckmark24Regular className="w-4 h-4" />
              <Text size={200}>
                Subscription renews automatically · Expires{' '}
                {formatExpiration(status.expirationDateTime)}
              </Text>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-md">
            <Info24Regular className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <Text size={200} className="text-gray-600">
              When enabled, emails you send to or receive from CRM contacts are
              automatically logged as Activity records. Only emails matching
              contacts in the system are tracked. Email content is not stored —
              only the subject line, date, and contact link.
            </Text>
          </div>
        </div>
      </Card>

      {/* Enable Confirmation Dialog */}
      <Dialog open={showEnableDialog} onOpenChange={(_, data) => setShowEnableDialog(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Enable Email Monitoring?</DialogTitle>
            <DialogContent>
              <Text>
                This will monitor your Microsoft 365 mailbox for new emails.
                When an email matches a CRM contact, it will be automatically
                logged as an Activity.
              </Text>
              <div className="mt-3 space-y-1">
                <Text size={200} className="text-gray-500">
                  • Only emails matching CRM contacts are logged
                </Text>
                <Text size={200} className="text-gray-500">
                  • Email body content is not stored in the CRM
                </Text>
                <Text size={200} className="text-gray-500">
                  • You can disable monitoring at any time
                </Text>
              </div>
            </DialogContent>
            <DialogActions>
              <Button
                appearance="secondary"
                onClick={() => setShowEnableDialog(false)}
                disabled={enableMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                appearance="primary"
                onClick={confirmEnable}
                disabled={enableMutation.isPending}
                icon={enableMutation.isPending ? <Spinner size="tiny" /> : undefined}
              >
                {enableMutation.isPending ? 'Enabling...' : 'Enable Monitoring'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Disable Confirmation Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={(_, data) => setShowDisableDialog(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Disable Email Monitoring?</DialogTitle>
            <DialogContent>
              <Text>
                New emails will no longer be automatically linked to CRM
                activities. Existing activity records will not be affected.
              </Text>
            </DialogContent>
            <DialogActions>
              <Button
                appearance="secondary"
                onClick={() => setShowDisableDialog(false)}
                disabled={disableMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                appearance="primary"
                onClick={confirmDisable}
                disabled={disableMutation.isPending}
                icon={disableMutation.isPending ? <Spinner size="tiny" /> : undefined}
              >
                {disableMutation.isPending ? 'Disabling...' : 'Disable Monitoring'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
