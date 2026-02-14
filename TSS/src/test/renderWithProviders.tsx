import { render, type RenderOptions } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import type { ReactElement } from 'react';

/**
 * Render a component wrapped in FluentProvider for tests.
 * All component tests should use this instead of bare `render()`.
 */
export function renderWithFluent(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <FluentProvider theme={webLightTheme}>{children}</FluentProvider>
    ),
    ...options,
  });
}
