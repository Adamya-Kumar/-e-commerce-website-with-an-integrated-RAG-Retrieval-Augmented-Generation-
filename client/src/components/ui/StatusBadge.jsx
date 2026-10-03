import Badge from './Badge.jsx';

const STATUS_TONE = {
  placed: 'pending',
  confirmed: 'pending',
  packed: 'pending',
  shipped: 'pending',
  out_for_delivery: 'pending',
  delivered: 'success',
  cancelled: 'failed',
  returned: 'failed',
  return_requested: 'pending',
};

const STATUS_LABEL = {
  placed: 'Placed',
  confirmed: 'Confirmed',
  packed: 'Packed',
  shipped: 'Shipped',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
  return_requested: 'Return requested',
};

export default function StatusBadge({ status }) {
  return (
    <Badge tone={STATUS_TONE[status] || 'neutral'}>
      {STATUS_LABEL[status] || status}
    </Badge>
  );
}
