import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  Input,
  Dropdown,
  Option,
  Textarea,
  Combobox,
} from '@fluentui/react-components';
import { Save24Regular, Dismiss24Regular } from '@fluentui/react-icons';
import { useMsal } from '@azure/msal-react';
import { FormField } from '@/components/shared/FormField';
import { LoadingState } from '@/components/shared/LoadingState';
import { useActivity, useCreateActivity, useUpdateActivity } from '@/hooks/useActivities';
import { useCompanies } from '@/hooks/useCompanies';
import { useContactsByCompany } from '@/hooks/useContacts';
import { useOpportunities } from '@/hooks/useOpportunities';
import {
  activityFormSchema,
  ACTIVITY_TYPES,
  ACTIVITY_DIRECTIONS,
  type ActivityFormData,
  type ActivityType,
  type ActivityDirection,
} from '@/types';

export function ActivityForm() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { accounts } = useMsal();
  const isEdit = Boolean(id);
  const activityId = id ? Number(id) : undefined;

  const { data: existingActivity, isLoading: loadingActivity } = useActivity(activityId);
  const { data: companies } = useCompanies({ isActive: true });
  const createActivity = useCreateActivity();
  const updateActivity = useUpdateActivity();

  // Pre-fill from URL params (for quick-entry from detail pages)
  const preType = searchParams.get('type') as ActivityType | null;
  const preCompanyId = searchParams.get('companyId');
  const preContactId = searchParams.get('contactId');
  const preOpportunityId = searchParams.get('opportunityId');

  const [form, setForm] = useState<Partial<ActivityFormData>>({
    tss_activityType: preType ?? 'Call',
    tss_activityDate: new Date().toISOString().slice(0, 16),
    tss_owner: accounts[0]?.name ?? '',
    tss_companyId: preCompanyId ? Number(preCompanyId) : undefined,
    tss_contactId: preContactId ? Number(preContactId) : undefined,
    tss_opportunityId: preOpportunityId ? Number(preOpportunityId) : undefined,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>(
    preCompanyId ? Number(preCompanyId) : undefined
  );

  // Fetch contacts filtered by selected company
  const { data: companyContacts } = useContactsByCompany(selectedCompanyId);
  // Fetch opportunities filtered by selected company
  const { data: companyOpportunities } = useOpportunities(
    selectedCompanyId ? { companyId: selectedCompanyId, top: 200 } : {}
  );

  useEffect(() => {
    if (isEdit && existingActivity) {
      setForm({
        Title: existingActivity.Title,
        tss_activityType: existingActivity.tss_activityType,
        tss_activityDate: existingActivity.tss_activityDate?.slice(0, 16) ?? '',
        tss_companyId: existingActivity.tss_companyId?.LookupId,
        tss_contactId: existingActivity.tss_contactId?.LookupId,
        tss_opportunityId: existingActivity.tss_opportunityId?.LookupId,
        tss_owner: existingActivity.tss_owner,
        tss_direction: existingActivity.tss_direction,
        tss_duration: existingActivity.tss_duration,
        tss_description: existingActivity.tss_description ?? '',
      });
      setSelectedCompanyId(existingActivity.tss_companyId?.LookupId);
    }
  }, [isEdit, existingActivity]);

  const updateField = <K extends keyof ActivityFormData>(key: K, value: ActivityFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleCompanyChange = (companyId: number | undefined) => {
    updateField('tss_companyId', companyId as number);
    setSelectedCompanyId(companyId);
    // Reset contact and opportunity when company changes
    updateField('tss_contactId', undefined as unknown as number);
    updateField('tss_opportunityId', undefined as unknown as number);
  };

  const handleSubmit = async () => {
    const result = activityFormSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path[0];
        if (path) fieldErrors[String(path)] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    try {
      if (isEdit && activityId) {
        await updateActivity.mutateAsync({ id: activityId, data: result.data });
        navigate(`/activities/${activityId}`);
      } else {
        const newActivity = await createActivity.mutateAsync(result.data);
        navigate(`/activities/${newActivity.id}`);
      }
    } catch (err) {
      setErrors({ _form: err instanceof Error ? err.message : 'Failed to save' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (isEdit && loadingActivity) return <LoadingState message="Loading activity..." />;

  const selectedCompany = companies?.find((c) => c.id === form.tss_companyId);
  const showDuration = form.tss_activityType === 'Call' || form.tss_activityType === 'Meeting';

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        {isEdit ? 'Edit Activity' : 'Log Activity'}
      </h2>

      {errors._form && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {errors._form}
        </div>
      )}

      {/* Basic Info */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Activity Details</h3>

        <FormField label="Subject" required error={errors.Title}>
          <Input
            value={form.Title ?? ''}
            onChange={(_, data) => updateField('Title', data.value)}
            placeholder="Brief description of the activity"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Type" required error={errors.tss_activityType}>
            <Dropdown
              value={form.tss_activityType ?? 'Call'}
              onOptionSelect={(_, data) =>
                updateField('tss_activityType', (data.optionValue ?? 'Call') as ActivityType)
              }
            >
              {ACTIVITY_TYPES.map((t) => (
                <Option key={t} value={t}>{t}</Option>
              ))}
            </Dropdown>
          </FormField>

          <FormField label="Date" required error={errors.tss_activityDate}>
            <Input
              type="datetime-local"
              value={form.tss_activityDate ?? ''}
              onChange={(_, data) => updateField('tss_activityDate', data.value)}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Direction" error={errors.tss_direction}>
            <Dropdown
              value={form.tss_direction ?? ''}
              onOptionSelect={(_, data) =>
                updateField('tss_direction', (data.optionValue || undefined) as ActivityDirection | undefined)
              }
              clearable
              placeholder="Select direction..."
            >
              {ACTIVITY_DIRECTIONS.map((d) => (
                <Option key={d} value={d}>{d}</Option>
              ))}
            </Dropdown>
          </FormField>

          {showDuration && (
            <FormField label="Duration (minutes)" error={errors.tss_duration}>
              <Input
                type="number"
                value={form.tss_duration != null ? String(form.tss_duration) : ''}
                onChange={(_, data) =>
                  updateField('tss_duration', data.value ? Number(data.value) : undefined as unknown as number)
                }
                min={0}
                placeholder="e.g. 30"
              />
            </FormField>
          )}
        </div>

        <FormField label="Owner" required error={errors.tss_owner}>
          <Input
            value={form.tss_owner ?? ''}
            onChange={(_, data) => updateField('tss_owner', data.value)}
          />
        </FormField>
      </div>

      {/* Linked Records */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Linked Records</h3>

        <FormField label="Company" error={errors.tss_companyId}>
          <Combobox
            value={selectedCompany?.Title ?? ''}
            onOptionSelect={(_, data) => {
              const companyId = data.optionValue ? Number(data.optionValue) : undefined;
              handleCompanyChange(companyId);
            }}
            freeform={false}
            clearable
            placeholder="Search companies..."
          >
            {(companies ?? []).map((c) => (
              <Option key={c.id} value={String(c.id)}>{c.Title}</Option>
            ))}
          </Combobox>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Contact" error={errors.tss_contactId}>
            <Combobox
              value={companyContacts?.find((c) => c.id === form.tss_contactId)?.Title ?? ''}
              onOptionSelect={(_, data) => {
                const contactId = data.optionValue ? Number(data.optionValue) : undefined;
                updateField('tss_contactId', contactId);
              }}
              freeform={false}
              clearable
              disabled={!selectedCompanyId}
              placeholder={selectedCompanyId ? 'Select contact...' : 'Select a company first'}
            >
              {(companyContacts ?? []).map((c) => (
                <Option key={c.id} value={String(c.id)}>{c.Title}</Option>
              ))}
            </Combobox>
          </FormField>

          <FormField label="Opportunity" error={errors.tss_opportunityId}>
            <Combobox
              value={companyOpportunities?.find((o) => o.id === form.tss_opportunityId)?.Title ?? ''}
              onOptionSelect={(_, data) => {
                const oppId = data.optionValue ? Number(data.optionValue) : undefined;
                updateField('tss_opportunityId', oppId);
              }}
              freeform={false}
              clearable
              disabled={!selectedCompanyId}
              placeholder={selectedCompanyId ? 'Select opportunity...' : 'Select a company first'}
            >
              {(companyOpportunities ?? []).map((o) => (
                <Option key={o.id} value={String(o.id)}>{o.Title}</Option>
              ))}
            </Combobox>
          </FormField>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Notes</h3>

        <FormField label="Description" error={errors.tss_description}>
          <Textarea
            value={form.tss_description ?? ''}
            onChange={(_, data) => updateField('tss_description', data.value)}
            rows={4}
            placeholder="Details, outcomes, next steps..."
          />
        </FormField>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          appearance="primary"
          icon={<Save24Regular />}
          onClick={handleSubmit}
          disabled={createActivity.isPending || updateActivity.isPending}
        >
          {createActivity.isPending || updateActivity.isPending
            ? 'Saving...'
            : isEdit ? 'Update Activity' : 'Save Activity'}
        </Button>
        <Button
          appearance="secondary"
          icon={<Dismiss24Regular />}
          onClick={() => navigate(isEdit ? `/activities/${activityId}` : '/activities')}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
