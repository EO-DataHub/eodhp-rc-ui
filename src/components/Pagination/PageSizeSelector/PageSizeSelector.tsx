import { useState, useEffect } from 'react'

export const PageSizeSelector = ({
  pageSize,

  pageSizeOptions,
  onChange,
  unfilteredRowLength,
  methodFilteredRowLength = null,
  searchFilteredRowLength = null,
  isMethodFilterEnabled = false,
  isSearchFilterEnabled = false,
}: {
  pageSize: number
  pageSizeOptions: number[]
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void
  unfilteredRowLength: number
  methodFilteredRowLength?: number | null
  searchFilteredRowLength?: number | null
  isMethodFilterEnabled?: boolean
  isSearchFilterEnabled?: boolean
}) => {
  const [pageOptionsToDisplay, setPageOptionsToDisplay] = useState<number[]>([])
  const [filteredAmountToDisplay, setFilteredAmountToDisplay] = useState<number | null>(null)

  useEffect(
    function findFilteredAmountToDisplay() {
      // the search results will be method filtered already, which is not the case the opposite way around
      if (isSearchFilterEnabled && isMethodFilterEnabled) {
        return setFilteredAmountToDisplay(searchFilteredRowLength)
      }
      if (!isSearchFilterEnabled && isMethodFilterEnabled) {
        return setFilteredAmountToDisplay(methodFilteredRowLength)
      }
      if (isSearchFilterEnabled && !isMethodFilterEnabled) {
        return setFilteredAmountToDisplay(searchFilteredRowLength)
      }

      return setFilteredAmountToDisplay(unfilteredRowLength)
    },
    [
      isMethodFilterEnabled,
      isSearchFilterEnabled,
      methodFilteredRowLength,
      searchFilteredRowLength,
      unfilteredRowLength,
    ],
  )

  useEffect(
    function findPageOptionsToDisplay() {
      if (filteredAmountToDisplay === null) return
      let pageOptionsLessThanRowLength = pageSizeOptions.filter(
        (option) => option < filteredAmountToDisplay,
      )

      if (pageOptionsLessThanRowLength.length === 0) {
        // show the exact number of items as the only selection in the drop down
        pageOptionsLessThanRowLength = [filteredAmountToDisplay]
      } else if (
        pageOptionsLessThanRowLength[pageOptionsLessThanRowLength.length - 1] <
        filteredAmountToDisplay
      ) {
        // show the exact number of items as the last selection in the drop down
        pageOptionsLessThanRowLength.push(filteredAmountToDisplay)
      }

      setPageOptionsToDisplay(pageOptionsLessThanRowLength)
    },
    [pageSizeOptions, filteredAmountToDisplay],
  )

  return (
    <label htmlFor="page-size-selector">
      Showing{' '}
      <select
        value={pageSize}
        onChange={onChange}
        id="page-size-selector"
        data-testid="page-size-selector"
      >
        {pageOptionsToDisplay.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
      of {filteredAmountToDisplay}
      {isSearchFilterEnabled || isMethodFilterEnabled
        ? `${' '}(filtered from ${unfilteredRowLength} item${unfilteredRowLength > 1 ? 's' : ''})`
        : null}
    </label>
  )
}
