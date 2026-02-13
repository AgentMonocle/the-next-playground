import { useCallback } from 'react';

/**
 * Returns a ref callback that sets data attributes on an `<input>` element
 * to suppress LastPass, 1Password, and similar browser-extension autofill overlays.
 *
 * Usage with Fluent UI Combobox:
 * ```tsx
 * const suppressAutoFill = useSuppressAutoFill();
 * <Combobox input={{ autoComplete: 'off', ref: suppressAutoFill }}>
 * ```
 */
export function useSuppressAutoFill() {
  return useCallback((el: HTMLInputElement | null) => {
    if (el) {
      el.setAttribute('data-lpignore', 'true');
      el.setAttribute('data-form-type', 'other');
      el.setAttribute('data-1p-ignore', '');
    }
  }, []);
}
