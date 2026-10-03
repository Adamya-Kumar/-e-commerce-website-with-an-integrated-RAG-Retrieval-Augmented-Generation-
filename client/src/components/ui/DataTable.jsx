import EmptyState from './EmptyState.jsx';

export default function DataTable({
  columns,
  rows,
  emptyTitle,
  emptyDescription,
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-subtle bg-card shadow-spark-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="whitespace-nowrap border-b border-table bg-surface-muted px-5 py-4 text-xs font-bold uppercase tracking-[0.05em] text-muted-green"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-6">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                  />
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="transition-colors duration-200 ease-in-out hover:bg-table-hover last:[&>td]:border-b-0"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="whitespace-nowrap border-b border-subtle px-5 py-4 text-sm text-main"
                    >
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
