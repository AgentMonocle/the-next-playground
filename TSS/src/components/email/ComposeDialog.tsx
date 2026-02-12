import { useState } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Button,
  Input,
  Textarea,
} from '@fluentui/react-components';
import { Send24Regular, Dismiss24Regular } from '@fluentui/react-icons';
import { useMsal } from '@azure/msal-react';
import { useSendEmail } from '@/hooks/useEmails';
import { useCreateActivity } from '@/hooks/useActivities';
import { FormField } from '@/components/shared/FormField';

interface ComposeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toEmail: string;
  toName: string;
  companyId?: number;
  contactId?: number;
}

export function ComposeDialog({
  open,
  onOpenChange,
  toEmail,
  toName,
  companyId,
  contactId,
}: ComposeDialogProps) {
  const { accounts } = useMsal();
  const sendEmail = useSendEmail();
  const createActivity = useCreateActivity();

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!subject.trim()) {
      setError('Subject is required');
      return;
    }
    if (!body.trim()) {
      setError('Message body is required');
      return;
    }

    setSending(true);
    setError(null);

    try {
      // Send email via Graph API
      await sendEmail.mutateAsync({
        to: toEmail,
        subject: subject.trim(),
        body: body.trim(),
      });

      // Auto-create Activity record
      await createActivity.mutateAsync({
        Title: `Email: ${subject.trim()}`,
        tss_activityType: 'Email',
        tss_activityDate: new Date().toISOString(),
        tss_owner: accounts[0]?.name ?? '',
        tss_direction: 'Outbound',
        tss_description: `Sent email to ${toName} (${toEmail})\n\n${body.trim().slice(0, 500)}`,
        tss_companyId: companyId,
        tss_contactId: contactId,
      });

      // Reset and close
      setSubject('');
      setBody('');
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (!sending) {
      setSubject('');
      setBody('');
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => { if (!sending) onOpenChange(data.open); }}>
      <DialogSurface style={{ maxWidth: '600px' }}>
        <DialogBody>
          <DialogTitle>Compose Email</DialogTitle>
          <DialogContent className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                {error}
              </div>
            )}

            <FormField label="To">
              <Input
                value={`${toName} <${toEmail}>`}
                disabled
                className="bg-gray-50"
              />
            </FormField>

            <FormField label="Subject" required>
              <Input
                value={subject}
                onChange={(_, data) => setSubject(data.value)}
                placeholder="Email subject..."
                disabled={sending}
              />
            </FormField>

            <FormField label="Message" required>
              <Textarea
                value={body}
                onChange={(_, data) => setBody(data.value)}
                rows={8}
                placeholder="Write your message..."
                disabled={sending}
                resize="vertical"
              />
            </FormField>

            <p className="text-xs text-gray-400">
              An activity will be automatically logged when you send this email.
            </p>
          </DialogContent>
          <DialogActions>
            <Button
              appearance="secondary"
              icon={<Dismiss24Regular />}
              onClick={handleClose}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button
              appearance="primary"
              icon={<Send24Regular />}
              onClick={handleSend}
              disabled={sending}
            >
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
