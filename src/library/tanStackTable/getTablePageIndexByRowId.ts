import { Table as TanstackTable } from '@tanstack/table-core'

export const getTablePageIndexByRowId = ({
  id,
  table,
}: {
  id: string | number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: TanstackTable<any>
}) => {
  const filteredRows = table.getFilteredRowModel().rows
  const rowIndex = filteredRows.findIndex((row) => row.id === id)
  const row = filteredRows[rowIndex]

  if (!row) return

  const pageIndex = Math.floor(rowIndex / table.getState().pagination.pageSize)

  return pageIndex
}
