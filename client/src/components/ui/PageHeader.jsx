export default function PageHeader({ title, subtitle }) {
  return (
    <div className="mb-8">
      <h1 className="mb-1 text-[1.75rem] font-bold text-main">{title}</h1>
      {subtitle ? <p className="text-sm text-muted-green">{subtitle}</p> : null}
    </div>
  );
}
