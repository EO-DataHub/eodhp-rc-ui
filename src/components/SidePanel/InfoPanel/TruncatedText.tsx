import React, { useMemo, useState } from 'react'

import { Text, Link, Flex } from '@radix-ui/themes'

interface TruncatedTextProps {
  text: string
  maxLength?: number
}

const MAX_LENGTH = 500

const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}

export const TruncatedText: React.FC<TruncatedTextProps> = ({ text, maxLength = MAX_LENGTH }) => {
  const [shouldTruncate, setShouldTruncate] = useState(true)

  const truncatedText = useMemo(
    () => (text && shouldTruncate ? truncateText(text, maxLength) : text),
    [text, shouldTruncate, maxLength],
  )

  return (
    <Flex direction="column" gap="2">
      <Text size="3">{truncatedText}</Text>
      {text && text.length > maxLength && (
        <Link
          href="#"
          size="2"
          onClick={() => setShouldTruncate(!shouldTruncate)}
          underline="always"
          highContrast
          weight="medium"
          style={{ color: 'var(--accent-a11)' }}
        >
          {shouldTruncate ? 'Read More' : 'Read Less'}
        </Link>
      )}
    </Flex>
  )
}
