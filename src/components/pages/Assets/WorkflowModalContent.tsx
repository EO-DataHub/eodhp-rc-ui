import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { Button, Dialog } from '@radix-ui/themes'
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar'
import { DateValidationError } from '@mui/x-date-pickers/models'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import ArrowLeft from '../../../localAssets/arrow-left.svg?react'
import CloseIcon from '@material-design-icons/svg/filled/close.svg?react'
import dayjs, { Dayjs } from 'dayjs'
import { capitalizeFirstLetter } from '../../../library/strings/capitalizeFirstLetter'
import { getHumanFriendlyListFromArray } from '../../../library/arrays/getHumanFriendlyListFromArray'
import { HubWorkflowOptions } from '../../../library/api/apiTypes'
import { IconButtonOverride } from '../../IconButtonOverride/IconButtonOverride'
import { ReactNode, useContext, useEffect, useState } from 'react'
import workflowOptions from '../../../library/api/workflowOptions.json'
import containerStyles from '../../../library/genericStyles/containers.module.scss'
import modalStyles from './WorkflowModalContent.module.scss'
import { HandleAnalyseAssetsProps } from './assetsTypes'
import { getGeometriesPresentInFeatureCollection } from '../../../library/geoJson/getGeometriesPresentInFeatureClass'
import { FeatureCollection } from 'geojson'
import { UserAssetsContext } from '../../../context/UserAssetsContext'

type DateErrorType = DateValidationError | 'required' | null

const defaultEndDate = dayjs()
const defaultStartDate = defaultEndDate.subtract(1, 'month')

const WorkflowInformation = ({
  inputContent,
  workflowOptions,
  areGeometriesSupportedWorkflowOption,
}: {
  inputContent: ReactNode
  workflowOptions: HubWorkflowOptions
  areGeometriesSupportedWorkflowOption: boolean
}) => {
  const {
    title,
    description,
    constraints: {
      required_columns: requiredColumns,
      supported_assets: supportedGeometries,
    },
  } = workflowOptions

  const supportedGeometriesToUse = supportedGeometries
    .filter(Boolean)
    .map((geometry) => geometry.toLowerCase())

  const supportedGeometriesString = getHumanFriendlyListFromArray(
    supportedGeometriesToUse,
  )

  return (
    <div className={modalStyles.workflowInformation}>
      <p>{title}</p>
      <p>{description}</p>
      <p>
        This workflow requires the following columns:
        <br />
        {requiredColumns.join(', ')}
      </p>
      {supportedGeometriesToUse.length >= 1 &&
      supportedGeometriesToUse.length < 3 ? (
        <p
          className={
            areGeometriesSupportedWorkflowOption
              ? undefined
              : modalStyles.geometryError
          }
        >
          Only {supportedGeometriesString} geometries are supported. Other
          geometries cannot be analysed.
        </p>
      ) : null}
      {supportedGeometriesToUse.length === 3 ? (
        <p>
          {capitalizeFirstLetter(supportedGeometriesString)} geometries are
          supported.
        </p>
      ) : null}
      {supportedGeometriesToUse.length < 1 ? (
        <p>Supported geometry information is missing.</p>
      ) : null}

      {inputContent}
    </div>
  )
}

export const WorkflowModalContent = ({
  handleAnalyseAssets,
  selectedWorkflowOptions,
  setSelectedWorkflowOptions,
}: {
  handleAnalyseAssets: (props: HandleAnalyseAssetsProps) => void
  selectedWorkflowOptions: HubWorkflowOptions | null
  setSelectedWorkflowOptions: (
    workflowOptions: HubWorkflowOptions | null,
  ) => void
}) => {
  const [endDate, setEndDate] = useState<Dayjs | null>(null)
  const [endDateError, setEndDateError] = useState<DateErrorType>(null)

  const [startDate, setStartDate] = useState<Dayjs | null>(null)
  const [startDateError, setStartDateError] = useState<DateErrorType>(null)
  const { userAssets } = useContext(UserAssetsContext)

  const hubWorkflowName = selectedWorkflowOptions?.preset_inputs.workflow
  const hubWorkflowPresetInputs = selectedWorkflowOptions?.preset_inputs
  const isHubWorkflowErrorShowing = !hubWorkflowName || !hubWorkflowPresetInputs
  const areDateRangeInputsShowing =
    selectedWorkflowOptions?.user_inputs.start_date &&
    selectedWorkflowOptions?.user_inputs.end_date

  const getAreGeometriesSupportedForWorkflow = ({
    workflowOptions,
  }: {
    workflowOptions: HubWorkflowOptions
  }) => {
    const supportedGeometriesForSelectedWorkflow =
      workflowOptions.constraints.supported_assets
        .filter(Boolean)
        .map((geometry) => geometry.toLowerCase())
    const geometriesPresentInUserAssets =
      getGeometriesPresentInFeatureCollection(
        userAssets as FeatureCollection,
      ).map((geometry) => geometry.toLowerCase())

    return geometriesPresentInUserAssets.every((geometry) => {
      return supportedGeometriesForSelectedWorkflow?.includes(geometry)
    })
  }

  const initializeDateRangeValues = () => {
    if (areDateRangeInputsShowing) {
      setStartDate(
        dayjs(selectedWorkflowOptions?.user_inputs.start_date?.default) ??
          defaultStartDate,
      )
      setEndDate(
        dayjs(
          selectedWorkflowOptions?.user_inputs.end_date?.default ??
            defaultEndDate,
        ),
      )
    }
    if (!areDateRangeInputsShowing) {
      // to ensure that we dont send date values to workflows that dont support them
      setStartDate(null)
      setEndDate(null)
    }
  }

  useEffect(initializeDateRangeValues, [
    areDateRangeInputsShowing,
    selectedWorkflowOptions?.user_inputs.end_date?.default,
    selectedWorkflowOptions?.user_inputs.start_date?.default,
  ])

  const handleSelectWorkflow = (workflowOptions: HubWorkflowOptions) => {
    setSelectedWorkflowOptions(workflowOptions)
    initializeDateRangeValues()
    setStartDateError(null)
    setEndDateError(null)
  }

  const returnToSelectWorkflow = () => {
    setSelectedWorkflowOptions(null)
  }

  const selectWorkflowView = (
    <ul className={modalStyles.workflowList}>
      {workflowOptions.map((options) => {
        const { title } = options
        const areGeometriesSupportedWorkflowOption =
          getAreGeometriesSupportedForWorkflow({
            workflowOptions: options as HubWorkflowOptions,
          })

        const selectAnalysisButton = (
          <Button
            variant="outline"
            onClick={() => handleSelectWorkflow(options as HubWorkflowOptions)}
            disabled={!areGeometriesSupportedWorkflowOption}
          >
            Select Workflow
          </Button>
        )

        return (
          <li key={title}>
            <WorkflowInformation
              inputContent={selectAnalysisButton}
              workflowOptions={options as HubWorkflowOptions}
              areGeometriesSupportedWorkflowOption={
                areGeometriesSupportedWorkflowOption
              }
            />
          </li>
        )
      })}
    </ul>
  )
  const dateRangeInputs = (
    <div className={modalStyles.dateInputs}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <div>
          <h3>Start Date</h3>
          <DateCalendar
            value={startDate}
            onChange={(newValue) => {
              if (newValue.isAfter(endDate)) {
                setEndDate(newValue)
              }
              setStartDate(newValue)
            }}
            disableFuture
          />
        </div>
        <div>
          <h3>End Date</h3>
          <DateCalendar
            value={endDate}
            minDate={startDate ?? undefined}
            onChange={(newValue) => {
              setEndDate(newValue)
            }}
            disableFuture
          />
        </div>
      </LocalizationProvider>
    </div>
  )
  const workflowInputs = areDateRangeInputsShowing ? dateRangeInputs : null

  const areUserAssetsGeometriesSupportedForSelectedWorkflow =
    selectedWorkflowOptions
      ? getAreGeometriesSupportedForWorkflow({
          workflowOptions: selectedWorkflowOptions,
        })
      : false

  const userInputsView = selectedWorkflowOptions ? (
    <div>
      {isHubWorkflowErrorShowing ? (
        <p className={modalStyles.workflowError}>
          Sorry, the configuration for this workflow is broken on our end.
          Please select another workflow.
        </p>
      ) : null}
      <Button variant="ghost" onClick={returnToSelectWorkflow}>
        <ArrowLeft /> Back
      </Button>

      {selectedWorkflowOptions ? (
        <WorkflowInformation
          workflowOptions={selectedWorkflowOptions}
          inputContent={workflowInputs}
          areGeometriesSupportedWorkflowOption={
            areUserAssetsGeometriesSupportedForSelectedWorkflow
          }
        />
      ) : null}
      <Button
        variant="outline"
        onClick={() =>
          handleAnalyseAssets({
            startDate: startDate?.format('YYYY-MM-DD'),
            endDate: endDate?.format('YYYY-MM-DD'),
            hubWorkflowPresetInputs: hubWorkflowPresetInputs,
          })
        }
        disabled={
          !!startDateError ||
          !!endDateError ||
          !hubWorkflowName ||
          !areUserAssetsGeometriesSupportedForSelectedWorkflow
        }
      >
        Run Analysis
      </Button>
    </div>
  ) : null
  return (
    <>
      <div className={containerStyles.modalTopRow}>
        <Dialog.Title>Select Workflow</Dialog.Title>
        <Dialog.Close>
          <IconButtonOverride
            variant="ghost"
            className="close"
            aria-label="Close select workflow modal"
          >
            <CloseIcon />
          </IconButtonOverride>
        </Dialog.Close>
      </div>
      {!selectedWorkflowOptions ? selectWorkflowView : null}
      {selectedWorkflowOptions ? userInputsView : null}
    </>
  )
}
