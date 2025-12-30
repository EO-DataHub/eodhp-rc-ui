import ReactGA from 'react-ga4'

let isGAInitialized = false

export const initGA = (measurementId: string) => {
  if (!measurementId || isGAInitialized) return

  try {
    ReactGA.initialize(measurementId)
    isGAInitialized = true
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('GA:Initialization failed', error)
  }
}

export const safeSendPageView = (page: string) => {
  if (!isGAInitialized) return

  try {
    ReactGA.send({
      hitType: 'pageview',
      page,
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('GA:Pageview failed', error)
  }
}

export const safeEvent = (eventName: string, params?: Record<string, unknown>) => {
  if (!isGAInitialized) return

  try {
    ReactGA.event(eventName, params)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`GA:Event "${eventName}" failed`, error)
  }
}
