import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { supabase } from '@/lib/supabase'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: jest.fn(),
    },
  },
}))

describe('ForgotPasswordForm', () => {
  const mockOnClose = jest.fn()
  const mockOnSwitchToLogin = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders forgot password form', () => {
    render(
      <ForgotPasswordForm
        onClose={mockOnClose}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    )

    expect(screen.getByText('Reset Password')).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument()
  })

  it('shows back to login link', () => {
    render(
      <ForgotPasswordForm
        onClose={mockOnClose}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    )

    const backToLoginButton = screen.getByRole('button', { name: /back to login/i })
    expect(backToLoginButton).toBeInTheDocument()
  })

  it('calls onSwitchToLogin when back to login link is clicked', () => {
    render(
      <ForgotPasswordForm
        onClose={mockOnClose}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    )

    const backToLoginButton = screen.getByRole('button', { name: /back to login/i })
    fireEvent.click(backToLoginButton)

    expect(mockOnSwitchToLogin).toHaveBeenCalledTimes(1)
  })

  it('submits form with email', async () => {
    const mockResetPassword = jest.fn().mockResolvedValue({
      data: {},
      error: null,
    })
    ;(supabase.auth.resetPasswordForEmail as jest.Mock) = mockResetPassword

    render(
      <ForgotPasswordForm
        onClose={mockOnClose}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    )

    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /send reset link/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('test@example.com', {
        redirectTo: expect.stringMatching(/\/auth\/reset-password$/),
      })
    })
  })

  it('displays success message after sending reset link', async () => {
    const mockResetPassword = jest.fn().mockResolvedValue({
      data: {},
      error: null,
    })
    ;(supabase.auth.resetPasswordForEmail as jest.Mock) = mockResetPassword

    render(
      <ForgotPasswordForm
        onClose={mockOnClose}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    )

    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /send reset link/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/password reset link sent to your email/i)).toBeInTheDocument()
    })
  })

  it('displays error message on failure', async () => {
    const mockResetPassword = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'Email not found' },
    })
    ;(supabase.auth.resetPasswordForEmail as jest.Mock) = mockResetPassword

    render(
      <ForgotPasswordForm
        onClose={mockOnClose}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    )

    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /send reset link/i })

    fireEvent.change(emailInput, { target: { value: 'notfound@example.com' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Email not found')).toBeInTheDocument()
    })
  })

  it('clears email input after successful submission', async () => {
    const mockResetPassword = jest.fn().mockResolvedValue({
      data: {},
      error: null,
    })
    ;(supabase.auth.resetPasswordForEmail as jest.Mock) = mockResetPassword

    render(
      <ForgotPasswordForm
        onClose={mockOnClose}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    )

    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement
    const submitButton = screen.getByRole('button', { name: /send reset link/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(emailInput.value).toBe('')
    })
  })

  it('disables submit button while loading', async () => {
    const mockResetPassword = jest.fn().mockImplementation(() => new Promise(() => {}))
    ;(supabase.auth.resetPasswordForEmail as jest.Mock) = mockResetPassword

    render(
      <ForgotPasswordForm
        onClose={mockOnClose}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    )

    const emailInput = screen.getByLabelText(/email/i)
    const submitButton = screen.getByRole('button', { name: /send reset link/i })

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(submitButton).toBeDisabled()
    })
  })
})
