import { Select, Spinner } from '@radix-ui/themes'
import { useContext } from 'react'

import { AuthenticationContext } from '../../context/AuthenticationContext'
import samplePortfolios from '../../library/api/samplePortfolios.json'
import { PortfoliosContext } from '../../context/PortfoliosContext'

export const AssetsSelect = ({
  onValueChange,
}: {
  onValueChange?: (value: string) => void
}) => {
  const { isAuthenticated } = useContext(AuthenticationContext)

  const { fileInfo, isFileInfoLoading } = useContext(PortfoliosContext)

  return (
    <Select.Root onValueChange={onValueChange}>
      <Select.Trigger placeholder="Select Portfolio" />
      <Select.Content position="popper">
        {isAuthenticated ? (
          <>
            <Select.Group>
              <Select.Label>
                My Portfolios
                {isFileInfoLoading ? (
                  <>
                    &nbsp;
                    <Spinner />
                  </>
                ) : null}
              </Select.Label>
              {fileInfo?.map(({ name }) => (
                <Select.Item value={name} key={name}>
                  {name}
                </Select.Item>
              ))}
            </Select.Group>
            <Select.Separator />
          </>
        ) : null}

        <Select.Group>
          <Select.Label>Sample Portfolios</Select.Label>
          {samplePortfolios.map(({ id, name }) => (
            <Select.Item value={id} key={id}>
              {name}
            </Select.Item>
          ))}
        </Select.Group>
      </Select.Content>
    </Select.Root>
  )
}
