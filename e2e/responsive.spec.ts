import { test, expect } from '@playwright/test'

test.describe('Responsive Design Tests', () => {
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1920, height: 1080 },
  ]

  viewports.forEach(({ name, width, height }) => {
    test(`should display correctly on ${name} (${width}x${height})`, async ({ page }) => {
      await page.setViewportSize({ width, height })
      await page.goto('/')
      
      // Take a screenshot for visual comparison
      await expect(page).toHaveScreenshot(`homepage-${name.toLowerCase()}.png`)
      
      // Check basic layout
      await expect(page.locator('body')).toBeVisible()
      await expect(page.locator('main')).toBeVisible()
      
      // On mobile/tablet, ensure content is not horizontally scrollable
      if (width <= 768) {
        const bodyWidth = await page.locator('body').evaluate(el => el.scrollWidth)
        expect(bodyWidth).toBeLessThanOrEqual(width + 10) // Allow 10px tolerance
      }
    })
  })

  test('mobile hamburger menu functionality', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    // Check if hamburger menu is present on mobile
    const hamburgerButton = page.locator('button').filter({ hasText: /menu|hamburger/i }).first()
    
    if (await hamburgerButton.count() > 0) {
      await hamburgerButton.click()
      
      // Verify menu opens
      const menu = page.locator('[role="dialog"], [role="menu"]')
      await expect(menu).toBeVisible()
      
      // Close menu (click outside or close button)
      await page.keyboard.press('Escape')
      await expect(menu).not.toBeVisible()
    }
  })

  test('responsive calendar layout', async ({ page }) => {
    await page.goto('/team/test-team') // Adjust URL as needed
    
    // Test mobile calendar layout
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Check if mobile-specific elements are visible
    const mobileCalendar = page.locator('.md\\:hidden')
    if (await mobileCalendar.count() > 0) {
      await expect(mobileCalendar.first()).toBeVisible()
    }
    
    // Test desktop calendar layout
    await page.setViewportSize({ width: 1920, height: 1080 })
    
    // Check if desktop-specific elements are visible
    const desktopCalendar = page.locator('.hidden.md\\:block')
    if (await desktopCalendar.count() > 0) {
      await expect(desktopCalendar.first()).toBeVisible()
    }
  })
})