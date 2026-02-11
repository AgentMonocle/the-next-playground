import { Button } from '@fluentui/react-components';
import { ErrorCircle24Regular } from '@fluentui/react-icons';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = 'Something went wrong. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <ErrorCircle24Regular className="text-red-500 w-12 h-12" />
      <p className="mt-4 text-sm text-gray-700">{message}</p>
      {onRetry && (
        <Button appearance="primary" className="mt-4" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
