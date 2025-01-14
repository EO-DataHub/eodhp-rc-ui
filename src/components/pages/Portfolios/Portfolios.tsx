import AddIcon from '@material-design-icons/svg/filled/add.svg?react'
import { Button, Spinner, Table, Text, TextField } from '@radix-ui/themes'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { toast } from 'react-toastify'
import { useContext, useMemo, useState } from 'react'
import { MagnifyingGlassIcon as SearchIcon } from '@radix-ui/react-icons'

import { UploadedFileInfo } from '../../../library/api/getUploadedFileList'
import { AuthenticationContext } from '../../../context/AuthenticationContext'
import { getTableHeaderSortIcon } from '../../../library/tanStackTable/getTableHeaderSortIcon'
import { PageLayout } from '../../Layout/PageLayout'
import { PageSelector } from '../../Pagination/PageSelector/PageSelector'
import { PageTitle } from '../../PageTitle'
import { UploadButtonAndDialog } from '../../UploadButtonAndDialog/UploadButtonAndDialog'
import { uploadUserAssets } from '../../../library/api/uploadUserAssets'
import { UserAssets } from '../../../library/userAssets/userAssetTypes'
import containerStyles from '../../../library/genericStyles/containers.module.scss'
import portfolioStyles from './Portfolios.module.scss'
import tableStyles from '../../../library/genericStyles/table.module.scss'
import { useDebouncedCallback } from 'use-debounce'
import { LoadingIndicator } from '../../LoadingIndicator/LoadingIndicator'
import { PortfoliosContext } from '../../../context/PortfoliosContext'

export const Portfolios = () => {
  const [globalFilter, setGlobalFilter] = useState('')
  const [isFileUploading, setIsFileUploading] = useState(false)
  const [tableSearchValue, setTableSearchValue] = useState('')
  const {
    authenticatedAxios,
    workspaceUserName,
    isAuthenticated,
    isAuthenticating,
  } = useContext(AuthenticationContext)
  const { fileInfo, isFileInfoLoading, updateUploadedFilesList } =
    useContext(PortfoliosContext)
  const isTableShowing = !!fileInfo.length
  const debouncedSetGlobalFilter = useDebouncedCallback((value) => {
    setGlobalFilter(value)
  }, 500)

  const handleLoadAssets = ({
    fileName,
    assets,
  }: {
    fileName: string
    assets: UserAssets
  }) => {
    if (!authenticatedAxios || !workspaceUserName) {
      toast.error('Please log in to upload a file.')
      return
    }
    setIsFileUploading(true)
    uploadUserAssets({
      authenticatedAxios,
      assets,
      fileName,
      workspaceUserName,
    })
      .then(() => {
        updateUploadedFilesList()
        toast.success('File uploaded to data hub successfully', {
          autoClose: 5000,
        })
      })
      .catch(() => {
        toast.error('Error uploading file to data hub')
      })
      .finally(() => {
        setIsFileUploading(false)
      })
  }

  const tableColumns = useMemo(() => {
    const columnHelper = createColumnHelper<UploadedFileInfo>()

    return [
      columnHelper.accessor('name', { header: 'Name' }),
      columnHelper.accessor('dateAdded', {
        header: 'Date Added',
        cell: (row) => row.getValue().toLocaleDateString('en-GB'),
      }),
    ]
  }, [])

  const reactTable = useReactTable({
    columns: tableColumns,
    data: fileInfo,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
      sorting: [
        {
          id: 'name',
          desc: false,
        },
      ],
    },
    state: {
      globalFilter,
    },
  })

  const table = isTableShowing ? (
    <>
      <Table.Root variant="surface" className={tableStyles.table}>
        <Table.Header>
          {reactTable.getHeaderGroups().map((headerGroup) => (
            <Table.Row key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <Table.ColumnHeaderCell
                  key={header.id}
                  colSpan={header.colSpan}
                  // @ts-expect-error - meta allows for any property
                  justify={header.column.columnDef.meta?.justify}
                >
                  {header.isPlaceholder ? null : (
                    <div
                      className={`${
                        header.column.getCanSort()
                          ? tableStyles.tableHeaderWithClickableCursorOnHover
                          : undefined
                      } ${tableStyles.tableHeader}`}
                      onClick={header.column.getToggleSortingHandler()}
                      title={
                        header.column.getCanSort()
                          ? header.column.getNextSortingOrder() === 'asc'
                            ? 'Sort ascending'
                            : header.column.getNextSortingOrder() === 'desc'
                              ? 'Sort descending'
                              : 'Clear sort'
                          : undefined
                      }
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      {getTableHeaderSortIcon(header)}
                    </div>
                  )}
                </Table.ColumnHeaderCell>
              ))}
            </Table.Row>
          ))}
        </Table.Header>
        <Table.Body>
          {reactTable.getRowModel().rows.map((row) => {
            return (
              <Table.Row key={`${String(row.id)}`}>
                {row.getVisibleCells().map((cell) => (
                  <Table.Cell
                    key={cell.id}
                    // @ts-expect-error - meta allows for any property
                    justify={cell.column.columnDef.meta?.justify}
                    className={tableStyles.tableCell}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Table.Cell>
                ))}
              </Table.Row>
            )
          })}
        </Table.Body>
      </Table.Root>
      <div className={containerStyles.flexRowStartCenter}>
        <PageSelector
          currentPageIndex={reactTable.getState().pagination.pageIndex}
          nextDisabled={!reactTable.getCanNextPage()}
          onGoToPage={reactTable.setPageIndex}
          onNextClick={reactTable.nextPage}
          onPreviousClick={reactTable.previousPage}
          pageCount={reactTable.getPageCount()}
          previousDisabled={!reactTable.getCanPreviousPage()}
        />
      </div>
    </>
  ) : (
    <div className={containerStyles.flexRowCenterCenterFullDimensions}>
      There are no portfolios to display.
    </div>
  )
  const logInMessage = isAuthenticating ? (
    <LoadingIndicator />
  ) : (
    'Please log in to view portfolios.'
  )
  const authenticatedPageContent = isAuthenticated ? (
    <>
      <div className={portfolioStyles.aboveTableRow}>
        <Text asChild size="3">
          <h2>Saved Portfolios</h2>
        </Text>
        <div className={portfolioStyles.aboveTableRowRightHandButtons}>
          {isTableShowing ? (
            <TextField.Root
              placeholder="Search"
              value={tableSearchValue ?? ''}
              onChange={(event) => {
                const { value } = event.target
                setTableSearchValue(value)
                debouncedSetGlobalFilter(value)
              }}
            >
              <TextField.Slot>
                <SearchIcon />
              </TextField.Slot>
            </TextField.Root>
          ) : null}
          <UploadButtonAndDialog
            onLoadAssets={handleLoadAssets}
            trigger={
              <Button className={portfolioStyles.addPortfolioButton}>
                {isFileUploading ? <Spinner /> : <AddIcon />} New Portfolio
              </Button>
            }
            description="Upload a new portfolio of assets"
          />
        </div>
      </div>
      {isFileInfoLoading ? (
        <div className={containerStyles.flexRowCenterCenterFullDimensions}>
          <LoadingIndicator />
        </div>
      ) : (
        table
      )}
    </>
  ) : (
    logInMessage
  )

  return (
    <PageLayout>
      <PageTitle>Portfolios</PageTitle>
      {authenticatedPageContent}
    </PageLayout>
  )
}
