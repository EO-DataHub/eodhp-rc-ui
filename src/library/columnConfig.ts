export enum ColumnId {
  WORKSPACE = 'workspace',
  COLLECTION = 'collection',
  ORDER_DATE = 'orderDate',
  ORDER_STATUS = 'orderStatus',
  BUNDLE = 'bundle',
  COUNTRY = 'country',
  LICENSE = 'license',
  TITLE = 'title',
  DESCRIPTION = 'description',
  ORDER_ID = 'orderId',
  DATE = 'date',
  VIEW = 'view',
}

export interface ColumnConfig {
  id: ColumnId
  label: string
  visible: boolean
  order: number
  fixed?: boolean // Fixed columns cannot be hidden or reordered
}

const COLUMN_LABELS: Record<ColumnId, string> = {
  [ColumnId.WORKSPACE]: 'Workspace',
  [ColumnId.COLLECTION]: 'Collection',
  [ColumnId.ORDER_DATE]: 'Order Date',
  [ColumnId.ORDER_STATUS]: 'Order Status',
  [ColumnId.BUNDLE]: 'Bundle',
  [ColumnId.COUNTRY]: 'Country',
  [ColumnId.LICENSE]: 'License',
  [ColumnId.TITLE]: 'Title',
  [ColumnId.DESCRIPTION]: 'Description',
  [ColumnId.ORDER_ID]: 'Order ID',
  [ColumnId.DATE]: 'Acquisition Date',
  [ColumnId.VIEW]: 'View',
}

const STORAGE_KEY = 'ordersTableColumnConfig'

/**
 * Get default column configuration
 * Fixed columns: Title (first), Workspace, Collection, View (last)
 * Default visible selectable columns: Order Date, Order Status
 */
export const getDefaultColumnConfig = (): ColumnConfig[] => {
  return [
    // Fixed columns (always visible, cannot be reordered)
    {
      id: ColumnId.TITLE,
      label: COLUMN_LABELS[ColumnId.TITLE],
      visible: true,
      order: 0,
      fixed: true,
    },
    {
      id: ColumnId.WORKSPACE,
      label: COLUMN_LABELS[ColumnId.WORKSPACE],
      visible: true,
      order: 1,
      fixed: true,
    },
    {
      id: ColumnId.COLLECTION,
      label: COLUMN_LABELS[ColumnId.COLLECTION],
      visible: true,
      order: 2,
      fixed: true,
    },

    // Selectable columns
    { id: ColumnId.ORDER_DATE, label: COLUMN_LABELS[ColumnId.ORDER_DATE], visible: true, order: 3 },
    {
      id: ColumnId.ORDER_STATUS,
      label: COLUMN_LABELS[ColumnId.ORDER_STATUS],
      visible: true,
      order: 4,
    },
    { id: ColumnId.BUNDLE, label: COLUMN_LABELS[ColumnId.BUNDLE], visible: false, order: 5 },
    { id: ColumnId.COUNTRY, label: COLUMN_LABELS[ColumnId.COUNTRY], visible: false, order: 6 },
    { id: ColumnId.LICENSE, label: COLUMN_LABELS[ColumnId.LICENSE], visible: false, order: 7 },
    {
      id: ColumnId.DESCRIPTION,
      label: COLUMN_LABELS[ColumnId.DESCRIPTION],
      visible: false,
      order: 8,
    },
    { id: ColumnId.ORDER_ID, label: COLUMN_LABELS[ColumnId.ORDER_ID], visible: false, order: 9 },
    { id: ColumnId.DATE, label: COLUMN_LABELS[ColumnId.DATE], visible: false, order: 10 },

    // Fixed columns (always visible, cannot be reordered)
    {
      id: ColumnId.VIEW,
      label: COLUMN_LABELS[ColumnId.VIEW],
      visible: true,
      order: 11,
      fixed: true,
    },
  ]
}

/**
 * Get selectable columns (non-fixed columns)
 */
export const getSelectableColumns = (config: ColumnConfig[]): ColumnConfig[] => {
  return config.filter((col) => !col.fixed)
}

/**
 * Load column configuration from localStorage
 */
export const loadColumnConfig = (): ColumnConfig[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return getDefaultColumnConfig()
    }

    const parsed = JSON.parse(stored) as ColumnConfig[]
    // Merge with default to ensure all columns exist and defaults are preserved
    const defaultConfig = getDefaultColumnConfig()
    const configMap = new Map(parsed.map((col) => [col.id, col]))

    return defaultConfig.map((defaultCol) => {
      const storedCol = configMap.get(defaultCol.id)
      if (storedCol) {
        // Preserve fixed property and label from default (label may have been updated)
        return { ...storedCol, fixed: defaultCol.fixed, label: defaultCol.label }
      }
      return defaultCol
    })
  } catch {
    return getDefaultColumnConfig()
  }
}

/**
 * Save column configuration to localStorage
 */
export const saveColumnConfig = (config: ColumnConfig[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // Silently fail if localStorage is not available
  }
}

/**
 * Get visible columns sorted by order
 */
export const getVisibleColumns = (config: ColumnConfig[]): ColumnConfig[] => {
  return config.filter((col) => col.visible).sort((a, b) => a.order - b.order)
}

/**
 * Reset column configuration to defaults
 */
export const resetColumnConfig = (): ColumnConfig[] => {
  const defaultConfig = getDefaultColumnConfig()
  saveColumnConfig(defaultConfig)
  return defaultConfig
}
