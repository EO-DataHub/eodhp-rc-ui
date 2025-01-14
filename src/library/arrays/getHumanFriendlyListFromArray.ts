export const getHumanFriendlyListFromArray = (
  array: (number | string | boolean | undefined | null | bigint)[],
) => {
  // @ts-expect-error - we have Vite's plugin-legacy in use so we can use Intl.ListFormat
  const formatter = new Intl.ListFormat('en', {
    style: 'long',
    type: 'conjunction',
  })
  const arrayConvertedToString = array
    .filter((item) => item !== undefined && item !== null)
    .map((item) => item!.toString())

  return formatter.format(arrayConvertedToString) as string
}
