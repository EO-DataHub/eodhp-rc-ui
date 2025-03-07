const planetProductBundleMap: Record<string, string> = {
  // Standard Analytic Bundles
  ortho_analytic_4b: 'analytic_udm2',
  ortho_analytic_4b_sr: 'analytic_sr_udm2',
  ortho_analytic_3b: 'analytic_3b_udm2',
  ortho_analytic_8b: 'analytic_8b_udm2',
  ortho_analytic_8b_sr: 'analytic_8b_sr_udm2',

  // Basic Analytic Bundles
  basic_analytic_4b: 'basic_analytic_udm2',
  basic_analytic_8b: 'basic_analytic_8b_udm2',

  // Panchromatic Data
  basic_panchromatic: 'basic_panchromatic',
  basic_panchromatic_dn: 'basic_panchromatic_dn',
  ortho_panchromatic: 'panchromatic_udm2',
  ortho_panchromatic_dn: 'panchromatic_dn_udm2',

  // Surface Reflectance
  analytic_sr: 'analytic_sr',
  analytic_sr_hdf5: 'sr_hdf5',
  basic_sr_hdf5: 'basic_sr_hdf5',

  // Visual Bundles
  ortho_visual: 'visual',

  // Methane Products
  ortho_ql_ch4: 'methane_quicklook',
  ortho_qc_ch4: 'quality_controlled_methane',
  ortho_ql_ime_ch4: 'integrated_methane_enhancement',
  methane: 'methane',
}

export const getProductBundleForPlanet = (
  availableAssets: Record<string, unknown>,
): string | null => {
  for (const assetKey of Object.keys(availableAssets)) {
    if (planetProductBundleMap[assetKey]) {
      return planetProductBundleMap[assetKey]
    }
  }
  return null
}
