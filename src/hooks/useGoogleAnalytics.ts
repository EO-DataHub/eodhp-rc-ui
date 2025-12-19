import { useEffect } from 'react'
import ReactGA from 'react-ga4'
import type { Router } from '@remix-run/router'

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID

export const useGoogleAnalytics = (router: Router) => {
  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return

    ReactGA.initialize(GA_MEASUREMENT_ID)
    ReactGA.send({
      hitType: 'pageview',
      page: window.location.pathname + window.location.search,
    })

    const unsubscribe = router.subscribe((state) => {
      ReactGA.send({
        hitType: 'pageview',
        page: state.location.pathname + state.location.search,
      })
    })

    return () => unsubscribe()
  }, [router])
}
