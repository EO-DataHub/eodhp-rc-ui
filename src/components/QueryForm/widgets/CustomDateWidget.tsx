import { Flex, Text } from '@radix-ui/themes'
import { WidgetProps } from '@rjsf/utils'
import { CalendarIcon } from '@radix-ui/react-icons'

//MUI imports
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'

export const CustomDateWidget = ({ schema, value, onChange }: WidgetProps) => {
  const handleDateChange = (date: Date | null) => {
    if (date) {
      onChange(date.toISOString().split('T')[0])
    }
  }

  return (
    <Flex direction="column" gap="2" mt="5">
      <Text weight="bold" size="2">
        {schema.title ?? 'Select a date'}
      </Text>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <DatePicker
          value={value ? new Date(value) : null}
          onChange={handleDateChange}
          slots={{
            openPickerIcon: () => <CalendarIcon />,
          }}
          //Radix doesn’t have a DatePicker component, so we modified the visual aspects of the MUI DatePicker directly.
          sx={{
            '& .MuiInputBase-root': {
              height: '32px',
            },
            '.MuiOutlinedInput-input': {
              fontSize: '14px',
            },
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: '#b3b3b3',
              },
              '&:hover fieldset': {
                borderColor: '#999999',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#999999',
              },
            },
          }}
        />
      </LocalizationProvider>
    </Flex>
  )
}
