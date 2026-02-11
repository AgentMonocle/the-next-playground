import { Spinner } from '@fluentui/react-components';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Spinner size="large" />
      <p className="mt-4 text-sm text-gray-500">{message}</p>
    </div>
  );
}
