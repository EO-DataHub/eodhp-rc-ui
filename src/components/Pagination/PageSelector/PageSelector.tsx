import { Flex, Button, ButtonProps } from '@radix-ui/themes'
import { useEffect, useState, ReactNode, ReactElement } from 'react'
import BackIcon from '@material-design-icons/svg/filled/chevron_left.svg?react'
import NextIcon from '@material-design-icons/svg/filled/chevron_right.svg?react'

import pageSelectorStyles from './PageSelector.module.scss'

const SelectorButton = ({ className, ...restOfProps }: ButtonProps) => {
  return (
    <Button
      variant="soft"
      size="1"
      {...restOfProps}
      className={`${pageSelectorStyles.selectorButton} ${className}`}
    />
  )
}

const PageButton = ({
  pageIndex,
  currentPageIndex,
  onGoToPage,
}: {
  currentPageIndex: number
  onGoToPage: (pageIndex: number) => void
  pageIndex: number
}) => {
  const pageLabel = pageIndex + 1
  const isCurrentPage = currentPageIndex === pageIndex

  return (
    <SelectorButton
      className={isCurrentPage ? pageSelectorStyles.currentPage : undefined}
      aria-current={isCurrentPage}
      onClick={() => {
        onGoToPage(pageIndex)
      }}
      key={`pagination-button-${pageIndex}`}
    >
      {pageLabel}
    </SelectorButton>
  )
}

/**
 * Pagination control - for user to select which page is shown
 */

export const PageSelector = ({
  currentPageIndex,
  nextDisabled,
  onGoToPage,
  onNextClick,
  onPreviousClick,
  pageCount,
  previousDisabled,
}: {
  currentPageIndex: number
  nextDisabled: boolean
  onGoToPage: (pageIndex: number) => void
  onNextClick: () => void
  onPreviousClick: () => void
  pageCount: number
  previousDisabled: boolean
}) => {
  const [pageButtons, setPageButtons] = useState<ReactElement[]>([])

  useEffect(() => {
    const pageButtonPropsThatChangeLess = { currentPageIndex, onGoToPage }

    const getNotTooManyButtons = () => {
      const buttons = []

      for (let page = 1; page <= pageCount; page += 1) {
        buttons.push(
          <PageButton
            {...pageButtonPropsThatChangeLess}
            pageIndex={page - 1}
            key={`pagination-button-${page}`}
          />,
        )
      }

      return buttons
    }
    const getTooManyButtons = () => {
      const middleButtons: ReactNode[] = []

      const lastPage = pageCount
      const currentlySelectedPage = currentPageIndex + 1

      const populateMiddleButtons = () => {
        if (currentlySelectedPage === 3) {
          middleButtons.push(<PageButton {...pageButtonPropsThatChangeLess} pageIndex={1} />)
        }
        if (currentlySelectedPage > 3) {
          middleButtons.push(
            <PageButton {...pageButtonPropsThatChangeLess} pageIndex={currentPageIndex - 2} />,
            <PageButton {...pageButtonPropsThatChangeLess} pageIndex={currentPageIndex - 1} />,
          )
        }
        if (currentlySelectedPage !== 1 && currentlySelectedPage !== lastPage) {
          middleButtons.push(
            <PageButton {...pageButtonPropsThatChangeLess} pageIndex={currentPageIndex} />,
          )
        }
        if (currentlySelectedPage < lastPage - 1) {
          middleButtons.push(
            <PageButton {...pageButtonPropsThatChangeLess} pageIndex={currentPageIndex + 1} />,
          )
        }
        if (currentlySelectedPage < lastPage - 2) {
          middleButtons.push(
            <PageButton {...pageButtonPropsThatChangeLess} pageIndex={currentPageIndex + 2} />,
          )
        }
      }

      const manageMiddleButtonEllipses = () => {
        if (currentlySelectedPage > 4) {
          middleButtons.unshift(<span>...</span>)
        }
        if (currentlySelectedPage < lastPage - 3) {
          middleButtons.push(<span>...</span>)
        }
      }

      populateMiddleButtons()
      manageMiddleButtonEllipses()

      return [
        <PageButton {...pageButtonPropsThatChangeLess} pageIndex={0} key="first" />,
        ...middleButtons.map(
          (button, index) =>
            ({
              ...(button as object),
              key: `middle-button-${index}`,
            }) as ReactElement,
        ),
        <PageButton {...pageButtonPropsThatChangeLess} pageIndex={lastPage - 1} key="last" />,
      ]
    }

    if (pageCount > 8) {
      setPageButtons(getTooManyButtons())
    } else {
      setPageButtons(getNotTooManyButtons())
    }
  }, [pageCount, currentPageIndex, onGoToPage])

  return (
    <Flex align="center" gap="2" data-testid="page-control">
      <SelectorButton onClick={onPreviousClick} disabled={previousDisabled}>
        <BackIcon /> Back
      </SelectorButton>
      {pageButtons}
      <SelectorButton onClick={onNextClick} disabled={nextDisabled}>
        Next <NextIcon />
      </SelectorButton>
    </Flex>
  )
}
