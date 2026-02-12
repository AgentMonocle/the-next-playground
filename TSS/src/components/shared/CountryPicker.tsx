import { useState, useMemo } from 'react';
import { Combobox, Option, Badge, Button } from '@fluentui/react-components';
import { Dismiss12Regular } from '@fluentui/react-icons';
import { useCountries } from '@/hooks/useReferenceData';
import type { Country } from '@/types';

interface CountryPickerProps {
  /** Currently selected country IDs */
  selectedIds: number[];
  /** Called when countries are added or removed */
  onChange: (ids: number[]) => void;
  /** Disable the picker */
  disabled?: boolean;
}

/**
 * Multi-select country picker.
 * Shows selected countries as dismissible badge chips and a combobox to add more.
 */
export function CountryPicker({ selectedIds, onChange, disabled }: CountryPickerProps) {
  const { data: allCountries } = useCountries();
  const [comboValue, setComboValue] = useState('');

  const countryMap = useMemo(() => {
    const map = new Map<number, Country>();
    if (allCountries) for (const c of allCountries) map.set(c.id, c);
    return map;
  }, [allCountries]);

  const availableCountries = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    return (allCountries ?? []).filter((c) => !selectedSet.has(c.id));
  }, [allCountries, selectedIds]);

  const handleAdd = (countryId: number) => {
    if (!selectedIds.includes(countryId)) {
      onChange([...selectedIds, countryId]);
    }
    setComboValue('');
  };

  const handleRemove = (countryId: number) => {
    onChange(selectedIds.filter((id) => id !== countryId));
  };

  return (
    <div className="space-y-2">
      {/* Selected countries as chips */}
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedIds.map((id) => {
            const country = countryMap.get(id);
            return (
              <Badge
                key={id}
                appearance="outline"
                color="brand"
                size="medium"
                className="pr-1"
              >
                <span className="flex items-center gap-1">
                  {country?.Title ?? `Country #${id}`}
                  {!disabled && (
                    <Button
                      appearance="transparent"
                      size="small"
                      icon={<Dismiss12Regular />}
                      onClick={() => handleRemove(id)}
                      className="!min-w-0 !p-0"
                    />
                  )}
                </span>
              </Badge>
            );
          })}
        </div>
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
          placeholder={selectedIds.length > 0 ? 'Add another country...' : 'Select country...'}
        >
          {availableCountries.map((c) => (
            <Option key={c.id} value={String(c.id)} text={`${c.Title} (${c.tss_countryCode})`}>
              {`${c.Title} (${c.tss_countryCode})`}
            </Option>
          ))}
        </Combobox>
      )}
    </div>
  );
}
