// Generates a SHA-256 hash (hex-encoded) from a string using the Web Crypto API.
export const hashSHA256 = async (value: string): Promise<string | null> => {
  try {
    if (!window.crypto?.subtle) {
      return null
    }

    const encoder = new TextEncoder()
    const data = encoder.encode(value)

    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))

    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('hashSHA256 failed:', error)
    return null
  }
}
