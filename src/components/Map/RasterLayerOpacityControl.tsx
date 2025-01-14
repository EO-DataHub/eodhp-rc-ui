import { IconButton, Slider } from '@radix-ui/themes'
import controlStyles from './RasterLayerOpacityControl.module.scss'
import OpacityFilled from '../../localAssets/opacityFilled.svg?react'
import { useEffect, useRef, useState } from 'react'
import { MapRef } from './useMap'

export const RasterLayerOpacityControl = ({
  initialOpacity,
  isMapLoaded,
  layerId,
  mapRef,
  sliderLabel,
}: {
  initialOpacity: number // 0 - 1 to match maplibre
  isMapLoaded: boolean
  layerId: string
  mapRef: MapRef
  sliderLabel: string
}) => {
  const [isSliderShowing, setIsSliderShowing] = useState(false)
  const [opacity, setOpacity] = useState<number>(initialOpacity * 100) // 0 - 100 to match Radix Slider component
  const opacityButtonRef = useRef<HTMLButtonElement | null>(null)
  const opacitySliderRef = useRef<HTMLDivElement | null>(null)

  useEffect(
    function updateLayerOpacityInMap() {
      if (!mapRef.current || !isMapLoaded) return

      const layer = mapRef.current.getLayer(layerId)

      if (!layer) return

      mapRef.current.setPaintProperty(layerId, 'raster-opacity', opacity / 100)
    },
    [isMapLoaded, layerId, mapRef, opacity],
  )

  useEffect(function manageClickAwayEventListener() {
    const handleDocumentClick = (event: MouseEvent) => {
      const clickedElement = event.target as HTMLElement
      const isClickOutsideOpacitySliderContainer =
        opacitySliderRef.current?.contains(clickedElement) === false
      const isClickOutsideOpacityButton =
        opacityButtonRef.current?.contains(clickedElement) === false

      if (isClickOutsideOpacitySliderContainer && isClickOutsideOpacityButton) {
        setIsSliderShowing(false)
      }
    }

    document.addEventListener('click', handleDocumentClick)

    return () => {
      document.removeEventListener('click', handleDocumentClick)
    }
  }, [])

  const handleOpacityChange = (opacity: [number]) => {
    const newOpacity = opacity[0]

    setOpacity(newOpacity)
  }

  const handleButtonClick = () => {
    setIsSliderShowing(!isSliderShowing)
  }

  return (
    <div
      className={`maplibregl-ctrl maplibregl-ctrl-group ${controlStyles.opacityControlContainer}`}
    >
      <IconButton
        className={controlStyles.opacityButton}
        onClick={handleButtonClick}
        ref={opacityButtonRef}
      >
        <OpacityFilled />
      </IconButton>
      {isSliderShowing ? (
        <div
          className={controlStyles.opacitySliderContainer}
          ref={opacitySliderRef}
        >
          <label>{sliderLabel}</label>
          <Slider value={[opacity]} onValueChange={handleOpacityChange} />
        </div>
      ) : null}
    </div>
  )
}
