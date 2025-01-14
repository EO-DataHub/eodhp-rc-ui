import { RadioGroup } from '@radix-ui/themes'
import { ReactNode, useState } from 'react'

import { AssetImpactViewOptions } from '../../../../configuration/constants'
import { AssetsTable } from '../../../AssetsTable/AssetsTable'
import {
  RowSelection,
  UserAssets,
} from '../../../../library/userAssets/userAssetTypes'
import assetImpactStyled from './AssetsImpacts.module.scss'
import { AssetImpactsDetails } from './AssetImpactsDetails'
import { toast } from 'react-toastify'
import { UserAssetForTable } from '../../../../library/userAssets/convertUserAssets'

export const AssetsImpacts = ({
  oscFilters,
  analysedUserAssets,
  filteredAnalysedUserAssetsForTable,
}: {
  oscFilters: ReactNode
  analysedUserAssets: UserAssets
  filteredAnalysedUserAssetsForTable: UserAssetForTable[]
}) => {
  const [assetToDetailId, setAssetToDetailId] = useState<
    string | number | undefined
  >()
  const [rowSelection, setRowSelection] = useState<RowSelection>({})
  const [selectedAssetImpactView, setSelectedAssetImpactView] =
    useState<AssetImpactViewOptions>(AssetImpactViewOptions.LIST)

  return (
    <div className={assetImpactStyled.assetImpactsWrapper}>
      <RadioGroup.Root
        value={selectedAssetImpactView}
        onValueChange={(value) => {
          setSelectedAssetImpactView(value as AssetImpactViewOptions)

          if (
            value === (AssetImpactViewOptions.DETAILS as string) &&
            !assetToDetailId
          ) {
            toast.info(
              'Please click "View Details" on an asset to see its details.',
            )
          }
        }}
        name="example"
        className={assetImpactStyled.impactsListDetailSelector}
      >
        <RadioGroup.Item value={AssetImpactViewOptions.LIST}>
          Asset List
        </RadioGroup.Item>
        <RadioGroup.Item value={AssetImpactViewOptions.DETAILS}>
          Asset Details
        </RadioGroup.Item>
      </RadioGroup.Root>
      {selectedAssetImpactView === AssetImpactViewOptions.DETAILS &&
      assetToDetailId ? (
        <AssetImpactsDetails
          analysedUserAssets={analysedUserAssets}
          analysedUserAssetsForTable={filteredAnalysedUserAssetsForTable}
          rowSelection={rowSelection}
          assetToDetailId={assetToDetailId}
          setRowSelection={setRowSelection}
          setAssetToDetailId={setAssetToDetailId}
        />
      ) : (
        <AssetsTable
          areExtraColumnsVisibleInitially={true}
          userAssetsForTable={filteredAnalysedUserAssetsForTable}
          rowSelection={rowSelection}
          setRowSelection={setRowSelection}
          showSelectBoxes={false}
          showViewDetailsButton={true}
          onViewDetailsClick={(id) => {
            setAssetToDetailId(id)
            setSelectedAssetImpactView(AssetImpactViewOptions.DETAILS)
          }}
          upperRightTitleRowSlot={oscFilters}
        />
      )}
    </div>
  )
}
