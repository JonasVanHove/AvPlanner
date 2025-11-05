import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AuthDialog, LoginButton, RegisterButton } from '@/components/auth/auth-dialog'

// Mock the form components
jest.mock('@/components/auth/login-form', () => ({
  LoginForm: ({ onSwitchToRegister, onSwitchToForgotPassword }: any) => (
    <div>
      <div>Login Form</div>
      <button onClick={onSwitchToRegister}>Switch to Register</button>
      <button onClick={onSwitchToForgotPassword}>Switch to Forgot Password</button>
    </div>
  ),
}))

jest.mock('@/components/auth/register-form', () => ({
  RegisterForm: ({ onSwitchToLogin }: any) => (
    <div>
      <div>Register Form</div>
      <button onClick={onSwitchToLogin}>Switch to Login</button>
    </div>
  ),
}))

jest.mock('@/components/auth/forgot-password-form', () => ({
  ForgotPasswordForm: ({ onSwitchToLogin }: any) => (
    <div>
      <div>Forgot Password Form</div>
      <button onClick={onSwitchToLogin}>Switch to Login</button>
    </div>
  ),
}))

describe('AuthDialog', () => {
  it('renders with default login mode', () => {
    render(<AuthDialog />)
    
    const trigger = screen.getByRole('button', { name: /login/i })
    expect(trigger).toBeInTheDocument()
  })

  it('opens dialog when trigger is clicked', async () => {
    render(<AuthDialog />)
    
    const trigger = screen.getByRole('button', { name: /login/i })
    fireEvent.click(trigger)

    await waitFor(() => {
      expect(screen.getByText('Login Form')).toBeInTheDocument()
    })
  })

  it('switches from login to register mode', async () => {
    render(<AuthDialog mode="login" />)
    
    const trigger = screen.getByRole('button', { name: /login/i })
    fireEvent.click(trigger)

    await waitFor(() => {
      expect(screen.getByText('Login Form')).toBeInTheDocument()
    })

    const switchToRegisterButton = screen.getByRole('button', { name: /switch to register/i })
    fireEvent.click(switchToRegisterButton)

    await waitFor(() => {
      expect(screen.getByText('Register Form')).toBeInTheDocument()
    })
  })

  it('switches from login to forgot password mode', async () => {
    render(<AuthDialog mode="login" />)
    
    const trigger = screen.getByRole('button', { name: /login/i })
    fireEvent.click(trigger)

    await waitFor(() => {
      expect(screen.getByText('Login Form')).toBeInTheDocument()
    })

    const switchToForgotPasswordButton = screen.getByRole('button', { name: /switch to forgot password/i })
    fireEvent.click(switchToForgotPasswordButton)

    await waitFor(() => {
      expect(screen.getByText('Forgot Password Form')).toBeInTheDocument()
    })
  })

  it('switches from register to login mode', async () => {
    render(<AuthDialog mode="register" />)
    
    const trigger = screen.getByRole('button', { name: /login/i })
    fireEvent.click(trigger)

    await waitFor(() => {
      expect(screen.getByText('Register Form')).toBeInTheDocument()
    })

    const switchToLoginButton = screen.getByRole('button', { name: /switch to login/i })
    fireEvent.click(switchToLoginButton)

    await waitFor(() => {
      expect(screen.getByText('Login Form')).toBeInTheDocument()
    })
  })

  it('switches from forgot password to login mode', async () => {
    render(<AuthDialog mode="forgot-password" />)
    
    const trigger = screen.getByRole('button', { name: /login/i })
    fireEvent.click(trigger)

    await waitFor(() => {
      expect(screen.getByText('Forgot Password Form')).toBeInTheDocument()
    })

    const switchToLoginButton = screen.getByRole('button', { name: /switch to login/i })
    fireEvent.click(switchToLoginButton)

    await waitFor(() => {
      expect(screen.getByText('Login Form')).toBeInTheDocument()
    })
  })

  it('resets to initial mode when dialog is closed and reopened', async () => {
    render(<AuthDialog mode="login" />)
    
    // Open dialog
    const trigger = screen.getByRole('button', { name: /login/i })
    fireEvent.click(trigger)

    await waitFor(() => {
      expect(screen.getByText('Login Form')).toBeInTheDocument()
    })

    // Switch to register
    const switchToRegisterButton = screen.getByRole('button', { name: /switch to register/i })
    fireEvent.click(switchToRegisterButton)

    await waitFor(() => {
      expect(screen.getByText('Register Form')).toBeInTheDocument()
    })

    // Close dialog (simulate by pressing escape or clicking outside)
    fireEvent.keyDown(document, { key: 'Escape' })

    // Reopen dialog
    fireEvent.click(trigger)

    // Should show login form again (initial mode)
    await waitFor(() => {
      expect(screen.getByText('Login Form')).toBeInTheDocument()
    })
  })
})

describe('LoginButton', () => {
  it('renders login button with correct styling', () => {
    render(<LoginButton />)
    
    const button = screen.getByRole('button', { name: /login/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('flex', 'items-center', 'gap-2')
  })

  it('opens dialog in login mode when clicked', async () => {
    render(<LoginButton />)
    
    const button = screen.getByRole('button', { name: /login/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Login Form')).toBeInTheDocument()
    })
  })
})

describe('RegisterButton', () => {
  it('renders register button with correct styling', () => {
    render(<RegisterButton />)
    
    const button = screen.getByRole('button', { name: /sign up/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('flex', 'items-center', 'gap-2')
  })

  it('opens dialog in register mode when clicked', async () => {
    render(<RegisterButton />)
    
    const button = screen.getByRole('button', { name: /sign up/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Register Form')).toBeInTheDocument()
    })
  })
})
