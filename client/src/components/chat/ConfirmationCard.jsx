import Button from '../ui/Button.jsx';

export default function ConfirmationCard({ summary, action, onConfirm, onCancel }) {
  return (
    <div className="mt-4 rounded-2xl border border-light bg-white p-3 shadow-spark-sm">
      <p className="text-sm font-semibold text-main">Confirm action</p>
      <p className="mt-2 text-sm text-muted-green">{summary || 'Please confirm this action.'}</p>
      <div className="mt-4 flex gap-2">
        <Button variant="accent" size="sm" onClick={onConfirm}>
          Confirm
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      {action ? <p className="mt-2 text-[10px] uppercase tracking-[0.08em] text-muted-green">{action}</p> : null}
    </div>
  );
}
