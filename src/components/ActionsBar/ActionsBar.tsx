import { NavLink } from 'react-router-dom'
import { useContext, useState } from 'react'
import AnalyticsIcon from '@material-design-icons/svg/filled/leaderboard.svg?react'
import AssetsIcon from '@material-design-icons/svg/filled/category.svg?react'
import HazardsIcon from '@material-design-icons/svg/filled/public.svg?react'
import InformationIcon from '@material-design-icons/svg/filled/info.svg?react'
import ActivityIcon from '@material-design-icons/svg/filled/access_time_filled.svg?react'
import ObservationsIcon from '@material-design-icons/svg/filled/view_timeline.svg?react'
import PortfolioIcon from '@material-design-icons/svg/filled/folder.svg?react'

import { TooltipForNav } from '../TooltipForNav/TooltipForNav'
import actionBarStyles from './ActionsBar.module.scss'
import SparkgeoLogo from '../../../public/sparkgeo-logo.svg?react'
import { UserMenu } from './UserMenu'
import { WorkflowActivityDrawer } from '../WorkflowActivityDrawer/WorkflowActivityDrawer'
import { AuthenticationContext } from '../../context/AuthenticationContext'

export const ActionsBar = () => {
  const [isUserMenuOpen, setUserIsMenuOpen] = useState(false)
  const [isWorkflowActivityOpen, setWorkflowActivityOpen] = useState(false)
  const { isAuthenticated } = useContext(AuthenticationContext)

  const handleToggleWorkflowActivity = () => {
    setWorkflowActivityOpen(!isWorkflowActivityOpen)
  }

  return (
    <>
      <div className={actionBarStyles.actionsWrapper}>
        <nav className={actionBarStyles.nav1}>
          <TooltipForNav content="About">
            <NavLink to="/" className={actionBarStyles.homeLink}>
              <SparkgeoLogo className={actionBarStyles.logo} />
            </NavLink>
          </TooltipForNav>

          <TooltipForNav content="Hazards">
            <NavLink to="/hazards">
              <HazardsIcon />
            </NavLink>
          </TooltipForNav>
          <TooltipForNav content="Observations">
            <NavLink to="/observations">
              <ObservationsIcon />
            </NavLink>
          </TooltipForNav>
          <TooltipForNav content="Assets">
            <NavLink to="/assets">
              <AssetsIcon />
            </NavLink>
          </TooltipForNav>
          <TooltipForNav content="Portfolios">
            <NavLink to="/portfolios">
              <PortfolioIcon />
            </NavLink>
          </TooltipForNav>
          <TooltipForNav content="Analytics">
            <NavLink to="/analytics">
              <AnalyticsIcon />
            </NavLink>
          </TooltipForNav>
        </nav>
        <nav className={actionBarStyles.nav2}>
          {isAuthenticated ? (
            <TooltipForNav content="Activity">
              <button onClick={handleToggleWorkflowActivity}>
                <ActivityIcon />
              </button>
            </TooltipForNav>
          ) : null}
          <TooltipForNav content="Information">
            <a
              href="https://sparkgeo.github.io/uk_eodatahub/"
              target="_blank"
              rel="noreferrer"
            >
              <InformationIcon />
            </a>
          </TooltipForNav>
          <UserMenu
            setIsUserMenuOpen={setUserIsMenuOpen}
            isUserMenuOpen={isUserMenuOpen}
          />
        </nav>
      </div>
      <WorkflowActivityDrawer
        closeDrawer={handleToggleWorkflowActivity}
        isDrawerOpen={isWorkflowActivityOpen}
      />
    </>
  )
}
