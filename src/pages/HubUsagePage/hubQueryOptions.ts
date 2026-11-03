// Hub usage reads are slow on the server and change slowly, so a period seen recently is
// shown from the cache, and a window focus does not read everything again.
export const HUB_QUERY_CACHE = {
  staleTime: 5 * 60 * 1000,
  refetchOnWindowFocus: false,
} as const
