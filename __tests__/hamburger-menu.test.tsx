import { render, screen } from '@testing-library/react'
import { HamburgerMenu, HamburgerMenuItem } from '@/components/ui/hamburger-menu'
import userEvent from '@testing-library/user-event'

describe('HamburgerMenu', () => {
  it('renders the hamburger menu button', () => {
    render(
      <HamburgerMenu title="Test Menu">
        <HamburgerMenuItem>Test Item</HamburgerMenuItem>
      </HamburgerMenu>
    )
    
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('opens menu when clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <HamburgerMenu title="Test Menu">
        <HamburgerMenuItem>Test Item</HamburgerMenuItem>
      </HamburgerMenu>
    )
    
    await user.click(screen.getByRole('button'))
    expect(screen.getByText('Test Menu')).toBeInTheDocument()
    expect(screen.getByText('Test Item')).toBeInTheDocument()
  })

  it('renders multiple menu items', async () => {
    const user = userEvent.setup()
    
    render(
      <HamburgerMenu title="Test Menu">
        <HamburgerMenuItem>Item 1</HamburgerMenuItem>
        <HamburgerMenuItem>Item 2</HamburgerMenuItem>
        <HamburgerMenuItem>Item 3</HamburgerMenuItem>
      </HamburgerMenu>
    )
    
    await user.click(screen.getByRole('button'))
    
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
    expect(screen.getByText('Item 3')).toBeInTheDocument()
  })
})