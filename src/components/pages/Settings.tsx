import { PageTitle } from '../PageTitle'
import { PageLayout } from '../Layout/PageLayout'
import ReactMarkdown from 'react-markdown'

import pageContent from '../../configuration/settingsPageContent.md'

export const Settings = () => {
  return (
    <PageLayout>
      <PageTitle>Settings</PageTitle>
      <ReactMarkdown>{pageContent}</ReactMarkdown>
    </PageLayout>
  )
}
