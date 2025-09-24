import { useRef, useEffect } from 'react'

interface SwipeHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
}

interface SwipeOptions {
  threshold?: number // Minimum distance for a swipe (default: 50)
  velocity?: number  // Minimum velocity for a swipe (default: 0.3)
}

export function useSwipe(handlers: SwipeHandlers, options: SwipeOptions = {}) {
  const { threshold = 50, velocity = 0.3 } = options
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const elementRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return

      const touch = e.changedTouches[0]
      const deltaX = touch.clientX - touchStartRef.current.x
      const deltaY = touch.clientY - touchStartRef.current.y
      const deltaTime = Date.now() - touchStartRef.current.time
      
      // Calculate velocity (distance / time)
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      const swipeVelocity = distance / deltaTime

      // Check if swipe meets minimum requirements
      if (distance < threshold || swipeVelocity < velocity) {
        touchStartRef.current = null
        return
      }

      // Determine swipe direction
      const absDeltaX = Math.abs(deltaX)
      const absDeltaY = Math.abs(deltaY)

      // Only handle horizontal swipes, let vertical swipes pass through for scrolling
      if (absDeltaX > absDeltaY && absDeltaX > threshold) {
        // This is primarily a horizontal swipe
        if (deltaX > 0) {
          handlers.onSwipeRight?.()
        } else {
          handlers.onSwipeLeft?.()
        }
      } else if (absDeltaY > absDeltaX && absDeltaY > threshold) {
        // This is primarily a vertical swipe - only call handlers if they exist
        if (deltaY > 0) {
          handlers.onSwipeDown?.()
        } else {
          handlers.onSwipeUp?.()
        }
      }

      touchStartRef.current = null
    }

    const handleTouchMove = (e: TouchEvent) => {
      // Only prevent default for horizontal swipes, allow vertical scrolling
      if (touchStartRef.current) {
        const touch = e.touches[0]
        const deltaX = Math.abs(touch.clientX - touchStartRef.current.x)
        const deltaY = Math.abs(touch.clientY - touchStartRef.current.y)
        
        // If movement is primarily horizontal and significant, prevent default
        if (deltaX > deltaY && deltaX > 10) {
          e.preventDefault()
        }
        // Otherwise, let the browser handle vertical scrolling naturally
      }
    }

    // Add event listeners with passive: false to allow preventDefault
    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: false })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchmove', handleTouchMove)
    }
  }, [handlers, threshold, velocity])

  return elementRef
}