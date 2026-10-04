import Button from '../ui/Button.jsx';
import Card from '../ui/Card.jsx';
import EmptyState from '../ui/EmptyState.jsx';

export default function CatalogEmpty({ title = 'No products match', description, onClear }) {
  return (
    <Card>
      <EmptyState
        icon="bi bi-search"
        title={title}
        description={description}
        action={
          onClear ? (
            <Button variant="primary" onClick={onClear}>
              Clear filters
            </Button>
          ) : null
        }
      />
    </Card>
  );
}
