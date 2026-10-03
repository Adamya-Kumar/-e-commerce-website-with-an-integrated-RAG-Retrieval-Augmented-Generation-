export default function EmptyState({
  icon = 'bi bi-inbox',
  title = 'Nothing here yet',
  description,
  action,
}) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <i className={cnIcon(icon)} />
      <h3 className="mt-3 text-base font-bold text-main">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-green">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function cnIcon(icon) {
  return `${icon} text-[3.5rem] text-lime opacity-25`;
}
