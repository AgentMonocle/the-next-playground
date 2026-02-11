import { Label, Field } from '@fluentui/react-components';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ label, required, error, children, className }: FormFieldProps) {
  return (
    <Field
      label={<Label weight="semibold" required={required}>{label}</Label>}
      validationMessage={error}
      validationState={error ? 'error' : undefined}
      className={className}
    >
      {children}
    </Field>
  );
}
