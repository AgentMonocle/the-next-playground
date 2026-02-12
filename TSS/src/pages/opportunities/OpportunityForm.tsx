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
import { useOpportunity, useCreateOpportunity, useUpdateOpportunity } from '@/hooks/useOpportunities';
import { useCompanies } from '@/hooks/useCompanies';
import { useContactsByCompany } from '@/hooks/useContacts';
import {
  opportunityFormSchema,
  OPPORTUNITY_STAGES,
  CLOSE_STATUSES,
  PURSUIT_DECISIONS,
  BASINS,
  PRODUCT_LINES,
  type OpportunityFormData,
} from '@/types';

export function OpportunityForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const oppId = id ? Number(id) : undefined;

  const { data: existingOpp, isLoading: loadingOpp } = useOpportunity(oppId);
  const { data: companies } = useCompanies({ isActive: true });
  const createOpportunity = useCreateOpportunity();
  const updateOpportunity = useUpdateOpportunity();

  const [form, setForm] = useState<Partial<OpportunityFormData>>({
    tss_stage: 'Lead',
    tss_isRelated: false,
    tss_isTaxExempt: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>();

  // Fetch contacts filtered by selected company
  const { data: companyContacts } = useContactsByCompany(selectedCompanyId);

  useEffect(() => {
    if (isEdit && existingOpp) {
      setForm({
        Title: existingOpp.Title,
        tss_companyId: existingOpp.tss_companyId?.LookupId,
        tss_primaryContactId: existingOpp.tss_primaryContactId?.LookupId,
        tss_stage: existingOpp.tss_stage,
        tss_closeStatus: existingOpp.tss_closeStatus,
        tss_closeReason: existingOpp.tss_closeReason ?? '',
        tss_probability: existingOpp.tss_probability,
        tss_revenue: existingOpp.tss_revenue,
        tss_bidDueDate: existingOpp.tss_bidDueDate ?? '',
        tss_deliveryDate: existingOpp.tss_deliveryDate ?? '',
        tss_closeDate: existingOpp.tss_closeDate ?? '',
        tss_productLine: existingOpp.tss_productLine as OpportunityFormData['tss_productLine'],
        tss_basin: existingOpp.tss_basin,
        tss_isRelated: existingOpp.tss_isRelated ?? false,
        tss_relatedOpportunityId: existingOpp.tss_relatedOpportunityId?.LookupId,
        tss_pursuitDecision: existingOpp.tss_pursuitDecision,
        tss_pursuitRationale: existingOpp.tss_pursuitRationale ?? '',
        tss_poNumber: existingOpp.tss_poNumber ?? '',
        tss_isTaxExempt: existingOpp.tss_isTaxExempt ?? false,
        tss_notes: existingOpp.tss_notes ?? '',
      });
      setSelectedCompanyId(existingOpp.tss_companyId?.LookupId);
    }
  }, [isEdit, existingOpp]);

  const updateField = <K extends keyof OpportunityFormData>(key: K, value: OpportunityFormData[K]) => {
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
    // Reset contact selection when company changes
    updateField('tss_primaryContactId', undefined as unknown as number);
  };

  const handleSubmit = async () => {
    const result = opportunityFormSchema.safeParse(form);
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
      if (isEdit && oppId) {
        await updateOpportunity.mutateAsync({ id: oppId, data: result.data });
        navigate(`/opportunities/${oppId}`);
      } else {
        // For create, we need the company code for ID generation
        const company = companies?.find((c) => c.id === result.data.tss_companyId);
        if (!company) {
          setErrors({ tss_companyId: 'Selected company not found' });
          return;
        }

        const newOpp = await createOpportunity.mutateAsync({
          ...result.data,
          companyCode: company.tss_companyCode,
        });
        navigate(`/opportunities/${newOpp.id}`);
      }
    } catch (err) {
      setErrors({ _form: err instanceof Error ? err.message : 'Failed to save' });
    }
  };

  if (isEdit && loadingOpp) return <LoadingState message="Loading opportunity..." />;

  const selectedCompany = companies?.find((c) => c.id === form.tss_companyId);
  const showCloseFields = form.tss_stage === 'Close' || form.tss_closeStatus;

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">
        {isEdit ? 'Edit Opportunity' : 'New Opportunity'}
      </h2>

      {isEdit && existingOpp && (
        <p className="text-sm text-gray-500 font-mono">
          {existingOpp.tss_opportunityId}
        </p>
      )}

      {errors._form && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          {errors._form}
        </div>
      )}

      {/* Basic Info */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Basic Information</h3>

        <FormField label="Opportunity Name" required error={errors.Title}>
          <Input
            value={form.Title ?? ''}
            onChange={(_, data) => updateField('Title', data.value)}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Company" required error={errors.tss_companyId}>
            <Combobox
              value={selectedCompany?.Title ?? ''}
              onOptionSelect={(_, data) => {
                const companyId = data.optionValue ? Number(data.optionValue) : undefined;
                handleCompanyChange(companyId);
              }}
              freeform={false}
              clearable
            >
              {(companies ?? []).map((c) => (
                <Option key={c.id} value={String(c.id)}>{c.Title}</Option>
              ))}
            </Combobox>
          </FormField>

          <FormField label="Primary Contact" error={errors.tss_primaryContactId}>
            <Combobox
              value={companyContacts?.find((c) => c.id === form.tss_primaryContactId)?.Title ?? ''}
              onOptionSelect={(_, data) => {
                const contactId = data.optionValue ? Number(data.optionValue) : undefined;
                updateField('tss_primaryContactId', contactId);
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
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Stage" error={errors.tss_stage}>
            <Dropdown
              value={form.tss_stage ?? 'Lead'}
              onOptionSelect={(_, data) =>
                updateField('tss_stage', (data.optionValue ?? 'Lead') as OpportunityFormData['tss_stage'])
              }
            >
              {OPPORTUNITY_STAGES.map((s) => (
                <Option key={s} value={s}>{s}</Option>
              ))}
            </Dropdown>
          </FormField>

          <FormField label="Product Line" error={errors.tss_productLine}>
            <Dropdown
              value={form.tss_productLine ?? ''}
              onOptionSelect={(_, data) =>
                updateField('tss_productLine', (data.optionValue ?? undefined) as OpportunityFormData['tss_productLine'])
              }
              clearable
            >
              {PRODUCT_LINES.map((pl) => (
                <Option key={pl} value={pl}>{pl}</Option>
              ))}
            </Dropdown>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Basin/Region" error={errors.tss_basin}>
            <Dropdown
              value={form.tss_basin ?? ''}
              onOptionSelect={(_, data) =>
                updateField('tss_basin', (data.optionValue ?? undefined) as OpportunityFormData['tss_basin'])
              }
              clearable
            >
              {BASINS.map((b) => (
                <Option key={b} value={b}>{b}</Option>
              ))}
            </Dropdown>
          </FormField>

          <FormField label="Pursuit Decision" error={errors.tss_pursuitDecision}>
            <Dropdown
              value={form.tss_pursuitDecision ?? ''}
              onOptionSelect={(_, data) =>
                updateField('tss_pursuitDecision', (data.optionValue ?? undefined) as OpportunityFormData['tss_pursuitDecision'])
              }
              clearable
            >
              {PURSUIT_DECISIONS.map((d) => (
                <Option key={d} value={d}>{d}</Option>
              ))}
            </Dropdown>
          </FormField>
        </div>
      </div>

      {/* Financial Info */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Financial</h3>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Revenue ($)" error={errors.tss_revenue}>
            <Input
              type="number"
              value={form.tss_revenue != null ? String(form.tss_revenue) : ''}
              onChange={(_, data) =>
                updateField('tss_revenue', data.value ? Number(data.value) : undefined as unknown as number)
              }
              placeholder="0"
              contentBefore={<span className="text-gray-500">$</span>}
            />
          </FormField>

          <FormField label="Probability (%)" error={errors.tss_probability}>
            <Input
              type="number"
              value={form.tss_probability != null ? String(form.tss_probability) : ''}
              onChange={(_, data) =>
                updateField('tss_probability', data.value ? Number(data.value) : undefined as unknown as number)
              }
              min={0}
              max={100}
              placeholder="0-100"
              contentAfter={<span className="text-gray-500">%</span>}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="PO Number" error={errors.tss_poNumber}>
            <Input
              value={form.tss_poNumber ?? ''}
              onChange={(_, data) => updateField('tss_poNumber', data.value)}
            />
          </FormField>

          <div className="flex items-end pb-1">
            <Switch
              checked={form.tss_isTaxExempt ?? false}
              onChange={(_, data) => updateField('tss_isTaxExempt', data.checked)}
              label="Tax Exempt"
            />
          </div>
        </div>
      </div>

      {/* Dates */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Key Dates</h3>

        <div className="grid grid-cols-3 gap-4">
          <FormField label="Bid Due Date" error={errors.tss_bidDueDate}>
            <Input
              type="date"
              value={form.tss_bidDueDate ?? ''}
              onChange={(_, data) => updateField('tss_bidDueDate', data.value)}
            />
          </FormField>

          <FormField label="Delivery Date" error={errors.tss_deliveryDate}>
            <Input
              type="date"
              value={form.tss_deliveryDate ?? ''}
              onChange={(_, data) => updateField('tss_deliveryDate', data.value)}
            />
          </FormField>

          <FormField label="Close Date" error={errors.tss_closeDate}>
            <Input
              type="date"
              value={form.tss_closeDate ?? ''}
              onChange={(_, data) => updateField('tss_closeDate', data.value)}
            />
          </FormField>
        </div>
      </div>

      {/* Close Info (conditional) */}
      {showCloseFields && (
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Close Information</h3>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Close Status" error={errors.tss_closeStatus}>
              <Dropdown
                value={form.tss_closeStatus ?? ''}
                onOptionSelect={(_, data) =>
                  updateField('tss_closeStatus', (data.optionValue ?? undefined) as OpportunityFormData['tss_closeStatus'])
                }
                clearable
              >
                {CLOSE_STATUSES.map((s) => (
                  <Option key={s} value={s}>{s}</Option>
                ))}
              </Dropdown>
            </FormField>

            <FormField label="Close Reason" error={errors.tss_closeReason}>
              <Input
                value={form.tss_closeReason ?? ''}
                onChange={(_, data) => updateField('tss_closeReason', data.value)}
                placeholder="Why was this opportunity closed?"
              />
            </FormField>
          </div>
        </div>
      )}

      {/* Pursuit & Notes */}
      <div className="bg-white rounded-lg border p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Additional Details</h3>

        <FormField label="Pursuit Rationale" error={errors.tss_pursuitRationale}>
          <Textarea
            value={form.tss_pursuitRationale ?? ''}
            onChange={(_, data) => updateField('tss_pursuitRationale', data.value)}
            rows={3}
            placeholder="Rationale for pursuit decision..."
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

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button
          appearance="primary"
          icon={<Save24Regular />}
          onClick={handleSubmit}
          disabled={createOpportunity.isPending || updateOpportunity.isPending}
        >
          {createOpportunity.isPending || updateOpportunity.isPending
            ? 'Saving...'
            : isEdit ? 'Update Opportunity' : 'Create Opportunity'}
        </Button>
        <Button
          appearance="secondary"
          icon={<Dismiss24Regular />}
          onClick={() => navigate(isEdit ? `/opportunities/${oppId}` : '/opportunities')}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
