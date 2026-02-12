import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { useCompany, useCompanies, useCreateCompany, useUpdateCompany } from '@/hooks/useCompanies';
import { useCountries } from '@/hooks/useReferenceData';
import { companyFormSchema, INDUSTRIES, COMPANY_TYPES, type CompanyFormData } from '@/types';

export function CompanyForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const companyId = id ? Number(id) : undefined;

  const { data: existingCompany, isLoading: loadingCompany } = useCompany(companyId);
  const { data: countries } = useCountries();
  const { data: allCompanies } = useCompanies({ isActive: true });
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();

  const [form, setForm] = useState<Partial<CompanyFormData>>({
    Title: '',
    tss_companyCode: '',
    tss_isActive: true,
    tss_isSubsidiary: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEdit && existingCompany) {
      setForm({
        Title: existingCompany.Title,
        tss_companyCode: existingCompany.tss_companyCode,
        tss_industry: existingCompany.tss_industry,
        tss_countryId: existingCompany.tss_countryId?.LookupId,
        tss_isSubsidiary: existingCompany.tss_isSubsidiary ?? false,
        tss_parentCompanyId: existingCompany.tss_parentCompanyId?.LookupId,
        tss_website: existingCompany.tss_website ?? '',
        tss_phone: existingCompany.tss_phone ?? '',
        tss_address: existingCompany.tss_address ?? '',
        tss_companyType: existingCompany.tss_companyType,
        tss_notes: existingCompany.tss_notes ?? '',
        tss_isActive: existingCompany.tss_isActive,
      });
    }
  }, [isEdit, existingCompany]);

  const updateField = <K extends keyof CompanyFormData>(key: K, value: CompanyFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async () => {
    const result = companyFormSchema.safeParse(form);
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
      if (isEdit && companyId) {
        await updateCompany.mutateAsync({ id: companyId, data: result.data });
        navigate(`/companies/${companyId}`);
      } else {
        const newCompany = await createCompany.mutateAsync(result.data);
        navigate(`/companies/${newCompany.id}`);
      }
    } catch (err) {
      setErrors({ _form: err instanceof Error ? err.message : 'Failed to save' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (isEdit && loadingCompany) return <LoadingState message="Loading company..." />;

  const parentOptions = allCompanies?.filter((c) => c.id !== companyId) ?? [];

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        {isEdit ? 'Edit Company' : 'New Company'}
      </h2>

      {errors._form && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {errors._form}
        </div>
      )}

      <div className="bg-white rounded-lg border p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Company Name" required error={errors.Title}>
            <Input
              value={form.Title ?? ''}
              onChange={(_, data) => updateField('Title', data.value)}
            />
          </FormField>

          <FormField label="Company Code" required error={errors.tss_companyCode}>
            <Input
              value={form.tss_companyCode ?? ''}
              onChange={(_, data) => updateField('tss_companyCode', data.value.toUpperCase())}
              maxLength={6}
              placeholder="e.g., CVX, SLB"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Industry" error={errors.tss_industry}>
            <Dropdown
              value={form.tss_industry ?? ''}
              onOptionSelect={(_, data) =>
                updateField('tss_industry', (data.optionValue ?? undefined) as CompanyFormData['tss_industry'])
              }
              clearable
            >
              {INDUSTRIES.map((i) => (
                <Option key={i} value={i}>{i}</Option>
              ))}
            </Dropdown>
          </FormField>

          <FormField label="Company Type" error={errors.tss_companyType}>
            <Dropdown
              value={form.tss_companyType ?? ''}
              onOptionSelect={(_, data) =>
                updateField('tss_companyType', (data.optionValue ?? undefined) as CompanyFormData['tss_companyType'])
              }
              clearable
            >
              {COMPANY_TYPES.map((t) => (
                <Option key={t} value={t}>{t}</Option>
              ))}
            </Dropdown>
          </FormField>
        </div>

        <FormField label="Country" error={errors.tss_countryId}>
          <Combobox
            value={countries?.find((c) => c.id === form.tss_countryId)?.Title ?? ''}
            onOptionSelect={(_, data) => {
              const countryId = data.optionValue ? Number(data.optionValue) : undefined;
              updateField('tss_countryId', countryId);
            }}
            freeform={false}
            clearable
          >
            {(countries ?? []).map((c) => (
              <Option key={c.id} value={String(c.id)}>{c.Title}</Option>
            ))}
          </Combobox>
        </FormField>

        <Switch
          checked={form.tss_isSubsidiary ?? false}
          onChange={(_, data) => updateField('tss_isSubsidiary', data.checked)}
          label="Is Subsidiary"
        />

        {form.tss_isSubsidiary && (
          <FormField label="Parent Company" error={errors.tss_parentCompanyId}>
            <Combobox
              value={parentOptions.find((c) => c.id === form.tss_parentCompanyId)?.Title ?? ''}
              onOptionSelect={(_, data) => {
                const parentId = data.optionValue ? Number(data.optionValue) : undefined;
                updateField('tss_parentCompanyId', parentId);
              }}
              freeform={false}
              clearable
            >
              {parentOptions.map((c) => (
                <Option key={c.id} value={String(c.id)} text={`${c.Title} (${c.tss_companyCode})`}>{`${c.Title} (${c.tss_companyCode})`}</Option>
              ))}
            </Combobox>
          </FormField>
        )}

        <FormField label="Website" error={errors.tss_website}>
          <Input
            value={form.tss_website ?? ''}
            onChange={(_, data) => updateField('tss_website', data.value)}
            placeholder="https://example.com"
          />
        </FormField>

        <FormField label="Phone" error={errors.tss_phone}>
          <Input
            value={form.tss_phone ?? ''}
            onChange={(_, data) => updateField('tss_phone', data.value)}
          />
        </FormField>

        <FormField label="Address" error={errors.tss_address}>
          <Textarea
            value={form.tss_address ?? ''}
            onChange={(_, data) => updateField('tss_address', data.value)}
            rows={3}
          />
        </FormField>

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
          disabled={createCompany.isPending || updateCompany.isPending}
        >
          {createCompany.isPending || updateCompany.isPending
            ? 'Saving...'
            : isEdit ? 'Update Company' : 'Create Company'}
        </Button>
        <Button
          appearance="secondary"
          icon={<Dismiss24Regular />}
          onClick={() => navigate(isEdit ? `/companies/${companyId}` : '/companies')}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
