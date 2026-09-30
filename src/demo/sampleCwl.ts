/** A sample packed CWL file for the Create workflow demo. */
export const SAMPLE_CWL_FILE_NAME = 'burn-severity.cwl'

export const SAMPLE_CWL = `cwlVersion: v1.0
$namespaces:
  s: https://schema.org/
s:softwareVersion: 0.3.0
$graph:
  - class: Workflow
    id: main
    label: Burn severity (dNBR)
    doc: Maps burn severity by comparing Normalised Burn Ratio before and after a fire.
    requirements:
      - class: ScatterFeatureRequirement
    inputs:
      data:
        type: Directory
        label: Post-fire image
        doc: The image taken after the fire.
      aoi:
        type: string?
        label: Area of interest
        doc: Optional area to clip the result to, as GeoJSON.
      start_date:
        type: string?
        doc: Only use pre-fire imagery after this date.
      index:
        type:
          type: enum
          symbols: [dNBR, RdNBR]
        default: dNBR
        doc: Which burn severity index to calculate.
      resolution:
        type: float
        default: 20
        doc: Output pixel size in metres.
    outputs:
      results:
        type: Directory
        outputSource: severity/results
    steps:
      severity:
        run: '#severity'
        in:
          data: data
          aoi: aoi
          start_date: start_date
          index: index
          resolution: resolution
        out: [results]
  - class: CommandLineTool
    id: severity
    requirements:
      DockerRequirement:
        dockerPull: ghcr.io/eo-datahub/burn-severity@sha256:9b776c744ce5f4435ac048c58956efce924065152941ed07bb9bf5f82caa191d
    baseCommand: burn-severity
    inputs:
      data:
        type: Directory
        inputBinding:
          prefix: --item
      aoi:
        type: string?
        inputBinding:
          prefix: --aoi
      start_date:
        type: string?
        inputBinding:
          prefix: --start-date
      index:
        type: string
        inputBinding:
          prefix: --index
      resolution:
        type: float
        inputBinding:
          prefix: --resolution
    outputs:
      results:
        type: Directory
        outputBinding:
          glob: .
`
