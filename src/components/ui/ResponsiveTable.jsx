import useMediaQuery from '../../hooks/useMediaQuery';

export default function ResponsiveTable({ columns, data, onRowClick }) {
  const isDesktop = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-sm font-medium text-gray-600"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-gray-100 ${onRowClick ? 'cursor-pointer hover:bg-gray-50 min-h-[44px]' : ''}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm text-gray-900">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Mobile card view
  return (
    <div className="space-y-3">
      {data.map((row, rowIndex) => (
        <div
          key={rowIndex}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
          className={`bg-white rounded-lg border border-gray-200 p-4 ${onRowClick ? 'cursor-pointer active:bg-gray-50 min-h-[44px] min-w-[44px]' : ''}`}
        >
          {columns.map((col) => (
            <div key={col.key} className="flex justify-between py-1.5">
              <span className="text-xs font-medium text-gray-500">{col.label}</span>
              <span className="text-sm text-gray-900 text-right">
                {col.render ? col.render(row[col.key], row) : row[col.key]}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
