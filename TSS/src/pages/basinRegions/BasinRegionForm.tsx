import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button,
  Input,
  Textarea,
  Combobox,
  Option,
} from '@fluentui/react-components';
import { Save24Regular, Dismiss24Regular } from '@fluentui/react-icons';
import { FormField } from '@/components/shared/FormField';
import { LoadingState } from '@/components/shared/LoadingState';
import { useBasinRegion, useCreateBasinRegion, useUpdateBasinRegion } from '@/hooks/useBasinRegions';
import { useCountries } from '@/hooks/useReferenceData';
import { basinRegionFormSchema, type BasinRegionFormData } from '@/types';

export function BasinRegionForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const basinId = id ? Number(id) : undefined;

  const { data: existingBasin, isLoading: loadingBasin } = useBasinRegion(basinId);
  const { data: countries } = useCountries();
  const createBasin = useCreateBasinRegion();
  const updateBasin = useUpdateBasinRegion();

  const [form, setForm] = useState<Partial<BasinRegionFormData>>({
    Title: '',
    tss_basinCode: '',
    tss_isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEdit && existingBasin) {
      setForm({
        Title: existingBasin.Title,
        tss_basinCode: existingBasin.tss_basinCode,
        tss_countryId: existingBasin.tss_countryId?.LookupId,
        tss_description: existingBasin.tss_description ?? '',
        tss_isActive: existingBasin.tss_isActive,
      });
    }
  }, [isEdit, existingBasin]);

  const updateField = <K extends keyof BasinRegionFormData>(key: K, value: BasinRegionFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async () => {
    const result = basinRegionFormSchema.safeParse(form);
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
      if (isEdit && basinId) {
        await updateBasin.mutateAsync({ id: basinId, data: result.data });
        navigate(`/basin-regions/${basinId}`);
      } else {
        const newBasin = await createBasin.mutateAsync(result.data);
        navigate(`/basin-regions/${newBasin.id}`);
      }
    } catch (err) {
      setErrors({ _form: err instanceof Error ? err.message : 'Failed to save' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (isEdit && loadingBasin) return <LoadingState message="Loading basin/region..." />;

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        {isEdit ? 'Edit Basin/Region' : 'New Basin/Region'}
      </h2>

      {errors._form && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {errors._form}
        </div>
      )}

      <div className="bg-white rounded-lg border p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Basin/Region Name" required error={errors.Title}>
            <Input
              value={form.Title ?? ''}
              onChange={(_, data) => updateField('Title', data.value)}
              placeholder="e.g., Permian"
            />
          </FormField>

          <FormField label="Basin Code" required error={errors.tss_basinCode}>
            <Input
              value={form.tss_basinCode ?? ''}
              onChange={(_, data) => updateField('tss_basinCode', data.value.toUpperCase())}
              maxLength={6}
              placeholder="e.g., PERM"
            />
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
            placeholder="Select country (optional)..."
          >
            {(countries ?? []).map((c) => (
              <Option key={c.id} value={String(c.id)}>{c.Title}</Option>
            ))}
          </Combobox>
        </FormField>

        <FormField label="Description" error={errors.tss_description}>
          <Textarea
            value={form.tss_description ?? ''}
            onChange={(_, data) => updateField('tss_description', data.value)}
            rows={3}
            placeholder="Description of this basin/region..."
          />
        </FormField>
      </div>

      <div className="flex items-center gap-3">
        <Button
          appearance="primary"
          icon={<Save24Regular />}
          onClick={handleSubmit}
          disabled={createBasin.isPending || updateBasin.isPending}
        >
          {createBasin.isPending || updateBasin.isPending
            ? 'Saving...'
            : isEdit ? 'Update Basin/Region' : 'Create Basin/Region'}
        </Button>
        <Button
          appearance="secondary"
          icon={<Dismiss24Regular />}
          onClick={() => navigate(isEdit ? `/basin-regions/${basinId}` : '/basin-regions')}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
