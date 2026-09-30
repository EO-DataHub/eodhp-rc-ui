import { Badge, Flex, Select, Switch, Text, TextField } from '@radix-ui/themes'
import type { WorkflowInput } from '../demoTypes'
import type { HubValue, UserValues } from '../launchValues'
import { HUB_TYPES } from '../hubTypes'
import styles from './demo.module.scss'

interface LaunchInputsProps {
  inputs: WorkflowInput[]
  hubValue: (input: WorkflowInput) => HubValue
  values: UserValues
  onChange?: (id: string, value: string | number | boolean) => void
  /** Preview mode: controls are shown but can't be changed. */
  readOnly?: boolean
}

const UserControl = ({
  input,
  value,
  onChange,
  readOnly,
}: {
  input: WorkflowInput
  value: string | number | boolean | undefined
  onChange?: (value: string | number | boolean) => void
  readOnly?: boolean
}) => {
  if (input.cwlType === 'boolean') {
    return (
      <Switch
        checked={Boolean(value)}
        disabled={readOnly}
        onCheckedChange={(checked) => onChange?.(checked)}
      />
    )
  }
  if (input.cwlType === 'enum' && input.choices?.length) {
    return (
      <Select.Root
        value={String(value ?? '')}
        disabled={readOnly}
        onValueChange={(v) => onChange?.(v)}
      >
        <Select.Trigger placeholder="Choose…" />
        <Select.Content>
          {input.choices.map((choice) => (
            <Select.Item key={choice} value={choice}>
              {choice}
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    )
  }
  const isNumber = ['int', 'long', 'float', 'double'].includes(input.cwlType)
  return (
    <TextField.Root
      type={isNumber ? 'number' : 'text'}
      value={value === undefined ? '' : String(value)}
      disabled={readOnly}
      placeholder={input.optional ? 'Optional' : undefined}
      onChange={(e) => onChange?.(isNumber ? Number(e.target.value) : e.target.value)}
    />
  )
}

export const LaunchInputs = ({
  inputs,
  hubValue,
  values,
  onChange,
  readOnly,
}: LaunchInputsProps) => {
  const hubInputs = inputs.filter((i) => i.source.kind === 'hub')
  const userInputs = inputs.filter((i) => i.source.kind === 'user')

  return (
    <Flex direction="column" gap="4">
      {hubInputs.length > 0 && (
        <Flex direction="column" gap="2">
          <Text size="2" weight="bold" color="gray">
            Filled in by the Hub
          </Text>
          {hubInputs.map((input) => {
            const value = hubValue(input)
            const hubType = input.source.kind === 'hub' ? input.source.hubType : undefined
            return (
              <Flex
                key={input.id}
                className={`${styles.hubRow} ${value.missing ? styles.hubRowMissing : ''}`}
                direction="column"
                gap="1"
              >
                <Flex align="center" gap="2" wrap="wrap">
                  <Text size="2" weight="medium">
                    {input.label}
                  </Text>
                  {hubType && (
                    <Badge color="blue" variant="soft" size="1">
                      {HUB_TYPES[hubType].label}
                    </Badge>
                  )}
                  {input.optional && (
                    <Text size="1" color="gray">
                      optional
                    </Text>
                  )}
                </Flex>
                <Text size="2" color={value.missing ? 'red' : 'gray'}>
                  {value.text}
                </Text>
              </Flex>
            )
          })}
        </Flex>
      )}

      {userInputs.length > 0 && (
        <Flex direction="column" gap="3">
          <Text size="2" weight="bold" color="gray">
            You choose
          </Text>
          {userInputs.map((input) => (
            <Flex key={input.id} direction="column" gap="1">
              <Text as="label" size="2" weight="medium">
                {input.label}
                {input.optional && (
                  <Text size="1" color="gray" weight="regular">
                    {' '}
                    optional
                  </Text>
                )}
              </Text>
              <UserControl
                input={input}
                value={values[input.id]}
                readOnly={readOnly}
                onChange={(value) => onChange?.(input.id, value)}
              />
              {input.helpText && (
                <Text size="1" color="gray">
                  {input.helpText}
                </Text>
              )}
            </Flex>
          ))}
        </Flex>
      )}
    </Flex>
  )
}
