"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_URL_PARAM_KEYS,
  type DataTableUrlParamKeys,
} from "./types";

interface UseDataTableStateOptions {
  /** Sync state with URL search parameters */
  syncWithUrl?: boolean;
  /** Default page size */
  defaultPageSize?: number;
  /** Default sort column */
  defaultSortColumn?: string;
  /** Default sort order */
  defaultSortOrder?: "asc" | "desc";
  /** Custom URL parameter key names */
  urlParamKeys?: Partial<DataTableUrlParamKeys>;
}

export interface DataTableState {
  page: number;
  pageSize: number;
  search: string;
  /** Debounced search value (300ms). Use this for API queries. */
  debouncedSearch: string;
  sortColumn: string | undefined;
  sortOrder: "asc" | "desc";
  filters: Record<string, string | undefined>;
  selectedIds: string[];
}

export interface DataTableStateActions {
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSearch: (search: string) => void;
  setSort: (column: string, order: "asc" | "desc") => void;
  setFilter: (key: string, value: string | undefined) => void;
  setSelectedIds: (ids: string[]) => void;
  resetFilters: () => void;
}

const FILTER_PREFIX = "filter_";

export function useDataTableState(
  options: UseDataTableStateOptions = {},
): DataTableState & DataTableStateActions {
  const {
    syncWithUrl = false,
    defaultPageSize = DEFAULT_PAGE_SIZE,
    defaultSortColumn,
    defaultSortOrder = "asc",
    urlParamKeys: customKeys,
  } = options;

  const keys = { ...DEFAULT_URL_PARAM_KEYS, ...customKeys };
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const getInitialValue = useCallback(
    (key: string, defaultValue: string): string => {
      if (syncWithUrl) {
        return searchParams.get(key) ?? defaultValue;
      }
      return defaultValue;
    },
    [syncWithUrl, searchParams],
  );

  const [page, setPageInternal] = useState(
    parseInt(getInitialValue(keys.page, "1"), 10),
  );
  const [pageSize, setPageSizeInternal] = useState(
    parseInt(getInitialValue(keys.pageSize, String(defaultPageSize)), 10),
  );
  const [search, setSearchInternal] = useState(
    getInitialValue(keys.search, ""),
  );
  const [debouncedSearch, setDebouncedSearch] = useState(
    getInitialValue(keys.search, ""),
  );
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [sortColumn, setSortColumnInternal] = useState<string | undefined>(
    syncWithUrl
      ? (searchParams.get(keys.sort) ?? defaultSortColumn ?? undefined)
      : (defaultSortColumn ?? undefined),
  );
  const [sortOrder, setSortOrderInternal] = useState<"asc" | "desc">(
    (getInitialValue(keys.order, defaultSortOrder) as "asc" | "desc") || "asc",
  );
  const [filters, setFilters] = useState<Record<string, string | undefined>>(
    {},
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Initialize filters from URL on mount
  useEffect(() => {
    if (!syncWithUrl) return;
    const initialFilters: Record<string, string | undefined> = {};
    searchParams.forEach((value, key) => {
      if (key.startsWith(FILTER_PREFIX)) {
        initialFilters[key.slice(FILTER_PREFIX.length)] = value;
      }
    });
    if (Object.keys(initialFilters).length > 0) {
      setFilters(initialFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync state changes to URL
  const syncToUrl = useCallback(
    (updates: Record<string, string | undefined>) => {
      if (!syncWithUrl) return;

      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (
          value === undefined ||
          value === "" ||
          (value === "1" && key === keys.page)
        ) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }

      const queryString = params.toString();
      router.replace(`${pathname}${queryString ? `?${queryString}` : ""}`, {
        scroll: false,
      });
    },
    [syncWithUrl, searchParams, router, pathname, keys.page],
  );

  const setPage = useCallback(
    (newPage: number) => {
      setPageInternal(newPage);
      syncToUrl({ [keys.page]: String(newPage) });
    },
    [syncToUrl, keys.page],
  );

  const setPageSize = useCallback(
    (newSize: number) => {
      setPageSizeInternal(newSize);
      setPageInternal(1);
      syncToUrl({ [keys.pageSize]: String(newSize), [keys.page]: "1" });
    },
    [syncToUrl, keys.pageSize, keys.page],
  );

  const setSearch = useCallback(
    (value: string) => {
      setSearchInternal(value);
      setPageInternal(1);

      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => {
        setDebouncedSearch(value);
        syncToUrl({
          [keys.search]: value || undefined,
          [keys.page]: "1",
        });
      }, 300);
    },
    [syncToUrl, keys.search, keys.page],
  );

  const setSort = useCallback(
    (column: string, order: "asc" | "desc") => {
      setSortColumnInternal(column);
      setSortOrderInternal(order);
      syncToUrl({ [keys.sort]: column, [keys.order]: order });
    },
    [syncToUrl, keys.sort, keys.order],
  );

  const setFilter = useCallback(
    (key: string, value: string | undefined) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setPageInternal(1);
      syncToUrl({
        [`${FILTER_PREFIX}${key}`]: value,
        [keys.page]: "1",
      });
    },
    [syncToUrl, keys.page],
  );

  const resetFilters = useCallback(() => {
    setFilters({});
    setSearchInternal("");
    setDebouncedSearch("");
    setPageInternal(1);
    if (syncWithUrl) {
      router.replace(pathname, { scroll: false });
    }
  }, [syncWithUrl, router, pathname]);

  return {
    page,
    pageSize,
    search,
    debouncedSearch,
    sortColumn,
    sortOrder,
    filters,
    selectedIds,
    setPage,
    setPageSize,
    setSearch,
    setSort,
    setFilter,
    setSelectedIds,
    resetFilters,
  };
}
