import { Badge } from '@radix-ui/themes'
import type { ProcessRecord } from '@/types'

export const ToolTypeBadge = ({ tool }: { tool: ProcessRecord }) =>
  tool.properties.type === 'workflow' ? (
    <Badge color="blue">Workflow</Badge>
  ) : (
    <Badge color="orange">Notebook</Badge>
  )
