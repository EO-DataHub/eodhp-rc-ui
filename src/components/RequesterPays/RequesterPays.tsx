import React, { useContext } from 'react'
import { useHref } from 'react-router-dom'
import { InfoCircledIcon } from '@radix-ui/react-icons'
import { Callout, IconButton, Link, Tooltip } from '@radix-ui/themes'
import { AuthenticationContext } from '@/context/AuthenticationContext'
import PiggyBankIcon from '@material-design-icons/svg/filled/savings.svg?react'

// Requester-pays downloads are billed from the data host's usage reports, which arrive in
// batches, so a download can take this long to reach the workspace's usage.
export const REQUESTER_PAYS_DELAY_HOURS = 7

export const REQUESTER_PAYS_SUMMARY = 'Downloading this data uses credits, charged per GB.'

interface RequesterPaysBadgeProps {
  /** The card's own badge class, so the badge matches the card's other symbols. */
  className: string
  /** `button` for the side panel cards, whose symbols are round icon buttons. */
  variant?: 'badge' | 'button'
}

/** Marks a collection whose downloads cost credits, with a piggy bank symbol. */
export const RequesterPaysBadge: React.FC<RequesterPaysBadgeProps> = ({
  className,
  variant = 'badge',
}) => (
  <Tooltip content={REQUESTER_PAYS_SUMMARY}>
    {variant === 'button' ? (
      <IconButton
        radius="full"
        variant="solid"
        className={className}
        aria-label={REQUESTER_PAYS_SUMMARY}
      >
        <PiggyBankIcon width="13" height="13" fill="currentColor" />
      </IconButton>
    ) : (
      <div className={className}>
        <PiggyBankIcon
          width="14"
          height="14"
          fill="currentColor"
          role="img"
          aria-label={REQUESTER_PAYS_SUMMARY}
        />
      </div>
    )}
  </Tooltip>
)

/**
 * Tells the user, where they can download a requester-pays collection, that downloads cost
 * credits and when the charge shows up. It names no rate: the rate depends on the workspace's
 * pricing category, which the UI cannot look up yet. `brief` keeps only the first sentence, for
 * places where the user is choosing a collection rather than downloading from it.
 *
 * Signed out, it asks the user to sign in instead, and signed in with no workspace selected, to
 * select one: the data proxy refuses a requester-pays download unless it knows which workspace
 * to charge.
 */
export const RequesterPaysNotice: React.FC<{ brief?: boolean }> = ({ brief = false }) => {
  const { isAuthenticated, login, currentWorkspace } = useContext(AuthenticationContext)
  const needsWorkspace = isAuthenticated && !currentWorkspace
  // Opens in a new tab, so the user keeps their place in the finder (open item, filters, map)
  const creditsHref = useHref('/accounting/credits')

  return (
    <Callout.Root color="amber" size="1">
      <Callout.Icon>
        <InfoCircledIcon />
      </Callout.Icon>
      <Callout.Text>
        {(brief || (isAuthenticated && !needsWorkspace)) && REQUESTER_PAYS_SUMMARY}
        {!brief && isAuthenticated && !needsWorkspace && (
          <>
            {' '}
            Thumbnails and previews are free. Charges can take up to {
              REQUESTER_PAYS_DELAY_HOURS
            }{' '}
            hours to appear in your workspace usage.{' '}
            <Link href={creditsHref} target="_blank" rel="noopener noreferrer">
              See your credit rates
            </Link>
          </>
        )}
        {!brief && !isAuthenticated && (
          <>
            <Link asChild weight="bold">
              <button type="button" onClick={() => void login()}>
                Sign in
              </button>
            </Link>{' '}
            to download this data. Downloads are charged to your workspace in credits, per GB, so we
            need to know which workspace to charge. Thumbnails and previews are free.
          </>
        )}
        {!brief && needsWorkspace && (
          <>
            Select a workspace in the header to download this data. Downloads are charged to that
            workspace in credits, per GB. Thumbnails and previews are free.
          </>
        )}
      </Callout.Text>
    </Callout.Root>
  )
}
