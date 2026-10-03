import PageHeader from '../../components/ui/PageHeader.jsx';
import { useAuth } from '../../context/useAuth.js';

export default function AccountPage() {
  const { user } = useAuth();
  return (
    <PageHeader
      title="Account"
      subtitle={user ? `${user.name} · ${user.email}` : 'Your account'}
    />
  );
}
