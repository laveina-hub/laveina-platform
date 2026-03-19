"use client";

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  type OnChangeFn,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

// ─── Column Header (sortable) ────────────────────────────────────────────────

type DataTableColumnHeaderProps<TData, TValue> = {
  column: import("@tanstack/react-table").Column<TData, TValue>;
  title: string;
  className?: string;
};

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <span className={className}>{title}</span>;
  }

  const sorted = column.getIsSorted();

  return (
    <button
      className={cn(
        "flex items-center gap-1.5 text-xs font-semibold tracking-wider text-gray-500 uppercase hover:text-gray-700",
        className
      )}
      onClick={() => column.toggleSorting(sorted === "asc")}
    >
      {title}
      {sorted === "asc" ? (
        <ArrowUp size={14} />
      ) : sorted === "desc" ? (
        <ArrowDown size={14} />
      ) : (
        <ArrowUpDown size={14} className="text-gray-300" />
      )}
    </button>
  );
}

// ─── Pagination ──────────────────────────────────────────────────────────────

type DataTablePaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export function DataTablePagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: DataTablePaginationProps) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
      <p className="text-sm text-gray-500">
        {total > 0 ? `${from}–${to} of ${total}` : "No results"}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="min-w-[3rem] text-center text-sm text-gray-600">
          {page} / {totalPages || 1}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function DataTableEmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4 text-gray-300">{icon}</div>}
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── Loading Skeleton ────────────────────────────────────────────────────────

function TableSkeleton({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={rowIdx} className="border-b border-gray-100">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <td key={colIdx} className="px-4 py-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

function MobileCardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2 p-4">
          <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" />
        </div>
      ))}
    </>
  );
}

// ─── Main DataTable ──────────────────────────────────────────────────────────

type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  isLoading?: boolean;
  enableRowSelection?: boolean;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  onRowClick?: (row: TData) => void;
  emptyState?: EmptyStateProps;
  // Server-side pagination
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
};

export function DataTable<TData>({
  columns,
  data,
  isLoading,
  enableRowSelection = false,
  rowSelection,
  onRowSelectionChange,
  onRowClick,
  emptyState,
  pagination,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      ...(enableRowSelection && rowSelection !== undefined ? { rowSelection } : {}),
    },
    onSortingChange: setSorting,
    ...(enableRowSelection && onRowSelectionChange
      ? { onRowSelectionChange, enableRowSelection: true }
      : {}),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const isEmpty = !isLoading && data.length === 0;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* ─── Desktop table (hidden on mobile) ─── */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-gray-200 bg-gray-50/50">
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-xs font-semibold tracking-wider whitespace-nowrap text-gray-500 uppercase"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          {isLoading ? (
            <TableSkeleton columns={columns.length} />
          ) : isEmpty ? (
            <tbody>
              <tr>
                <td colSpan={columns.length}>
                  {emptyState ? (
                    <DataTableEmptyState {...emptyState} />
                  ) : (
                    <DataTableEmptyState title="No data found" />
                  )}
                </td>
              </tr>
            </tbody>
          ) : (
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-gray-100 transition-colors last:border-0",
                    onRowClick && "cursor-pointer hover:bg-gray-50",
                    row.getIsSelected() && "bg-primary-50/50"
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 whitespace-nowrap text-gray-700">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>

      {/* ─── Mobile card view (hidden on desktop) ─── */}
      <div className="divide-y divide-gray-100 md:hidden">
        {isLoading ? (
          <MobileCardSkeleton />
        ) : isEmpty ? (
          emptyState ? (
            <DataTableEmptyState {...emptyState} />
          ) : (
            <DataTableEmptyState title="No data found" />
          )
        ) : (
          table.getRowModel().rows.map((row) => (
            <div
              key={row.id}
              className={cn(
                "space-y-1.5 p-4",
                onRowClick && "cursor-pointer active:bg-gray-50",
                row.getIsSelected() && "bg-primary-50/50"
              )}
              onClick={() => onRowClick?.(row.original)}
            >
              {row.getVisibleCells().map((cell) => {
                const header = cell.column.columnDef.header;
                const headerLabel = typeof header === "string" ? header : null;

                return (
                  <div key={cell.id} className="flex items-center justify-between gap-2 text-sm">
                    {headerLabel && (
                      <span className="shrink-0 text-xs text-gray-500">{headerLabel}</span>
                    )}
                    <span className="text-right text-gray-700">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </span>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {pagination && !isEmpty && (
        <DataTablePagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          pageSize={pagination.pageSize}
          onPageChange={pagination.onPageChange}
        />
      )}
    </div>
  );
}
