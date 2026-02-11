import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button, Badge } from '@fluentui/react-components';
import { Edit24Regular, Delete24Regular } from '@fluentui/react-icons';
import { PageHeader } from '@/components/shared/PageHeader';
import { LoadingState } from '@/components/shared/LoadingState';
import { ErrorState } from '@/components/shared/ErrorState';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { useContact, useDeleteContact } from '@/hooks/useContacts';
import { useLookupMaps } from '@/hooks/useLookupMaps';
import { useState } from 'react';

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-4 py-1.5">
      <dt className="w-36 text-sm font-medium text-gray-500 flex-shrink-0">{label}</dt>
      <dd className="text-sm text-gray-900">{value}</dd>
    </div>
  );
}

export function ContactDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const contactId = id ? Number(id) : undefined;
  const { data: contact, isLoading, error, refetch } = useContact(contactId);
  const deleteContact = useDeleteContact();
  const { companyMap, resolve } = useLookupMaps();

  if (isLoading) return <LoadingState message="Loading contact..." />;
  if (error) return <ErrorState message={error.message} onRetry={() => refetch()} />;
  if (!contact) return <ErrorState message="Contact not found" />;

  const handleDelete = async () => {
    if (!contactId) return;
    await deleteContact.mutateAsync(contactId);
    navigate('/contacts');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={contact.Title}
        subtitle={resolve(contact.tss_companyId?.LookupId, companyMap)}
        actions={
          <>
            <Button
              appearance="secondary"
              icon={<Edit24Regular />}
              onClick={() => navigate(`/contacts/${contactId}/edit`)}
            >
              Edit
            </Button>
            <Button
              appearance="subtle"
              icon={<Delete24Regular />}
              onClick={() => setShowDeleteDialog(true)}
            >
              Deactivate
            </Button>
          </>
        }
      />

      <Badge appearance="filled" color={contact.tss_isActive ? 'success' : 'danger'}>
        {contact.tss_isActive ? 'Active' : 'Inactive'}
      </Badge>

      {/* Contact Info */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Contact Information</h3>
        <dl>
          <InfoRow label="Email" value={contact.tss_email} />
          <InfoRow label="Phone" value={contact.tss_phone} />
          <InfoRow label="Mobile" value={contact.tss_mobile} />
        </dl>
      </div>

      {/* Role */}
      <div className="bg-white rounded-lg border p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Role</h3>
        <dl>
          <InfoRow label="Job Title" value={contact.tss_jobTitle} />
          <InfoRow label="Department" value={contact.tss_department} />
          <InfoRow label="Preferred Name" value={contact.tss_preferredName} />
        </dl>
      </div>

      {/* Flags */}
      {(contact.tss_isDecisionMaker || contact.tss_isInfluencer) && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Flags</h3>
          <div className="flex gap-2">
            {contact.tss_isDecisionMaker && (
              <Badge appearance="filled" color="important">Decision Maker</Badge>
            )}
            {contact.tss_isInfluencer && (
              <Badge appearance="filled" color="informative">Influencer</Badge>
            )}
          </div>
        </div>
      )}

      {/* Company */}
      {contact.tss_companyId && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Company</h3>
          <Link
            to={`/companies/${contact.tss_companyId.LookupId}`}
            className="text-blue-600 hover:underline"
          >
            {resolve(contact.tss_companyId.LookupId, companyMap)}
          </Link>
        </div>
      )}

      {/* Notes */}
      {contact.tss_notes && (
        <div className="bg-white rounded-lg border p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Notes</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{contact.tss_notes}</p>
        </div>
      )}

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Deactivate Contact"
        message={`Are you sure you want to deactivate "${contact.Title}"? The contact will be hidden from active lists.`}
        confirmLabel="Deactivate"
        onConfirm={handleDelete}
        danger
      />
    </div>
  );
}
