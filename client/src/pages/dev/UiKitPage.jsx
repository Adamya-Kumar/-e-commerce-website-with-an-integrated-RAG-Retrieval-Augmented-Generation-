import { useState } from 'react';
import { Link } from 'react-router-dom';
import Badge from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import Card from '../../components/ui/Card.jsx';
import DataTable from '../../components/ui/DataTable.jsx';
import Drawer from '../../components/ui/Drawer.jsx';
import Dropdown from '../../components/ui/Dropdown.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import Input from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import Select from '../../components/ui/Select.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import Spinner from '../../components/ui/Spinner.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import StatusBadge from '../../components/ui/StatusBadge.jsx';
import Textarea from '../../components/ui/Textarea.jsx';
import Toast from '../../components/ui/Toast.jsx';

const ORDER_STATUSES = [
  'placed',
  'confirmed',
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'return_requested',
  'returned',
];

const ROWS = [
  {
    id: 'SP-1042',
    product: 'Trail Runner',
    amount: '₹2,499',
    status: 'delivered',
  },
  {
    id: 'SP-1043',
    product: 'Forest Hoodie',
    amount: '₹1,899',
    status: 'shipped',
  },
  {
    id: 'SP-1044',
    product: 'Lime Bottle',
    amount: '₹649',
    status: 'cancelled',
  },
];

const COLUMNS = [
  { key: 'id', header: 'Order' },
  { key: 'product', header: 'Product' },
  { key: 'amount', header: 'Amount' },
  {
    key: 'status',
    header: 'Status',
    render: (row) => <StatusBadge status={row.status} />,
  },
];

export default function UiKitPage() {
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [menuNote, setMenuNote] = useState('No action yet');

  return (
    <main className="min-h-screen bg-canvas px-4 py-8 font-sans text-main sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.05em] text-muted-green">
              Dev
            </p>
            <h1 className="text-[1.75rem] font-bold text-main">Spark UI kit</h1>
            <p className="text-sm text-muted-green">
              Kitchen sink for tokens and base components. No API calls.
            </p>
          </div>
          <Link
            to="/"
            className="text-sm font-semibold text-forest-medium hover:text-lime-hover"
          >
            Back to home
          </Link>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Revenue" value="₹48,200" trend="12.4% this week" />
          <StatCard
            label="Returns"
            value="6"
            trend="2.1% this week"
            trendDirection="down"
          />
          <Card className="bg-forest-medium text-white">
            <p className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-white-soft px-3 py-1 text-xs font-bold text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-lime" />
              Lime accent
            </p>
            <p className="text-[1.15rem] font-bold text-white">
              Forest card for the hero language.
            </p>
          </Card>
        </section>

        <Card title="Buttons">
          <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="accent">
              <i className="bi bi-bag" />
              Accent
            </Button>
            <Button variant="dark-pill">Dark pill</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="lg" variant="accent">
              Large
            </Button>
            <Button disabled>Disabled</Button>
            <Button variant="outline" disabled>
              Disabled outline
            </Button>
          </div>
        </Card>

        <Card title="Forms">
          <div className="grid gap-4 md:grid-cols-2">
            <Input id="name" label="Name" placeholder="Ada Lovelace" />
            <Input
              id="email-invalid"
              label="Email"
              defaultValue="not-an-email"
              invalid
              message="Enter a valid email address."
            />
            <Input
              id="email-valid"
              label="Verified email"
              defaultValue="ada@spark.test"
              valid
              message="Looks good."
            />
            <Input
              id="locked"
              label="Disabled"
              defaultValue="Read only"
              disabled
            />
            <Select id="category" label="Category" defaultValue="audio">
              <option value="audio">Audio</option>
              <option value="home">Home</option>
            </Select>
            <Textarea
              id="note"
              label="Note"
              placeholder="Delivery instructions"
              invalid
              message="A note is required."
            />
          </div>
        </Card>

        <Card title="Badges">
          <div className="flex flex-wrap gap-2">
            <Badge tone="success">Success</Badge>
            <Badge tone="pending">Pending</Badge>
            <Badge tone="failed">Failed</Badge>
            {ORDER_STATUSES.map((status) => (
              <StatusBadge key={status} status={status} />
            ))}
          </div>
        </Card>

        <Card title="Table">
          <DataTable columns={COLUMNS} rows={ROWS} />
          <div className="mt-4">
            <DataTable
              columns={COLUMNS}
              rows={[]}
              emptyTitle="No orders"
              emptyDescription="Empty state used when a table has no rows."
            />
          </div>
        </Card>

        <Card title="Overlays, menu, and feedback">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => setModalOpen(true)}>Open modal</Button>
            <Button variant="outline" onClick={() => setDrawerOpen(true)}>
              Open drawer
            </Button>
            <Dropdown
              label="Actions"
              items={[
                {
                  label: 'Edit',
                  icon: 'bi bi-pencil',
                  onSelect: () => setMenuNote('Edit selected'),
                },
                {
                  label: 'Delete',
                  icon: 'bi bi-trash',
                  tone: 'danger',
                  onSelect: () => setMenuNote('Delete selected'),
                },
              ]}
            />
            <Button
              variant="accent"
              onClick={() =>
                setToast({
                  tone: 'success',
                  message: 'Saved to the kitchen sink.',
                })
              }
            >
              Show toast
            </Button>
            <Button
              variant="danger"
              onClick={() =>
                setToast({ tone: 'danger', message: 'Something went wrong.' })
              }
            >
              Error toast
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-green">{menuNote}</p>
          <div className="mt-6 flex flex-wrap items-center gap-6">
            <Spinner />
            <Pagination page={page} totalPages={4} onChange={setPage} />
          </div>
          <div className="mt-6 max-w-sm space-y-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
          <EmptyState
            title="Standalone empty state"
            description="Use this when a view has no records."
            action={<Button size="sm">Add item</Button>}
          />
        </Card>
      </div>

      {toast ? (
        <div className="fixed bottom-6 right-4 z-40 w-[min(100%-2rem,24rem)]">
          <Toast
            tone={toast.tone}
            message={toast.message}
            onClose={() => setToast(null)}
          />
        </div>
      ) : null}

      <Modal
        open={modalOpen}
        title="Confirm action"
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="accent"
              onClick={() => {
                setModalOpen(false);
                setToast({ tone: 'success', message: 'Confirmed.' });
              }}
            >
              Confirm
            </Button>
          </>
        }
      >
        <p>
          Modal uses the forest focus ring, canvas overlay, and large card
          radius.
        </p>
      </Modal>

      <Drawer
        open={drawerOpen}
        title="Drawer"
        onClose={() => setDrawerOpen(false)}
      >
        <p className="text-sm text-muted-green">
          Right-side panel, full width on a phone, forest header with a lime
          icon.
        </p>
      </Drawer>
    </main>
  );
}
