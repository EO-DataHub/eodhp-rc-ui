import { Badge, Tooltip } from '@radix-ui/themes'

/** Marks demo-only UI, so viewers know the data behind it is mocked. */
export const DemoBadge = () => (
  <Tooltip content="This is a UX demo. Nothing here calls a real service.">
    <Badge color="amber" variant="soft" size="1">
      Demo
    </Badge>
  </Tooltip>
)
