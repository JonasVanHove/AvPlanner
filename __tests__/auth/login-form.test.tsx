import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LoginForm } from '@/components/auth/login-form'
import { supabase } from '@/lib/supabase'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
    },
  },
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}))

describe('LoginForm', () => {
  const mockOnClose = jest.fn()
  const mockOnSwitchToRegister = jest.fn()
  const mockOnSwitchToForgotPassword = jest.fn()
  const originalLocation = window.location

  beforeAll(() => {
    // Mock window.location.reload before all tests
    delete (window as any).location
    ;(window as any).location = { 
      reload: jest.fn() 
    }
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    // Restore original location
    window.location = originalLocation
  })

  it('renders login form with all fields', () => {
    render(
      <LoginForm
        onClose={mockOnClose}
        onSwitchToRegister={mockOnSwitchToRegister}
        onSwitchToForgotPassword={mockOnSwitchToForgotPassword}
      />
    )

    expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
  })

  it('shows switch to register link', () => {
    render(
      <LoginForm
        onClose={mockOnClose}
        onSwitchToRegister={mockOnSwitchToRegister}
        onSwitchToForgotPassword={mockOnSwitchToForgotPassword}
      />
    )

    const signUpButton = screen.getByRole('button', { name: /sign up/i })
    expect(signUpButton).toBeInTheDocument()
  })

  it('shows forgot password link', () => {
    render(
      <LoginForm
        onClose={mockOnClose}
        onSwitchToRegister={mockOnSwitchToRegister}
        onSwitchToForgotPassword={mockOnSwitchToForgotPassword}
      />
    )

    const forgotPasswordButton = screen.getByRole('button', { name: /forgot your password/i })
    expect(forgotPasswordButton).toBeInTheDocument()
  })

  it('calls onSwitchToRegister when sign up link is clicked', () => {
    render(
      <LoginForm
        onClose={mockOnClose}
        onSwitchToRegister={mockOnSwitchToRegister}
        onSwitchToForgotPassword={mockOnSwitchToForgotPassword}
      />
    )

    const signUpButton = screen.getByRole('button', { name: /sign up/i })
    fireEvent.click(signUpButton)

    expect(mockOnSwitchToRegister).toHaveBeenCalledTimes(1)
  })

  it('calls onSwitchToForgotPassword when forgot password link is clicked', () => {
    render(
      <LoginForm
        onClose={mockOnClose}
        onSwitchToRegister={mockOnSwitchToRegister}
        onSwitchToForgotPassword={mockOnSwitchToForgotPassword}
      />
    )

    const forgotPasswordButton = screen.getByRole('button', { name: /forgot your password/i })
    fireEvent.click(forgotPasswordButton)

    expect(mockOnSwitchToForgotPassword).toHaveBeenCalledTimes(1)
  })

  it('submits form with email and password', async () => {
    const mockSignIn = jest.fn().mockResolvedValue({
      data: { user: { id: '123', email: 'test@example.com' } },
      error: null,
    })
    ;(supabase.auth.signInWithPassword as jest.Mock) = mockSignIn

    render(
      <LoginForm
        onClose={mockOnClose}
        onSwitchToRegister={mockOnSwitchToRegister}
        onSwitchToForgotPassword={mockOnSwitchToForgotPassword}
      />
    )

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /^login$/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })

  it('displays error message on login failure', async () => {
    const mockSignIn = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'Invalid credentials' },
    })
    ;(supabase.auth.signInWithPassword as jest.Mock) = mockSignIn

    render(
      <LoginForm
        onClose={mockOnClose}
        onSwitchToRegister={mockOnSwitchToRegister}
        onSwitchToForgotPassword={mockOnSwitchToForgotPassword}
      />
    )

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /^login$/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })
  })

  it('disables submit button while loading', async () => {
    const mockSignIn = jest.fn().mockImplementation(() => new Promise(() => {}))
    ;(supabase.auth.signInWithPassword as jest.Mock) = mockSignIn

    render(
      <LoginForm
        onClose={mockOnClose}
        onSwitchToRegister={mockOnSwitchToRegister}
        onSwitchToForgotPassword={mockOnSwitchToForgotPassword}
      />
    )

    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /^login$/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(submitButton).toBeDisabled()
    })
  })
})
