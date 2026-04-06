import type React from "react";

export interface DataTableColumn<TData> {
  /** Unique column identifier, used as sort key */
  id: string;
  /** Column header text */
  header: string;
  /** Simple field access by key */
  accessorKey?: keyof TData;
  /** Custom cell renderer */
  accessorFn?: (row: TData) => React.ReactNode;
  /** Whether this column is sortable */
  sortable?: boolean;
  /** Additional CSS classes for the column cells */
  className?: string;
}

export interface DataTableFilter {
  /** Unique filter key, used in URL params as filter_{key} */
  key: string;
  /** Display label for the filter trigger */
  label: string;
  /** Text shown for the "all/clear" option */
  placeholder?: string;
  /** Available filter options */
  options: Array<{ value: string; label: string }>;
}

export interface DataTableBulkAction {
  /** Unique action identifier */
  id: string;
  /** Display label */
  label: string;
  /** Optional icon */
  icon?: React.ReactNode;
  /** Button variant */
  variant?: "default" | "destructive";
  /** Handler receiving selected row IDs */
  onClick: (selectedIds: string[]) => void;
}

export interface DataTableUrlParamKeys {
  page: string;
  pageSize: string;
  search: string;
  sort: string;
  order: string;
}

export const DEFAULT_PAGE_SIZE = 20;
export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export const DEFAULT_URL_PARAM_KEYS: DataTableUrlParamKeys = {
  page: "page",
  pageSize: "pageSize",
  search: "search",
  sort: "sort",
  order: "order",
};
