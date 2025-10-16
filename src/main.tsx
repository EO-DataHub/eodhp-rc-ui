import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './app/App.tsx'
import './index.css'

// Constants for localStorage version management
const APP_STORAGE_VERSION = '1.0.0'
const STORAGE_VERSION_KEY = 'app_storage_version'

// Clear localStorage if version is outdated or missing
// This prevents errors from incompatible data structures in older deployments
const currentVersion = localStorage.getItem(STORAGE_VERSION_KEY)
if (currentVersion !== APP_STORAGE_VERSION) {
  localStorage.clear()
  localStorage.setItem(STORAGE_VERSION_KEY, APP_STORAGE_VERSION)
}

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)
