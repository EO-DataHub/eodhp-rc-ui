import { fireEvent, render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the App component', () => {
    render(<App />)

    expect(screen.getByText('Vite + React')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'count is 0' }))

    expect(
      screen.getByRole('button', { name: 'count is 1' }),
    ).toBeInTheDocument()
  })
})
