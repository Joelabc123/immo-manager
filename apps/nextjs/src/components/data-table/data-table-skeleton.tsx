import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

interface DataTableSkeletonProps {
  /** Number of columns */
  columnCount?: number;
  /** Number of skeleton rows */
  rowCount?: number;
  /** Show search input skeleton */
  hasSearch?: boolean;
  /** Number of filter skeletons */
  filterCount?: number;
}

export function DataTableSkeleton({
  columnCount = 6,
  rowCount = 10,
  hasSearch = true,
  filterCount = 0,
}: DataTableSkeletonProps) {
  return (
    <div className="space-y-4">
      {/* Toolbar skeleton */}
      {(hasSearch || filterCount > 0) && (
        <div className="flex flex-wrap items-center gap-3">
          {hasSearch && <Skeleton className="h-8 flex-1 min-w-[200px]" />}
          {Array.from({ length: filterCount }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-[180px]" />
          ))}
        </div>
      )}

      {/* Table skeleton */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {Array.from({ length: columnCount }).map((_, i) => (
                <TableHead key={i}>
                  <Skeleton className="h-4 w-20" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rowCount }).map((_, rowIdx) => (
              <TableRow key={rowIdx}>
                {Array.from({ length: columnCount }).map((_, colIdx) => (
                  <TableCell key={colIdx}>
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-[140px]" />
          <Skeleton className="h-8 w-[100px]" />
        </div>
      </div>
    </div>
  );
}
