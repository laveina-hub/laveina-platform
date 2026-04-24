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
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { ChevronIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

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
        "text-text-muted hover:text-text-primary flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase",
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
        <ArrowUpDown size={14} className="text-border-default" />
      )}
    </button>
  );
}

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
  const tCommon = useTranslations("common");
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div
      className="border-border-default flex items-center justify-between border-t px-4 py-3"
      aria-live="polite"
    >
      <p className="text-text-muted text-sm">
        {total > 0 ? tCommon("paginationRange", { from, to, total }) : tCommon("noResults")}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="text-text-muted hover:bg-bg-muted hover:text-text-primary rounded-md p-1.5 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronIcon size={16} />
        </button>
        <span className="text-text-light min-w-12 text-center text-sm">
          {page} / {totalPages || 1}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="text-text-muted hover:bg-bg-muted hover:text-text-primary rounded-md p-1.5 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <ChevronIcon direction="right" size={16} />
        </button>
      </div>
    </div>
  );
}

type EmptyStateProps = {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

function DefaultEmptyIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect
        x="8"
        y="16"
        width="32"
        height="24"
        rx="3"
        className="stroke-border-default"
        strokeWidth="2"
        fill="none"
      />
      <path d="M8 22h32" className="stroke-border-default" strokeWidth="2" />
      <path d="M20 30h8" className="stroke-border-default" strokeWidth="2" strokeLinecap="round" />
      <path
        d="M16 10l8 6 8-6"
        className="stroke-border-default"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function DataTableEmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4">{icon ?? <DefaultEmptyIcon />}</div>
      <h3 className="text-text-primary text-base font-semibold">{title}</h3>
      {description && <p className="text-text-muted mt-1.5 max-w-xs text-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function TableSkeleton({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={rowIdx} className="border-border-muted border-b">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <td key={colIdx} className="px-4 py-3">
              <div className="skeleton-shimmer h-4 w-3/4 rounded" />
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
          <div className="skeleton-shimmer h-4 w-2/3 rounded" />
          <div className="skeleton-shimmer h-3 w-1/2 rounded" />
          <div className="skeleton-shimmer h-3 w-1/3 rounded" />
        </div>
      ))}
    </>
  );
}

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
  const tCommon = useTranslations("common");
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
    <div className="border-border-default shadow-card overflow-hidden rounded-xl border bg-white">
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-border-default bg-bg-secondary/60 border-b"
              >
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="text-text-muted px-4 py-3 text-xs font-semibold tracking-wider whitespace-nowrap uppercase"
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
                    <DataTableEmptyState title={tCommon("noDataFound")} />
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
                    "border-border-muted border-b transition-colors last:border-0",
                    onRowClick && "hover:bg-bg-muted/50 cursor-pointer",
                    row.getIsSelected() && "bg-primary-50/50"
                  )}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? "button" : undefined}
                  onClick={() => onRowClick?.(row.original)}
                  onKeyDown={(e) => {
                    if (onRowClick && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      onRowClick(row.original);
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="text-text-secondary px-4 py-3 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>

      <div className="divide-border-muted divide-y md:hidden">
        {isLoading ? (
          <MobileCardSkeleton />
        ) : isEmpty ? (
          emptyState ? (
            <DataTableEmptyState {...emptyState} />
          ) : (
            <DataTableEmptyState title={tCommon("noDataFound")} />
          )
        ) : (
          table.getRowModel().rows.map((row) => (
            <div
              key={row.id}
              className={cn(
                "space-y-1.5 p-4",
                onRowClick && "active:bg-bg-muted/50 cursor-pointer",
                row.getIsSelected() && "bg-primary-50/50"
              )}
              tabIndex={onRowClick ? 0 : undefined}
              role={onRowClick ? "button" : undefined}
              onClick={() => onRowClick?.(row.original)}
              onKeyDown={(e) => {
                if (onRowClick && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  onRowClick(row.original);
                }
              }}
            >
              {row.getVisibleCells().map((cell) => {
                const header = cell.column.columnDef.header;
                const headerLabel = typeof header === "string" ? header : null;

                return (
                  <div key={cell.id} className="flex items-center justify-between gap-2 text-sm">
                    {headerLabel && (
                      <span className="text-text-muted shrink-0 text-xs">{headerLabel}</span>
                    )}
                    <span className="text-text-secondary text-right">
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
