import { render, screen } from '@testing-library/react'
import { AvailabilityDropdown } from '@/components/availability-dropdown'
import userEvent from '@testing-library/user-event'

// Mock the i18n translation hook
jest.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => key, // Return the key as the translation
  }),
}))

describe('AvailabilityDropdown', () => {
  const defaultProps = {
    value: 'available' as const,
    onValueChange: jest.fn(),
    locale: 'en' as const,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<AvailabilityDropdown {...defaultProps} />)
    expect(screen.getByRole('combobox')).toBeTruthy()
  })

  it('displays the correct status icon and text', () => {
    render(<AvailabilityDropdown {...defaultProps} />)
    const trigger = screen.getByRole('combobox')
    expect(trigger.textContent).toContain('🟢')
    expect(trigger.textContent).toContain('status.available')
  })

  it('shows only icon for small size', () => {
    render(<AvailabilityDropdown {...defaultProps} size="sm" />)
    const trigger = screen.getByRole('combobox')
    expect(trigger.textContent).toContain('🟢')
    expect(trigger.textContent).not.toContain('status.available')
  })

  it('handles value changes', async () => {
    const onValueChange = jest.fn()
    const user = userEvent.setup()
    
    render(<AvailabilityDropdown {...defaultProps} onValueChange={onValueChange} />)
    
    await user.click(screen.getByRole('combobox'))
    
    // The dropdown should open and show options
    const options = screen.getAllByRole('option')
    expect(options.length).toBeGreaterThan(0)
  })

  it('can be disabled', () => {
    render(<AvailabilityDropdown {...defaultProps} disabled />)
    const trigger = screen.getByRole('combobox')
    expect(trigger.getAttribute('aria-disabled')).toBe('true')
  })
})