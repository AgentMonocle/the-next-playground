import { Button } from '@fluentui/react-components';
import { DocumentBulletList24Regular, Add24Regular } from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';

interface EmptyStateProps {
  title: string;
  description?: string;
  createLabel?: string;
  createPath?: string;
}

export function EmptyState({ title, description, createLabel, createPath }: EmptyStateProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <DocumentBulletList24Regular className="text-gray-400 w-12 h-12" />
      <p className="mt-4 text-lg font-medium text-gray-700">{title}</p>
      {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      {createLabel && createPath && (
        <Button
          appearance="primary"
          icon={<Add24Regular />}
          className="mt-4"
          onClick={() => navigate(createPath)}
        >
          {createLabel}
        </Button>
      )}
    </div>
  );
}
