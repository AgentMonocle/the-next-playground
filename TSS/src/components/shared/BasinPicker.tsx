import { useState, useMemo } from 'react';
import { Combobox, Option, InteractionTag, InteractionTagPrimary, TagGroup } from '@fluentui/react-components';
import { useBasinRegions } from '@/hooks/useBasinRegions';
import type { BasinRegion } from '@/types';

interface BasinPickerProps {
  /** Currently selected basin IDs */
  selectedIds: number[];
  /** Called when basins are added or removed */
  onChange: (ids: number[]) => void;
  /** Label shown above the picker */
  label?: string;
  /** Disable the picker */
  disabled?: boolean;
}

/**
 * Multi-select basin/region picker.
 * Shows selected basins as dismissible badge chips and a combobox to add more.
 */
export function BasinPicker({ selectedIds, onChange, disabled }: BasinPickerProps) {
  const { data: allBasins } = useBasinRegions({ isActive: true });
  const [comboValue, setComboValue] = useState('');

  const basinMap = useMemo(() => {
    const map = new Map<number, BasinRegion>();
    if (allBasins) for (const b of allBasins) map.set(b.id, b);
    return map;
  }, [allBasins]);

  const availableBasins = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    return (allBasins ?? []).filter((b) => !selectedSet.has(b.id));
  }, [allBasins, selectedIds]);

  const handleAdd = (basinId: number) => {
    if (!selectedIds.includes(basinId)) {
      onChange([...selectedIds, basinId]);
    }
    setComboValue('');
  };

  const handleRemove = (basinId: number) => {
    onChange(selectedIds.filter((id) => id !== basinId));
  };

  return (
    <div className="space-y-2">
      {/* Selected basins as dismissible tags */}
      {selectedIds.length > 0 && (
        <TagGroup
          onDismiss={(_e, data) => {
            if (!disabled) handleRemove(Number(data.value));
          }}
        >
          <div className="flex flex-wrap gap-1.5">
            {selectedIds.map((id) => {
              const basin = basinMap.get(id);
              return (
                <InteractionTag
                  key={id}
                  appearance="outline"
                  shape="circular"
                  size="small"
                  value={String(id)}
                >
                  <InteractionTagPrimary hasSecondaryAction={!disabled}>
                    {basin?.Title ?? `Basin #${id}`}
                  </InteractionTagPrimary>
                </InteractionTag>
              );
            })}
          </div>
        </TagGroup>
      )}

      {/* Combobox to add more */}
      {!disabled && (
        <Combobox
          value={comboValue}
          onChange={(e) => setComboValue((e.target as HTMLInputElement).value)}
          onOptionSelect={(_, data) => {
            if (data.optionValue) {
              handleAdd(Number(data.optionValue));
            }
          }}
          freeform={false}
          placeholder={selectedIds.length > 0 ? 'Add another basin/region...' : 'Select basin/region...'}
        >
          {availableBasins.map((b) => (
            <Option key={b.id} value={String(b.id)} text={`${b.Title} (${b.tss_basinCode})`}>
              {`${b.Title} (${b.tss_basinCode})`}
            </Option>
          ))}
        </Combobox>
      )}
    </div>
  );
}
