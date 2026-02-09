import '@testing-library/jest-dom'
import React from 'react'

// Flag test environment for components that opt into simplified render paths
// @ts-ignore
window.__TEST__ = true

// Mock window.location to avoid jsdom navigation errors
try {
  const base = new URL('http://localhost/')
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      href: base.href,
      origin: base.origin,
      pathname: base.pathname,
      search: base.search,
      hash: base.hash,
      assign: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
    },
  })
} catch {}

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: '',
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    }
  },
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock window.matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Polyfill PointerEvent and capture methods used by Radix in jsdom
if (!('PointerEvent' in window)) {
  class PointerEventPolyfill extends MouseEvent {}
  // @ts-ignore
  window.PointerEvent = PointerEventPolyfill
}

if (!HTMLElement.prototype.hasPointerCapture) {
  // @ts-ignore
  HTMLElement.prototype.hasPointerCapture = function () { return false }
}

if (!HTMLElement.prototype.setPointerCapture) {
  // @ts-ignore
  HTMLElement.prototype.setPointerCapture = function () {}
}

if (!HTMLElement.prototype.releasePointerCapture) {
  // @ts-ignore
  HTMLElement.prototype.releasePointerCapture = function () {}
}

// Ensure document has required event listeners for pointer events
if (!document.addEventListener) {
  // @ts-ignore
  document.addEventListener = () => {}
}

// Polyfill Element.scrollIntoView in jsdom
if (!Element.prototype.scrollIntoView) {
  // @ts-ignore
  Element.prototype.scrollIntoView = function () {}
}

// Also define on HTMLElement with a jest mock for better Jest integration
try {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: jest.fn(),
  })
} catch {}

// Fallbacks on broader prototypes used by testing-library/user-event
if (!(/** @type any */(Node.prototype)).scrollIntoView) {
  // @ts-ignore
  Node.prototype.scrollIntoView = function () {}
}
if (!(/** @type any */(Document.prototype)).scrollIntoView) {
  // @ts-ignore
  Document.prototype.scrollIntoView = function () {}
}

// Last-resort polyfill to guard against unexpected node types
try {
  if (!Object.prototype.hasOwnProperty.call(Object.prototype, 'scrollIntoView')) {
    Object.defineProperty(Object.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: function () {}
    })
  }
} catch {}

// Lightweight mock for Radix Select to make interactions testable in jsdom
jest.mock('@radix-ui/react-select', () => {
  const React = require('react')
  const Ctx = React.createContext(null)

  function Root({ children, value, disabled, onValueChange }) {
    const [open, setOpen] = React.useState(false)
    const [val, setVal] = React.useState(value)
    const ctx = React.useMemo(() => ({
      open,
      setOpen,
      value: val,
      disabled: !!disabled,
      onValueChange: (v) => {
        setVal(v)
        onValueChange && onValueChange(v)
      }
    }), [open, val, disabled, onValueChange])
    return React.createElement(Ctx.Provider, { value: ctx }, children)
  }

  function Trigger(props) {
    const ctx = React.useContext(Ctx)
    return React.createElement('button', {
      role: 'combobox',
      'aria-expanded': ctx?.open ? 'true' : 'false',
      'aria-disabled': ctx?.disabled ? 'true' : undefined,
      onClick: () => !ctx?.disabled && ctx?.setOpen && ctx.setOpen(!ctx.open),
      ...props,
    }, props.children)
  }

  function Content(props) {
    const ctx = React.useContext(Ctx)
    if (!ctx?.open) return null
    return React.createElement('div', { role: 'listbox', ...props }, props.children)
  }

  function Item({ value, children, ...rest }) {
    const ctx = React.useContext(Ctx)
    return React.createElement('div', {
      role: 'option',
      'data-value': value,
      onClick: () => { ctx?.onValueChange && ctx.onValueChange(value); ctx?.setOpen && ctx.setOpen(false) },
      ...rest,
    }, children)
  }

  function Value(props) { return React.createElement('span', props, props.children) }
  function Group(props) { return React.createElement('div', props, props.children) }
  function Label(props) { return React.createElement('div', props, props.children) }
  function Separator() { return null }
  function Icon(props) { return React.createElement('span', props, props.children) }
  function Portal(props) { return React.createElement(React.Fragment, null, props.children) }
  function Viewport(props) { return React.createElement('div', props, props.children) }
  function ScrollUpButton(props) { return React.createElement('div', props) }
  function ScrollDownButton(props) { return React.createElement('div', props) }

  return {
    __esModule: true,
    Root,
    Trigger,
    Content,
    Item,
    Value,
    Group,
    Label,
    Separator,
    Icon,
    Portal,
    Viewport,
    ScrollUpButton,
    ScrollDownButton,
  }
})

// Mock our UI Select wrapper used by AvailabilityDropdown to avoid Radix behaviors in tests
jest.mock('@/components/ui/select', () => {
  const React = require('react')
  const Ctx = React.createContext(null)

  function Select({ children, value, disabled, onValueChange }) {
    const [open, setOpen] = React.useState(false)
    const [val, setVal] = React.useState(value)
    const ctx = React.useMemo(() => ({
      open,
      setOpen,
      value: val,
      disabled: !!disabled,
      onValueChange: (v) => { setVal(v); onValueChange && onValueChange(v) },
    }), [open, val, disabled, onValueChange])
    return React.createElement(Ctx.Provider, { value: ctx }, children)
  }

  function SelectTrigger(props) {
    const ctx = React.useContext(Ctx)
    return React.createElement('button', {
      role: 'combobox',
      'aria-expanded': ctx?.open ? 'true' : 'false',
      'aria-disabled': ctx?.disabled ? 'true' : undefined,
      onClick: () => !ctx?.disabled && ctx?.setOpen && ctx.setOpen(!ctx.open),
      ...props,
    }, props.children)
  }

  function SelectContent(props) {
    const ctx = React.useContext(Ctx)
    if (!ctx?.open) return null
    return React.createElement('div', { role: 'listbox', ...props }, props.children)
  }

  function SelectItem({ value, children, ...rest }) {
    const ctx = React.useContext(Ctx)
    return React.createElement('div', {
      role: 'option',
      'data-value': value,
      onClick: () => { ctx?.onValueChange && ctx.onValueChange(value); ctx?.setOpen && ctx.setOpen(false) },
      ...rest,
    }, children)
  }

  function SelectValue(props) { return React.createElement('span', props, props.children) }
  function SelectGroup(props) { return React.createElement('div', props, props.children) }
  function SelectLabel(props) { return React.createElement('div', props, props.children) }
  function SelectSeparator() { return null }
  function SelectScrollUpButton() { return null }
  function SelectScrollDownButton() { return null }

  return {
    __esModule: true,
    Select,
    SelectGroup,
    SelectValue,
    SelectTrigger,
    SelectContent,
    SelectLabel,
    SelectItem,
    SelectSeparator,
    SelectScrollUpButton,
    SelectScrollDownButton,
  }
})