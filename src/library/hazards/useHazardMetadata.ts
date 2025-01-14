import axios from 'axios'
import { useContext, useEffect, useState } from 'react'
import { LoadingContext } from '../../context/LoadingContext'

interface _HazardMetadata {
  properties: {
    ['osc-hazard:description']: string
    ['osc-hazard:units']: string
  }
}

export type HazardMetadata = _HazardMetadata | undefined | null

export const useHazardMetadata = ({
  climateModel,
  hazardIndicator,
  hazardType,
  scenario,
  year,
}: {
  climateModel: string
  hazardIndicator: string
  hazardType: string
  scenario: string
  year: string
}) => {
  const [hazardMetadata, setHazardMetadata] = useState<HazardMetadata>()
  const [isHazardMetadataError, setIsHazardMetadataError] = useState(false)
  const [isHazardMetadataLoading, setIsHazardMetadataLoading] = useState(false)
  const { setIsMapLoading } = useContext(LoadingContext)

  useEffect(
    function getHazardMetadata() {
      if (
        !setIsMapLoading ||
        !hazardIndicator ||
        !hazardType ||
        !climateModel ||
        !scenario ||
        !year
      ) {
        return
      }

      setIsHazardMetadataError(false)
      setIsHazardMetadataLoading(true)
      // We will convert to use environment var when we start using APIs for real
      // and their baseUrls present themselves.
      // Directly accessing S3 is only temporary.
      const metadataUrlForHazard = `https://ukri-eodh-hazard-tiles-us-west-2.s3.amazonaws.com/hazard/${hazardType}_osc_v2_${hazardIndicator}_${climateModel}_${scenario}_${year}.json`

      axios
        .get(metadataUrlForHazard)
        .then((res) => {
          setHazardMetadata(res.data)
        })
        .catch(() => {
          setIsHazardMetadataError(true)
          setHazardMetadata(null)
        })
        .finally(() => {
          setIsHazardMetadataLoading(false)
        })
    },
    [
      climateModel,
      hazardIndicator,
      hazardType,
      scenario,
      setIsMapLoading,
      year,
    ],
  )

  return { isHazardMetadataError, isHazardMetadataLoading, hazardMetadata }
}
