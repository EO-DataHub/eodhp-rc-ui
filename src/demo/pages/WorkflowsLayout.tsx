import React from 'react'
import { SidebarNavLayout } from '@/components/SidebarNavLayout/SidebarNavLayout'

const links = [
  { to: 'saved-sets', label: 'Saved sets' },
  { to: 'runs', label: 'Workflow runs' },
  { to: 'create', label: 'Create workflow' },
]

export const WorkflowsLayout: React.FC = () => <SidebarNavLayout title="Workflows" links={links} />
