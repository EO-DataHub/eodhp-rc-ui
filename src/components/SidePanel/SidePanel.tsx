import React, { useState, ReactNode } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Flex, IconButton, Text } from '@radix-ui/themes'
import { FilterPanel } from './FilterPanel/FilterPanel'
import { SmallCollectionCard } from './SmallCollectionCard/SmallCollectionCard'
import { ItemCard } from '@/components/ItemCard/ItemCard'
import { Item } from '@/types'
import FilterAltFilled from '../../../public/filter-alt-filled.svg?react'
import styles from './SidePanel.module.scss'
import { fetchCollections } from '@/services/collectionService'
import { Collection } from '@/types'
import { PageSelector } from '../Pagination/PageSelector/PageSelector'
import { MAX_TOTAL_ITEMS, PAGE_SIZE } from '@/pages/DataFinderPage/DataFinderPage'
import { ItemInfoPanel } from './InfoPanel/ItemInfoPanel'
import { catalogs } from '@/constants'

import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { CollectionInfoPanel } from './InfoPanel/CollectionInfoPanel'
import { InfoPanelWrapper } from './InfoPanel/InfoPanelWrapper'

const mockCollection: Collection = {
  type: 'Collection',
  stac_version: '1.0.0',
  stac_extensions: ['https://stac-extensions.github.io/render/v1.0.0/schema.json'],
  id: 'sentinel2_ard',
  title: 'Sentinel 2 ARD',
  description:
    'These data have been created by the Department for Environment, Food and Rural Affairs (Defra) and Joint Nature Conservation Committee (JNCC) in order to cost-effectively provide high quality, Analysis Ready Data (ARD) for a wide range of applications. The dataset contains modified Copernicus Sentinel-2 (Level 1C data processed into a surface reflectance product using ARCSI software (Level 2)).',
  links: [
    {
      rel: 'self',
      type: 'application/json',
      href: 'https://test.eodatahub.org.uk/api/catalogue/stac/catalogs/supported-datasets/ceda-stac-catalogue/collections/sentinel2_ard',
    },
    {
      rel: 'parent',
      type: 'application/json',
      href: 'https://test.eodatahub.org.uk/api/catalogue/stac/catalogs/supported-datasets/ceda-stac-catalogue',
    },
    {
      rel: 'items',
      type: 'application/geo+json',
      href: 'https://test.eodatahub.org.uk/api/catalogue/stac/catalogs/supported-datasets/ceda-stac-catalogue/collections/sentinel2_ard/items',
    },
    {
      rel: 'root',
      type: 'application/json',
      href: 'https://test.eodatahub.org.uk/api/catalogue/stac/catalogs/supported-datasets/ceda-stac-catalogue',
    },
    {
      rel: 'ceda_catalogue',
      href: 'https://test.eodatahub.org.uk/uuid/bf9568b558204b81803eeebcc7f529ef',
      type: 'text/html',
    },
    {
      rel: 'license',
      href: 'https://test.eodatahub.org.uk/api/catalogue/licences/spdx/text/OGL-UK-3.0.txt',
      type: 'text/plain',
    },
    {
      rel: 'license',
      href: 'https://test.eodatahub.org.uk/api/catalogue/licences/spdx/html/OGL-UK-3.0.html',
      type: 'text/html',
    },
  ],
  keywords: [
    'Analysis Ready Data',
    'Sentinel',
    'Surface Reflectance',
    'ARD',
    'Level2',
    'ARCSI',
    'JNCC',
    'Defra',
    'ESA',
  ],
  license: 'OGL-UK-3.0',
  providers: [
    {
      roles: ['producer'],
      name: 'Department for Environment, Food and Rural Affairs (Defra)',
      url: 'https://www.gov.uk/government/organisations/department-for-environment-food-rural-affairs',
    },
    {
      roles: ['producer'],
      name: 'Joint Nature Conservation Committee (JNCC)',
      url: 'https://jncc.gov.uk',
    },
    {
      roles: ['host'],
      name: 'Centre for Environmental Data Analysis (CEDA)',
      url: 'https://ceda.ac.uk',
    },
  ],
  extent: {
    spatial: {
      bbox: [[-9.00034454651177, 49.48562028352171, 3.1494256015866995, 61.33444247301668]],
    },
    temporal: { interval: [['2023-01-01T11:14:51.000Z', '2023-11-01T11:43:49.000Z']] },
  },
  summaries: {
    'Instrument Family Name Abbreviation': ['MSI'],
    'NSSDC Identifier': ['2015-000A'],
    'Start Orbit Number': [
      '030408',
      '030422',
      '030436',
      '030465',
      '030479',
      '030508',
      '030522',
      '030551',
      '030565',
      '030579',
      '030608',
      '030622',
      '030651',
      '030665',
      '030694',
      '030708',
      '030722',
      '030751',
      '030765',
      '030794',
      '030808',
      '030837',
      '030851',
      '030865',
      '030908',
      '030937',
      '030951',
      '030994',
      '031008',
      '031037',
      '031051',
      '031080',
      '031094',
      '031123',
      '031137',
      '031151',
      '031180',
      '031194',
      '031223',
      '031237',
      '031266',
      '031280',
      '031294',
      '031323',
      '031337',
      '031366',
      '031380',
      '031409',
      '031423',
      '031437',
      '031466',
      '031480',
      '031509',
      '031523',
      '031552',
      '031566',
      '031580',
      '031609',
      '031623',
      '031666',
      '031709',
      '031723',
      '031766',
      '031795',
      '031809',
      '031838',
      '031852',
      '031866',
      '031895',
      '031938',
      '031952',
      '031981',
      '031995',
      '032009',
      '032038',
      '032052',
      '032081',
      '032095',
      '032124',
      '032138',
      '032152',
      '032181',
      '032195',
      '032224',
      '032238',
      '032281',
      '032295',
      '032324',
      '032338',
      '032367',
      '032381',
      '032410',
      '032424',
      '032438',
      '032467',
      '032481',
      '032510',
      '032524',
      '032553',
      '032567',
    ],
    'Instrument Family Name': ['Multi-Spectral Instrument'],
    'Platform Number': ['2A', '2B'],
    'Start Relative Orbit Number': ['023', '037', '066', '080', '094', '123', '137'],
    'Ground Tracking Direction': ['ascending', 'descending'],
  },
  assets: {
    thumbnail: {
      roles: ['thumbnail'],
      href: 'https://dap.ceda.ac.uk/neodc/sentinel_ard/data/sentinel_2/2023/06/10/S2A_20230610_latn527lone0008_T30UYD_ORB137_20230610144925_utm30n_osgb_vmsk_sharp_rad_srefdem_stdsref_thumbnail.jpg',
      type: 'image/jpg',
    },
  },
}

interface SidePanelProps {
  items: Item[]
  isLoading: boolean
  error: boolean
  page: number
  setPage: (page: number) => void
}

const PaginationContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <Flex justify="center" className={styles.paginationContainer}>
      {children}
    </Flex>
  )
}

const PageIndicator = ({ page, totalItemsCount }: { page: number; totalItemsCount: number }) => {
  const totalCountLabel =
    totalItemsCount > MAX_TOTAL_ITEMS ? `${MAX_TOTAL_ITEMS}+` : totalItemsCount
  const startItem = page * PAGE_SIZE + 1
  const endItem = Math.min((page + 1) * PAGE_SIZE, totalItemsCount)
  return (
    <Text size="2" weight="bold">
      {`${startItem}-${endItem} of ${totalCountLabel}`}
    </Text>
  )
}

const ItemList = ({
  items,
  isLoading,
  error,
  renderItem,
}: {
  items: Item[]
  isLoading: boolean
  error: boolean
  renderItem: (item: Item) => ReactNode
}) => {
  if (isLoading) {
    return <Text>Loading Items...</Text>
  }

  if (error) {
    return <Text color="red">Error loading items!</Text>
  }

  return (
    <div className={styles.listContainer}>
      <ul>{items.map((item) => renderItem(item))}</ul>
    </div>
  )
}
export const SidePanel: React.FC<SidePanelProps> = ({ items, isLoading, error, page, setPage }) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [selectedThumbnail, setSelectedThumbnail] = useState<Item | null>(null)
  const [checkedItems, setCheckedItems] = useState<Item[]>([])
  const [selectedItemInfo, setSelectedItemInfo] = useState<Item | null>(null)
  const [isCollectionInfoPanelOpen, setIsCollectionInfoPanelOpen] = useState(false)

  const toggleFilterPanel = () => {
    setIsFilterOpen((prev) => !prev)
  }

  const queries = useQueries({
    queries: catalogs.map((catalog, index) => ({
      queryKey: ['Collections', index],
      queryFn: () => fetchCollections(catalog),
    })),
  })

  const mergedCollections: Collection[] = queries.flatMap(
    (query: { data?: Collection[] }) => query.data ?? [],
  )

  // the target collection will be based on user selection input in the future
  const targetCollectionId = 'sentinel2_ard'
  const targetCollection = mergedCollections?.find((col) => col.id === targetCollectionId)
  const isLicenseProprietary = targetCollection?.license === 'proprietary'

  const pageCount = Math.ceil(items.length / PAGE_SIZE)

  const sidePanelsOpen = !!selectedItemInfo || isFilterOpen || isCollectionInfoPanelOpen

  const handleSelectItem = (item: Item) => {
    setSelectedItem(item)
  }

  const handleSelectCollectionInfo = () => {
    // Reset item info panel
    setSelectedItemInfo(null)
    setIsCollectionInfoPanelOpen(true)
  }

  const handleSelectItemInfo = (item: Item) => {
    // Reset collection info panel
    setIsCollectionInfoPanelOpen(false)
    setSelectedItemInfo(item)
  }

  const handleThumbnailSelect = (item: Item) => {
    setSelectedThumbnail((prev) => {
      const isCurrentlySelected = prev?.id === item.id

      if (isCurrentlySelected) {
        setCheckedItems((prevChecked) =>
          prevChecked.filter((checkedItem) => checkedItem.id !== item.id),
        )
        return null
      }

      setCheckedItems((prevChecked) => {
        const isAlreadyChecked = prevChecked.some((i) => i.id === item.id)
        return isAlreadyChecked ? prevChecked : [...prevChecked, item]
      })

      return item
    })
  }

  const handleCheckboxItemChange = (item: Item, isChecked: boolean) => {
    dataFinderStore.send({ type: 'pinnedItemChange', item, isChecked })
    setCheckedItems((prevChecked) =>
      isChecked ? [...prevChecked, item] : prevChecked.filter((checked) => checked.id !== item.id),
    )
  }

  return (
    <Flex height={'var(--content-height)'} position="relative" width="100%">
      <Flex
        className={styles.sidePanel}
        direction="column"
        width="338px"
        p="4"
        gap="2"
        style={{
          boxShadow: sidePanelsOpen ? 'none' : undefined,
        }}
      >
        <Flex justify="end">
          <IconButton size="2" variant="ghost" onClick={toggleFilterPanel}>
            <Flex gap="2" align="center">
              <Text>Filters</Text>
              <FilterAltFilled />
            </Flex>
          </IconButton>
        </Flex>
        <SmallCollectionCard onSelectCollectionInfo={handleSelectCollectionInfo} />
        <Flex justify="end">
          <PageIndicator page={page} totalItemsCount={items.length} />
        </Flex>
        <ItemList
          items={items.filter(
            (_, index) => index >= page * PAGE_SIZE && index < (page + 1) * PAGE_SIZE,
          )}
          isLoading={isLoading}
          error={error}
          renderItem={(item) => (
            <ItemCard
              key={item.id}
              item={item}
              isSelected={selectedItem?.id === item.id}
              isThumbnailSelected={selectedThumbnail?.id === item.id}
              isChecked={checkedItems.some((checked) => checked.id === item.id)}
              onSelect={handleSelectItem}
              onSelectItemInfo={handleSelectItemInfo}
              onThumbnailSelect={handleThumbnailSelect}
              onCheckboxChange={handleCheckboxItemChange}
              isLicenseProprietary={isLicenseProprietary}
            />
          )}
        />
        <PaginationContainer>
          <PageSelector
            currentPageIndex={page}
            nextDisabled={page === pageCount - 1}
            onGoToPage={setPage}
            onNextClick={() => setPage(page + 1)}
            onPreviousClick={() => setPage(page - 1)}
            pageCount={pageCount}
            previousDisabled={page === 0}
          />
        </PaginationContainer>
      </Flex>

      <FilterPanel isOpen={isFilterOpen} onClose={toggleFilterPanel} />

      {/* Show either item or collection info panel, and close the other one if needed */}
      <InfoPanelWrapper isOpen={!!selectedItemInfo || isCollectionInfoPanelOpen}>
        {selectedItemInfo && (
          <ItemInfoPanel item={selectedItemInfo} onClose={() => setSelectedItemInfo(null)} />
        )}
        {isCollectionInfoPanelOpen && (
          <CollectionInfoPanel
            collection={mockCollection}
            onClose={() => setIsCollectionInfoPanelOpen(false)}
          />
        )}
      </InfoPanelWrapper>
    </Flex>
  )
}
