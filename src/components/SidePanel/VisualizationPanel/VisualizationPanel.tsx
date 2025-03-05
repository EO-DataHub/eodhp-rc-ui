import React from 'react'
import { Cross1Icon } from '@radix-ui/react-icons'
import { Flex, IconButton } from '@radix-ui/themes'
import styles from './VisualizationPanel.module.scss'
import Form, { IChangeEvent } from '@rjsf/core'
import validator from '@rjsf/validator-ajv8'
import dataFinderStore from '@/pages/DataFinderPage/useFinderStore'
import { useSelector } from '@xstate/store/react'

interface VisualizationPanelProps {
  isOpen: boolean
}

const VisualizationForm = () => {
  const collectionRenderId = useSelector(
    dataFinderStore,
    ({ context }) => context.selectedCollectionRender?.id,
  )

  const collectionRenderOptions = useSelector(
    dataFinderStore,
    (state) => state.context.collectionRenderOptions,
  )

  // Map options to dropdown format
  const rendersOptions = collectionRenderOptions.map(({ id: renderId, title }) => ({
    value: renderId,
    label: title ?? renderId,
  }))

  return (
    <Form
      className={styles.reactJsonSchemaForm}
      schema={{
        type: 'object',
        required: ['collectionRenderId'],
        properties: {
          collectionRenderId: {
            type: 'string',
            title: 'Select a render',
            enum: rendersOptions.map((option) => option.value),
          },
        },
      }}
      formData={{ collectionRenderId }}
      validator={validator}
      uiSchema={{
        'ui:submitButtonOptions': {
          norender: true,
        },
        collectionRenderId: {},
      }}
      onChange={(e: IChangeEvent) => {
        dataFinderStore.send({
          type: 'onCollectionRenderIdChange',
          collectionRenderId: e.formData.collectionRenderId,
        })
      }}
    ></Form>
  )
}

export const VisualizationPanel: React.FC<VisualizationPanelProps> = ({ isOpen }) => {
  return (
    <Flex
      direction="column"
      justify="between"
      p="4"
      className={`${styles.visualizationPanel} ${isOpen ? styles['visualizationPanel--open'] : ''}`}
    >
      <Flex direction="column" gap="6">
        <Flex justify="end">
          <IconButton
            size="2"
            variant="ghost"
            onClick={() =>
              dataFinderStore.send({
                type: 'setSecondaryPanel',
                panel: undefined,
              })
            }
          >
            <Cross1Icon />
          </IconButton>
        </Flex>
        <VisualizationForm />
      </Flex>
    </Flex>
  )
}
