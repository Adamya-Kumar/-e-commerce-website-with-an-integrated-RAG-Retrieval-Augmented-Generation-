import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import EmptyState from '../ui/EmptyState.jsx';

export default function CatalogError({ title, description, onRetry }) {
  return (
    <Card>
      <EmptyState
        icon="bi bi-exclamation-triangle"
        title={title}
        description={description}
        action={
          <Button variant="primary" onClick={onRetry}>
            Try again
          </Button>
        }
      />
    </Card>
  );
}
