import { Button } from '@fluentui/react-components';
import { Add24Regular } from '@fluentui/react-icons';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  createLabel?: string;
  createPath?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, createLabel, createPath, actions }: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {createLabel && createPath && (
          <Button
            appearance="primary"
            icon={<Add24Regular />}
            onClick={() => navigate(createPath)}
          >
            {createLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
