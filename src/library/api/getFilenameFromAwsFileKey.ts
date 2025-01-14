export const getFilenameFromAwsFileKey = ({
  key,
  workspaceUserName,
}: {
  key: string | undefined
  workspaceUserName: string
}) => key?.replace(`${workspaceUserName}/user-assets/`, '')
