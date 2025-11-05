import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { RegisterForm } from '@/components/auth/register-form'
import { supabase } from '@/lib/supabase'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
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

describe('RegisterForm', () => {
  const mockOnClose = jest.fn()
  const mockOnSwitchToLogin = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders register form with all fields', () => {
    render(
      <RegisterForm
        onClose={mockOnClose}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    )

    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument()
    expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
  })

  it('shows switch to login link', () => {
    render(
      <RegisterForm
        onClose={mockOnClose}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    )

    const loginButton = screen.getByRole('button', { name: /sign in/i })
    expect(loginButton).toBeInTheDocument()
  })

  it('calls onSwitchToLogin when login link is clicked', () => {
    render(
      <RegisterForm
        onClose={mockOnClose}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    )

    const loginButton = screen.getByRole('button', { name: /sign in/i })
    fireEvent.click(loginButton)

    expect(mockOnSwitchToLogin).toHaveBeenCalledTimes(1)
  })

  it('validates password match', async () => {
    render(
      <RegisterForm
        onClose={mockOnClose}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    )

    const firstNameInput = screen.getByLabelText(/first name/i)
    const lastNameInput = screen.getByLabelText(/last name/i)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)

    fireEvent.change(firstNameInput, { target: { value: 'John' } })
    fireEvent.change(lastNameInput, { target: { value: 'Doe' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password456' } })
    
    const form = screen.getByRole('button', { name: /create account/i }).closest('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
    })
  })

  it('validates password length', async () => {
    render(
      <RegisterForm
        onClose={mockOnClose}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    )

    const firstNameInput = screen.getByLabelText(/first name/i)
    const lastNameInput = screen.getByLabelText(/last name/i)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)

    fireEvent.change(firstNameInput, { target: { value: 'John' } })
    fireEvent.change(lastNameInput, { target: { value: 'Doe' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: '12345' } })
    fireEvent.change(confirmPasswordInput, { target: { value: '12345' } })
    
    const form = screen.getByRole('button', { name: /create account/i }).closest('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument()
    })
  })

  it('submits form with valid data', async () => {
    const mockSignUp = jest.fn().mockResolvedValue({
      data: { 
        user: { id: '123', email: 'test@example.com' },
        session: null,
      },
      error: null,
    })
    ;(supabase.auth.signUp as jest.Mock) = mockSignUp

    render(
      <RegisterForm
        onClose={mockOnClose}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    )

    const firstNameInput = screen.getByLabelText(/first name/i)
    const lastNameInput = screen.getByLabelText(/last name/i)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })

    fireEvent.change(firstNameInput, { target: { value: 'John' } })
    fireEvent.change(lastNameInput, { target: { value: 'Doe' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        options: {
          data: {
            first_name: 'John',
            last_name: 'Doe',
          },
        },
      })
    })
  })

  it('displays error message on registration failure', async () => {
    const mockSignUp = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'Email already exists' },
    })
    ;(supabase.auth.signUp as jest.Mock) = mockSignUp

    render(
      <RegisterForm
        onClose={mockOnClose}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    )

    const firstNameInput = screen.getByLabelText(/first name/i)
    const lastNameInput = screen.getByLabelText(/last name/i)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })

    fireEvent.change(firstNameInput, { target: { value: 'John' } })
    fireEvent.change(lastNameInput, { target: { value: 'Doe' } })
    fireEvent.change(emailInput, { target: { value: 'existing@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeInTheDocument()
    })
  })

  it('disables submit button while loading', async () => {
    const mockSignUp = jest.fn().mockImplementation(() => new Promise(() => {}))
    ;(supabase.auth.signUp as jest.Mock) = mockSignUp

    render(
      <RegisterForm
        onClose={mockOnClose}
        onSwitchToLogin={mockOnSwitchToLogin}
      />
    )

    const firstNameInput = screen.getByLabelText(/first name/i)
    const lastNameInput = screen.getByLabelText(/last name/i)
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/^password$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
    const submitButton = screen.getByRole('button', { name: /create account/i })

    fireEvent.change(firstNameInput, { target: { value: 'John' } })
    fireEvent.change(lastNameInput, { target: { value: 'Doe' } })
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)

    await waitFor(() => {
      expect(submitButton).toBeDisabled()
    })
  })
})
