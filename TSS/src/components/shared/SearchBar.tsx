import { useState, useEffect } from 'react';
import { Input } from '@fluentui/react-components';
import { Search24Regular, Dismiss24Regular } from '@fluentui/react-icons';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export function SearchBar({ value, onChange, placeholder = 'Search...', debounceMs = 300 }: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, debounceMs, onChange, value]);

  return (
    <Input
      value={localValue}
      onChange={(_, data) => setLocalValue(data.value)}
      placeholder={placeholder}
      contentBefore={<Search24Regular />}
      contentAfter={
        localValue ? (
          <button
            onClick={() => {
              setLocalValue('');
              onChange('');
            }}
            className="cursor-pointer p-0 border-0 bg-transparent"
          >
            <Dismiss24Regular />
          </button>
        ) : undefined
      }
      className="w-72"
    />
  );
}
