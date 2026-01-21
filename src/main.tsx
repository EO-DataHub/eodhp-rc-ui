import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './app/App.tsx'
import './index.css'
import { AnalyticsConsentProvider } from '@/context/AnalyticsConsentProvider'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AnalyticsConsentProvider>
        <App />
      </AnalyticsConsentProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
