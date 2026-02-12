import { useState } from 'react';
import { Badge, Button, Spinner } from '@fluentui/react-components';
import {
  Mail24Regular,
  Compose24Regular,
  Attach24Regular,
  ChevronDown24Regular,
  ChevronRight24Regular,
} from '@fluentui/react-icons';
import { useContactEmails, type EmailMessage } from '@/hooks/useEmails';
import { ComposeDialog } from './ComposeDialog';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatEmailDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) {
    return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return date.toLocaleDateString(undefined, { weekday: 'short' });
  }
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── Email Row ──────────────────────────────────────────────────────────────

interface EmailRowProps {
  email: EmailMessage;
  currentUserEmail?: string;
}

function EmailRow({ email, currentUserEmail }: EmailRowProps) {
  const [expanded, setExpanded] = useState(false);

  // Determine direction
  const isFromContact = email.from?.emailAddress?.address?.toLowerCase() !== currentUserEmail?.toLowerCase();
  const senderName = email.from?.emailAddress?.name || email.from?.emailAddress?.address || 'Unknown';

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-start gap-3 py-3 px-4 hover:bg-gray-50 transition-colors text-left ${
          !email.isRead ? 'bg-blue-50/50' : ''
        }`}
      >
        <div className="flex-shrink-0 mt-0.5">
          {expanded ? <ChevronDown24Regular className="text-gray-400" /> : <ChevronRight24Regular className="text-gray-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm truncate ${!email.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
              {senderName}
            </span>
            <Badge
              appearance="outline"
              size="small"
              color={isFromContact ? 'informative' : 'success'}
            >
              {isFromContact ? 'Received' : 'Sent'}
            </Badge>
            {email.hasAttachments && (
              <Attach24Regular className="text-gray-400 w-4 h-4" />
            )}
          </div>
          <p className={`text-sm truncate ${!email.isRead ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
            {email.subject || '(No Subject)'}
          </p>
          {!expanded && (
            <p className="text-xs text-gray-400 truncate mt-0.5">
              {email.bodyPreview}
            </p>
          )}
        </div>
        <span className="text-xs text-gray-400 flex-shrink-0">
          {formatEmailDate(email.receivedDateTime)}
        </span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pl-11">
          <div className="text-xs text-gray-500 mb-2">
            <p><strong>From:</strong> {email.from?.emailAddress?.name} &lt;{email.from?.emailAddress?.address}&gt;</p>
            <p><strong>To:</strong> {email.toRecipients?.map(r => r.emailAddress.address).join(', ')}</p>
            <p><strong>Date:</strong> {new Date(email.receivedDateTime).toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
            {email.bodyPreview}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EmailPanel ─────────────────────────────────────────────────────────────

interface EmailPanelProps {
  contactEmail: string | undefined;
  contactName: string;
  companyId?: number;
  contactId?: number;
}

export function EmailPanel({ contactEmail, contactName, companyId, contactId }: EmailPanelProps) {
  const [showCompose, setShowCompose] = useState(false);
  const { data: emails, isLoading, error } = useContactEmails(contactEmail);

  if (!contactEmail) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Mail24Regular />
          Emails
        </h3>
        <p className="text-sm text-gray-400">
          No email address on file. Add an email address to see correspondence.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Mail24Regular />
            Emails
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Correspondence with {contactEmail}
          </p>
        </div>
        <Button
          appearance="primary"
          size="small"
          icon={<Compose24Regular />}
          onClick={() => setShowCompose(true)}
        >
          Compose
        </Button>
      </div>

      <div className="max-h-[500px] overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-8 gap-2">
            <Spinner size="tiny" />
            <span className="text-sm text-gray-400">Loading emails...</span>
          </div>
        )}

        {error && (
          <div className="px-6 py-4">
            <p className="text-sm text-red-600">
              Failed to load emails. Make sure Mail.Read permission has been granted.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
        )}

        {!isLoading && !error && emails && emails.length === 0 && (
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-gray-400">No emails found with this contact.</p>
          </div>
        )}

        {!isLoading && !error && emails && emails.length > 0 && (
          <div>
            {emails.map((email) => (
              <EmailRow key={email.id} email={email} />
            ))}
          </div>
        )}
      </div>

      <ComposeDialog
        open={showCompose}
        onOpenChange={setShowCompose}
        toEmail={contactEmail}
        toName={contactName}
        companyId={companyId}
        contactId={contactId}
      />
    </div>
  );
}
