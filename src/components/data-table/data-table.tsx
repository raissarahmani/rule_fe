"use client";

import { useEffect, useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  RowSelectionState,
  SortingState,
  PaginationState,
  useReactTable,
  OnChangeFn,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  loading?: boolean;
  searchQuery?: string;
  onSelectionChange?: (selectedIds: string[]) => void;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  enableRowSelection?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  loading,
  searchQuery = "",
  onSelectionChange,
  rowSelection: externalRowSelection,
  onRowSelectionChange: externalOnRowSelectionChange,
  enableRowSelection = true,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [internalRowSelection, setInternalRowSelection] = useState<RowSelectionState>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const rowSelectionState = externalRowSelection ?? internalRowSelection;
  const handleRowSelectionChange = externalOnRowSelectionChange ?? setInternalRowSelection;

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection: rowSelectionState,
      pagination,
      globalFilter: searchQuery,
    },
    enableRowSelection,
    onSortingChange: setSorting,
    onRowSelectionChange: handleRowSelectionChange,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => {
      const record = row as { id?: string; _id?: string };
      return (record.id ?? record._id)!; // Extract row ID for selection callback
    },
  });

  // Notify parent of selected row IDs whenever selection state changes
  useEffect(() => {
    if (!onSelectionChange) return;

    const selectedRows = table.getSelectedRowModel().rows;
    const selectedIds = selectedRows.map((row) => (row.original as { id?: string }).id ?? row.id);
    onSelectionChange(selectedIds);
  }, [rowSelectionState, onSelectionChange, table]);

  // Active page rows
  const rows = table.getRowModel().rows;

  // Pagination metrics derived directly from state & row models
  const { pageIndex, pageSize } = table.getState().pagination;
  const currentPageRows = table.getPaginationRowModel().rows.length;
  const totalRows = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();

  return (
    <div className="rounded-md border bg-background">
      {/* --- TABLE SECTION --- */}
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: pagination.pageSize }).map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((_, colIndex) => (
                  <TableCell key={colIndex}>
                    <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length ? (
            rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center"
              >
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* --- PAGINATION SECTION --- */}
      <div className="flex flex-col gap-4 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Count text */}
        <div className="text-sm text-muted-foreground">
          Menampilkan <span className="font-medium">{currentPageRows}</span> dari{" "}
          <span className="font-medium">{totalRows}</span> data
        </div>

        <div className="flex items-center gap-6">
          {/* Dropdown Page Size */}
          <div className="flex items-center gap-2">
            <span className="text-sm">Tampilkan</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Current Page Text */}
          <div className="text-sm">
            Halaman{" "}
            <span className="font-medium">
              {pageCount === 0 ? 0 : pageIndex + 1}
            </span>{" "}
            dari <span className="font-medium">{pageCount}</span>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
