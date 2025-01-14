import { Header } from '@tanstack/react-table'
import { TriangleDownIcon, TriangleUpIcon } from '@radix-ui/react-icons'
import { UserAssetForTable } from '../userAssets/convertUserAssets'
import { UploadedFileInfo } from '../api/getUploadedFileList'

import tableStyles from '../genericStyles/table.module.scss'

export const getTableHeaderSortIcon = (
  header:
    | Header<UserAssetForTable, unknown>
    | Header<UploadedFileInfo, unknown>,
) => {
  return (
    <span className={tableStyles.sortIconWrapper}>
      {header.column.getIsSorted() === 'asc' && <TriangleUpIcon />}
      {header.column.getIsSorted() === 'desc' && <TriangleDownIcon />}
      {header.column.getIsSorted() === false && header.column.getCanSort() && (
        <TriangleDownIcon className={tableStyles.hiddenSortIcon} />
      )}
    </span>
  )
}
