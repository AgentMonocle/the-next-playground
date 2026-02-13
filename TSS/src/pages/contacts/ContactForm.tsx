import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Button,
  Input,
  Dropdown,
  Option,
  Switch,
  Textarea,
  Combobox,
} from '@fluentui/react-components';
import { Save24Regular, Dismiss24Regular } from '@fluentui/react-icons';
import { FormField } from '@/components/shared/FormField';
import { LoadingState } from '@/components/shared/LoadingState';
import { useContact, useCreateContact, useUpdateContact } from '@/hooks/useContacts';
import { useCompanies } from '@/hooks/useCompanies';
import { useSuppressAutoFill } from '@/hooks/useSuppressAutoFill';
import { contactFormSchema, DEPARTMENTS, type ContactFormData } from '@/types';

export function ContactForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const contactId = id ? Number(id) : undefined;

  const preselectedCompanyId = searchParams.get('companyId')
    ? Number(searchParams.get('companyId'))
    : undefined;

  const { data: existingContact, isLoading: loadingContact } = useContact(contactId);
  const { data: companies } = useCompanies({ isActive: true });
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();

  const [form, setForm] = useState<Partial<ContactFormData>>({
    Title: '',
    tss_isActive: true,
    tss_isDecisionMaker: false,
    tss_isInfluencer: false,
    tss_companyId: preselectedCompanyId,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEdit && existingContact) {
      setForm({
        Title: existingContact.Title,
        tss_preferredName: existingContact.tss_preferredName ?? '',
        tss_email: existingContact.tss_email ?? '',
        tss_phone: existingContact.tss_phone ?? '',
        tss_mobile: existingContact.tss_mobile ?? '',
        tss_jobTitle: existingContact.tss_jobTitle ?? '',
        tss_department: existingContact.tss_department,
        tss_companyId: existingContact.tss_companyId?.LookupId,
        tss_isDecisionMaker: existingContact.tss_isDecisionMaker ?? false,
        tss_isInfluencer: existingContact.tss_isInfluencer ?? false,
        tss_isActive: existingContact.tss_isActive,
        tss_notes: existingContact.tss_notes ?? '',
      });
    }
  }, [isEdit, existingContact]);

  const updateField = <K extends keyof ContactFormData>(key: K, value: ContactFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async () => {
    const result = contactFormSchema.safeParse(form);
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
      if (isEdit && contactId) {
        await updateContact.mutateAsync({ id: contactId, data: result.data });
        navigate(`/contacts/${contactId}`);
      } else {
        const newContact = await createContact.mutateAsync(result.data);
        navigate(`/contacts/${newContact.id}`);
      }
    } catch (err) {
      setErrors({ _form: err instanceof Error ? err.message : 'Failed to save' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const suppressAutoFill = useSuppressAutoFill();

  if (isEdit && loadingContact) return <LoadingState message="Loading contact..." />;

  const companyOptions = companies ?? [];

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        {isEdit ? 'Edit Contact' : 'New Contact'}
      </h2>

      {errors._form && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {errors._form}
        </div>
      )}

      <div className="bg-white rounded-lg border p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Full Name" required error={errors.Title}>
            <Input
              value={form.Title ?? ''}
              onChange={(_, data) => updateField('Title', data.value)}
            />
          </FormField>

          <FormField label="Preferred Name" error={errors.tss_preferredName}>
            <Input
              value={form.tss_preferredName ?? ''}
              onChange={(_, data) => updateField('tss_preferredName', data.value)}
            />
          </FormField>
        </div>

        <FormField label="Email" error={errors.tss_email}>
          <Input
            value={form.tss_email ?? ''}
            onChange={(_, data) => updateField('tss_email', data.value)}
            type="email"
            placeholder="name@example.com"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Phone" error={errors.tss_phone}>
            <Input
              value={form.tss_phone ?? ''}
              onChange={(_, data) => updateField('tss_phone', data.value)}
            />
          </FormField>

          <FormField label="Mobile" error={errors.tss_mobile}>
            <Input
              value={form.tss_mobile ?? ''}
              onChange={(_, data) => updateField('tss_mobile', data.value)}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Job Title" error={errors.tss_jobTitle}>
            <Input
              value={form.tss_jobTitle ?? ''}
              onChange={(_, data) => updateField('tss_jobTitle', data.value)}
            />
          </FormField>

          <FormField label="Department" error={errors.tss_department}>
            <Dropdown
              value={form.tss_department ?? ''}
              onOptionSelect={(_, data) =>
                updateField('tss_department', (data.optionValue ?? undefined) as ContactFormData['tss_department'])
              }
              clearable
            >
              {DEPARTMENTS.map((d) => (
                <Option key={d} value={d}>{d}</Option>
              ))}
            </Dropdown>
          </FormField>
        </div>

        <FormField label="Company" required error={errors.tss_companyId}>
          <Combobox
            value={companyOptions.find((c) => c.id === form.tss_companyId)?.Title ?? ''}
            onOptionSelect={(_, data) => {
              const companyId = data.optionValue ? Number(data.optionValue) : undefined;
              updateField('tss_companyId', companyId as number);
            }}
            freeform={false}
            clearable
            input={{ autoComplete: 'off', ref: suppressAutoFill }}
          >
            {companyOptions.map((c) => (
              <Option key={c.id} value={String(c.id)} text={c.Title}>{c.Title}</Option>
            ))}
          </Combobox>
        </FormField>

        <div className="flex gap-6">
          <Switch
            checked={form.tss_isDecisionMaker ?? false}
            onChange={(_, data) => updateField('tss_isDecisionMaker', data.checked)}
            label="Decision Maker"
          />

          <Switch
            checked={form.tss_isInfluencer ?? false}
            onChange={(_, data) => updateField('tss_isInfluencer', data.checked)}
            label="Influencer"
          />
        </div>

        <FormField label="Notes" error={errors.tss_notes}>
          <Textarea
            value={form.tss_notes ?? ''}
            onChange={(_, data) => updateField('tss_notes', data.value)}
            rows={4}
          />
        </FormField>
      </div>

      <div className="flex items-center gap-3">
        <Button
          appearance="primary"
          icon={<Save24Regular />}
          onClick={handleSubmit}
          disabled={createContact.isPending || updateContact.isPending}
        >
          {createContact.isPending || updateContact.isPending
            ? 'Saving...'
            : isEdit ? 'Update Contact' : 'Create Contact'}
        </Button>
        <Button
          appearance="secondary"
          icon={<Dismiss24Regular />}
          onClick={() => navigate(isEdit ? `/contacts/${contactId}` : '/contacts')}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
