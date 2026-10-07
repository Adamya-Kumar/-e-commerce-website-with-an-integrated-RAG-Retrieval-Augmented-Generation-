export default function ChatFab({ open, onToggle }) {
  return (
    <div className="fixed bottom-5 right-5 z-40">
      <button
        type="button"
        aria-label={open ? 'Close shopping assistant' : 'Open shopping assistant'}
        aria-expanded={open}
        onClick={onToggle}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-lime text-[1.75rem] text-forest-medium shadow-spark-lg transition hover:-translate-y-0.5 hover:bg-lime-hover focus-visible:outline-none"
      >
        <i className={open ? 'bi bi-x-lg' : 'bi bi-chat-dots'} />
      </button>
    </div>
  );
}
