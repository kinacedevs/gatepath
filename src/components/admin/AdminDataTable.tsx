import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

/**
 * Generalizes the sort/column-def table pattern already used ad hoc in
 * admin.plots.tsx (useReactTable + getCoreRowModel + getSortedRowModel +
 * flexRender, same markup) into one reusable component, so leads/agent-
 * ranking/installment-ledger tables share one implementation instead of
 * each hand-rolling useReactTable again.
 */
export function AdminDataTable<T>({
  columns,
  data,
  loading,
  emptyMessage = "No records found.",
  onRowClick,
}: {
  columns: ColumnDef<T, any>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead className="bg-surface-container-low border-b border-outline-variant/30">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler()}
                  className={`px-6 py-4 font-label-md text-on-surface-variant uppercase text-[11px] ${
                    header.column.getCanSort() ? "cursor-pointer select-none" : ""
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getCanSort() && <ArrowUpDown size={11} className="opacity-50" />}
                  </span>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-outline-variant/10">
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onRowClick?.(row.original)}
              className={`hover:bg-surface-container-low/50 transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-6 py-4 text-body-md text-on-surface">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {!loading && data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="text-center py-8 text-on-surface-variant">
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
