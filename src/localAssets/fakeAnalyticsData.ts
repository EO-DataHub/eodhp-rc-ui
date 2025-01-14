import { FeatureCollection, Point } from 'geojson'
import { UserAssetsProperties } from '../library/userAssets/userAssetTypes'

type FakeAnalyticsDataProperties = UserAssetsProperties

export type FakeAnalyticsData = FeatureCollection<
  Point,
  FakeAnalyticsDataProperties
>

export const fakeAnalyticsData = {
  type: 'FeatureCollection',
  name: 'eodh_example_data',
  features: [
    {
      type: 'Feature',
      properties: {
        id: 1,
        type: 'Building',
        location: 'United Kingdom',
        asset_class: 'IndustrialActivity',
      },
      geometry: { type: 'Point', coordinates: [-1.357346, 52.24427347] },
    },
    {
      type: 'Feature',
      properties: {
        id: 2,
        type: 'Building',
        location: 'United Kingdom',
        asset_class: 'IndustrialActivity',
      },
      geometry: {
        type: 'Point',
        coordinates: [-2.042681417314753, 54.106784357239846],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 3,
        type: 'Building',
        location: 'United Kingdom',
        asset_class: 'IndustrialActivity',
      },
      geometry: {
        type: 'Point',
        coordinates: [-2.986802889157208, 53.042925537681619],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 4,
        type: 'Building',
        location: 'United Kingdom',
        asset_class: 'IndustrialActivity',
      },
      geometry: {
        type: 'Point',
        coordinates: [1.549439014158009, 52.639626102906796],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 5,
        type: 'Building',
        location: 'United Kingdom',
        asset_class: 'IndustrialActivity',
      },
      geometry: {
        type: 'Point',
        coordinates: [-5.159703842278001, 57.897892980327512],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 6,
        type: 'Building',
        location: 'United Kingdom',
        asset_class: 'IndustrialActivity',
      },
      geometry: {
        type: 'Point',
        coordinates: [-3.951715574096755, 51.61785070262939],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 7,
        type: 'Building',
        location: 'United Kingdom',
        asset_class: 'IndustrialActivity',
      },
      geometry: {
        type: 'Point',
        coordinates: [-0.089309372361854, 51.489596472440148],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 8,
        type: 'Building',
        location: 'United Kingdom',
        asset_class: 'IndustrialActivity',
      },
      geometry: {
        type: 'Point',
        coordinates: [-1.583615189578083, 54.961822995857382],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 9,
        type: 'Building',
        location: 'United Kingdom',
        asset_class: 'IndustrialActivity',
      },
      geometry: {
        type: 'Point',
        coordinates: [-6.05510373644144, 56.381324282820444],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 10,
        type: 'Building',
        location: 'United Kingdom',
        asset_class: 'IndustrialActivity',
      },
      geometry: {
        type: 'Point',
        coordinates: [0.295954311292617, 50.784198206399203],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 11,
        type: 'Building',
        location: 'United Kingdom',
        asset_class: 'IndustrialActivity',
      },
      geometry: {
        type: 'Point',
        coordinates: [-3.211341728191422, 55.945147176732505],
      },
    },
    {
      type: 'Feature',
      properties: {
        id: 12,
        type: 'Building',
        location: 'United Kingdom',
        asset_class: 'IndustrialActivity',
      },
      geometry: {
        type: 'Point',
        coordinates: [-5.948861889998041, 56.515872238661096],
      },
    },
  ],
}
