"use client";

import React, { useCallback } from "react";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import {
  DEFAULT_PAGE_SIZE_OPTIONS,
  type DataTableColumn,
  type DataTableFilter,
  type DataTableBulkAction,
} from "./types";

/* -------------------------------------------------------------------------- */
/*  Sentinel value for the "show all / no filter" Select option               */
/* -------------------------------------------------------------------------- */
const ALL_VALUE = "__all__";

/* -------------------------------------------------------------------------- */
/*  Props                                                                     */
/* -------------------------------------------------------------------------- */
interface DataTableProps<TData> {
  /** Column definitions */
  columns: DataTableColumn<TData>[];
  /** Current page data */
  data: TData[];
  /** Total number of items across all pages */
  total: number;
  /** Current page number (1-based) */
  page: number;
  /** Current page size */
  pageSize: number;
  /** Total number of pages */
  totalPages: number;
  /** Initial load – no cached data yet */
  isLoading?: boolean;
  /** Background refetch – cached data still visible */
  isFetching?: boolean;

  /* Pagination */
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: readonly number[];

  /* Search */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  /* Sorting */
  sortColumn?: string;
  sortOrder?: "asc" | "desc";
  onSortChange?: (column: string, order: "asc" | "desc") => void;

  /* Filters (single-select) */
  filters?: DataTableFilter[];
  activeFilters?: Record<string, string | undefined>;
  onFilterChange?: (key: string, value: string | undefined) => void;

  /* Row selection */
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  getRowId: (row: TData) => string;

  /* Bulk actions (shown when rows are selected) */
  bulkActions?: DataTableBulkAction[];

  /* Per-row action renderer (rendered in a trailing cell) */
  renderRowActions?: (row: TData) => React.ReactNode;

  /* Row click handler */
  onRowClick?: (row: TData) => void;

  /* i18n labels */
  labels?: {
    search?: string;
    noResults?: string;
    rowsPerPage?: string;
    of?: string;
    page?: string;
    selected?: string;
    loading?: string;
    allFilter?: string;
  };

  /* Extra toolbar content rendered on the right side */
  toolbarActions?: React.ReactNode;

  /** Additional CSS class for the search input wrapper */
  searchClassName?: string;

  /** Additional CSS class for each filter Select trigger */
  filterClassName?: string;
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */
function renderCellContent<TData>(
  column: DataTableColumn<TData>,
  row: TData,
): React.ReactNode {
  if (column.accessorFn) return column.accessorFn(row);
  if (column.accessorKey) {
    const value = row[column.accessorKey];
    if (value === null || value === undefined) return "";
    return String(value);
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*  DataTable Component                                                       */
/* -------------------------------------------------------------------------- */
export function DataTable<TData>({
  columns,
  data,
  total,
  page,
  pageSize,
  totalPages,
  isLoading = false,
  isFetching = false,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  sortColumn,
  sortOrder = "asc",
  onSortChange,
  filters,
  activeFilters,
  onFilterChange,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  getRowId,
  bulkActions,
  renderRowActions,
  onRowClick,
  labels = {},
  toolbarActions,
  searchClassName,
  filterClassName,
}: DataTableProps<TData>) {
  const {
    noResults: noResultsLabel = "No results found.",
    rowsPerPage: rowsPerPageLabel = "Rows per page",
    of: ofLabel = "of",
    selected: selectedLabel = "selected",
    allFilter: allFilterLabel = "All",
  } = labels;

  /* ---- Column count for colSpan ---- */
  const totalCols =
    columns.length + (selectable ? 1 : 0) + (renderRowActions ? 1 : 0);

  /* ---- Selection helpers ---- */
  const allPageSelected =
    data.length > 0 && data.every((row) => selectedIds.includes(getRowId(row)));
  const someSelected = selectedIds.length > 0;

  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (!onSelectionChange) return;
      if (checked) {
        const pageIds = data.map((row) => getRowId(row));
        const merged = Array.from(new Set([...selectedIds, ...pageIds]));
        onSelectionChange(merged);
      } else {
        const pageIds = new Set(data.map((row) => getRowId(row)));
        onSelectionChange(selectedIds.filter((id) => !pageIds.has(id)));
      }
    },
    [data, getRowId, selectedIds, onSelectionChange],
  );

  const handleRowSelect = useCallback(
    (rowId: string, checked: boolean) => {
      if (!onSelectionChange) return;
      if (checked) {
        onSelectionChange([...selectedIds, rowId]);
      } else {
        onSelectionChange(selectedIds.filter((id) => id !== rowId));
      }
    },
    [selectedIds, onSelectionChange],
  );

  /* ---- Sort handler ---- */
  const handleSort = useCallback(
    (columnId: string) => {
      if (!onSortChange) return;
      if (sortColumn === columnId) {
        onSortChange(columnId, sortOrder === "asc" ? "desc" : "asc");
      } else {
        onSortChange(columnId, "asc");
      }
    },
    [sortColumn, sortOrder, onSortChange],
  );

  /* -------------------------------------------------------------------------- */
  /*  Render                                                                    */
  /* -------------------------------------------------------------------------- */
  return (
    <div className="space-y-4">
      {/* ---- Toolbar ---- */}
      {(onSearchChange ||
        (filters && filters.length > 0) ||
        toolbarActions) && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          {onSearchChange && (
            <div
              className={cn("relative flex-1 min-w-[200px]", searchClassName)}
            >
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder ?? labels.search ?? "Search..."}
                value={searchValue ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-9"
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* Single-select filters */}
          {filters?.map((filter) => {
            const activeValue = activeFilters?.[filter.key];
            const displayLabel = activeValue
              ? (filter.options.find((opt) => opt.value === activeValue)
                  ?.label ?? activeValue)
              : (filter.placeholder ?? allFilterLabel);

            return (
              <Select
                key={filter.key}
                value={activeValue ?? ALL_VALUE}
                onValueChange={(val) =>
                  onFilterChange?.(
                    filter.key,
                    val === null || val === ALL_VALUE ? undefined : val,
                  )
                }
              >
                <SelectTrigger
                  className={cn("w-[180px]", filterClassName)}
                  size="sm"
                >
                  <span className="truncate">{displayLabel}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>
                    {filter.placeholder ?? allFilterLabel}
                  </SelectItem>
                  {filter.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            );
          })}

          {/* Toolbar actions (right-aligned) */}
          {toolbarActions && (
            <div className="ml-auto flex items-center gap-2">
              {toolbarActions}
            </div>
          )}
        </div>
      )}

      {/* ---- Bulk actions bar ---- */}
      {selectable && someSelected && (
        <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium">
            {selectedIds.length} {selectedLabel}
          </span>
          {bulkActions?.map((action) => (
            <Button
              key={action.id}
              variant={
                action.variant === "destructive" ? "destructive" : "outline"
              }
              size="sm"
              onClick={() => action.onClick(selectedIds)}
            >
              {action.icon}
              {action.label}
            </Button>
          ))}
        </div>
      )}

      {/* ---- Table ---- */}
      <div className="relative rounded-md border">
        {/* Loading overlay for refetch */}
        {isFetching && !isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/50">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {/* Selection checkbox */}
              {selectable && (
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={allPageSelected}
                    indeterminate={someSelected && !allPageSelected}
                    onCheckedChange={(checked) => handleSelectAll(checked)}
                  />
                </TableHead>
              )}

              {/* Column headers */}
              {columns.map((column) => (
                <TableHead key={column.id} className={column.className}>
                  {column.sortable && onSortChange ? (
                    <button
                      type="button"
                      className="flex items-center gap-1.5 hover:text-foreground"
                      onClick={() => handleSort(column.id)}
                    >
                      {column.header}
                      {sortColumn === column.id ? (
                        sortOrder === "asc" ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : (
                          <ArrowDown className="h-4 w-4" />
                        )
                      ) : (
                        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}

              {/* Actions column header */}
              {renderRowActions && <TableHead className="w-[80px]" />}
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              /* Skeleton rows */
              Array.from({ length: Math.min(pageSize, 10) }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {selectable && (
                    <TableCell>
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell key={col.id}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                  {renderRowActions && (
                    <TableCell>
                      <Skeleton className="h-4 w-8" />
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              /* Empty state */
              <TableRow>
                <TableCell
                  colSpan={totalCols}
                  className="h-32 text-center text-muted-foreground"
                >
                  {noResultsLabel}
                </TableCell>
              </TableRow>
            ) : (
              /* Data rows */
              data.map((row) => {
                const rowId = getRowId(row);
                const isSelected = selectedIds.includes(rowId);

                return (
                  <TableRow
                    key={rowId}
                    className={cn(onRowClick && "cursor-pointer")}
                    data-state={isSelected ? "selected" : undefined}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            handleRowSelect(rowId, checked)
                          }
                        />
                      </TableCell>
                    )}

                    {columns.map((column) => (
                      <TableCell key={column.id} className={column.className}>
                        {renderCellContent(column, row)}
                      </TableCell>
                    ))}

                    {renderRowActions && (
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {renderRowActions(row)}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ---- Pagination ---- */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {total > 0
            ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} ${ofLabel} ${total}`
            : null}
        </div>

        <div className="flex items-center gap-4">
          {/* Page size selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {rowsPerPageLabel}
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) =>
                val && onPageSizeChange(parseInt(val, 10))
              }
            >
              <SelectTrigger className="w-[70px]" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Page navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-sm">
              {page} / {totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
