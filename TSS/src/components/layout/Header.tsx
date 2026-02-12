import { useMsal } from '@azure/msal-react';
import { Button, Avatar } from '@fluentui/react-components';
import { SignOut24Regular } from '@fluentui/react-icons';

export function Header() {
  const { instance, accounts } = useMsal();
  const account = accounts[0];

  const handleLogout = () => {
    instance.logoutRedirect();
  };

  const initials = account?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="flex items-center justify-end h-14 px-6 bg-white border-b border-gray-200">
      <div className="flex items-center gap-3">
        <Avatar
          name={account?.name ?? 'User'}
          initials={initials}
          size={32}
          color="brand"
        />
        <span className="text-sm text-gray-700">
          {account?.name ?? account?.username}
        </span>
        <Button
          appearance="subtle"
          size="small"
          icon={<SignOut24Regular />}
          onClick={handleLogout}
        >
          Sign out
        </Button>
      </div>
    </header>
  );
}
