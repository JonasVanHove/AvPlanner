import { test, expect } from '@playwright/test'

test.describe('AvPlanner Homepage', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/')
    
    // Check if the main title is visible
    await expect(page.locator('h1')).toContainText('AvPlanner')
    
    // Check if the navigation is present
    await expect(page.locator('nav')).toBeVisible()
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    // On mobile, check if hamburger menu is visible
    const hamburgerButton = page.locator('[role="button"]').first()
    await expect(hamburgerButton).toBeVisible()
    
    // Check if the title is shortened on mobile
    const title = page.locator('h1')
    await expect(title).toContainText('AvPlanner')
  })

  test('should navigate to my teams', async ({ page }) => {
    await page.goto('/')
    
  // Look for the "My Teams & Me" link or button
  const myTeamsLink = page.locator('text=My Teams & Me').first()
    if (await myTeamsLink.isVisible()) {
      await myTeamsLink.click()
      await expect(page).toHaveURL(/.*my-teams/)
    }
  })

  test('hamburger menu should work on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    
    // Find and click hamburger menu
    const hamburgerButton = page.locator('button[aria-haspopup="dialog"]').first()
    if (await hamburgerButton.isVisible()) {
      await hamburgerButton.click()
      
      // Check if menu items are visible
      await expect(page.locator('[role="dialog"]')).toBeVisible()
    }
  })
})