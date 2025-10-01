# 🎨 AvPlanner Theme System

AvPlanner now includes a comprehensive theme system with both traditional and seasonal themes.

## Available Themes

### Standard Themes
- **System** - Follows your device's preference
- **Light** - Clean and bright interface 
- **Dark** - Easy on the eyes

### Seasonal Themes 🌿
- **Autumn** - Warm fall colors with orange and brown tones
- **Winter** - Cool palette with blue and silver tones  
- **Spring** - Fresh colors with green and light tones
- **Summer** - Bright palette with yellow and warm tones

## How to Use

### In the Application
1. Open any calendar view
2. Click the Settings (⚙️) dropdown
3. Select your preferred theme from the Theme section

### Theme Demo
Visit `/theme-demo` to preview all themes side by side and switch between them instantly.

## Technical Implementation

### CSS Variables Structure
Each theme uses the same CSS variable structure for consistency:

```css
.theme-name {
  --background: [hue] [saturation]% [lightness]%;
  --foreground: [hue] [saturation]% [lightness]%;
  --primary: [hue] [saturation]% [lightness]%;
  /* ... all other variables follow same pattern */
}
```

### Color Palettes

#### Autumn Theme 🍂
- Base colors: Orange (#D97706), Brown (#92400E), Amber (#F59E0B)
- Warm, cozy feeling with earth tones
- Perfect for fall season

#### Winter Theme ❄️  
- Base colors: Blue (#3B82F6), Steel Blue (#1E40AF), Silver (#6B7280)
- Cool, crisp feeling with blue tones
- Evokes winter atmosphere

#### Spring Theme 🌸
- Base colors: Green (#10B981), Light Green (#34D399), Fresh Green (#059669)  
- Fresh, vibrant feeling with nature tones
- Perfect for renewal and growth

#### Summer Theme ☀️
- Base colors: Yellow (#EAB308), Bright Yellow (#FACC15), Orange (#F97316)
- Bright, energetic feeling with sun tones
- Evokes summer warmth and energy

### Creative Themes 🎨

#### Cozy Theme 🏠
- Base colors: Warm Brown (#8B5A2B), Cream (#F5F5DC), Soft Amber (#D2B48C)
- Comfortable, homey feeling with earth tones
- Perfect for creating a welcoming, lived-in atmosphere

#### Black & White Theme ⚫⚪
- Base colors: Pure Black (#000000), Pure White (#FFFFFF), Various Grays
- Clean, minimalist feeling with monochrome design
- Classic elegance with high contrast and clarity

#### By the Stove Theme 🔥
- Base colors: Deep Red (#B91C1C), Burnt Orange (#EA580C), Warm Copper (#CD853F)
- Intimate, warm feeling with fireplace tones
- Evokes cozy evenings by a crackling fire

## Files Modified

- `app/globals.css` - Added CSS variables for new themes
- `components/settings-dropdown.tsx` - Extended theme selector
- `app/layout.tsx` - Updated ThemeProvider configuration  
- `app/theme-demo/page.tsx` - New demo page

## Consistency

All themes maintain the same:
- Component structure and behavior
- CSS variable naming convention
- Accessibility standards
- Responsive design principles

The seasonal themes are designed to provide visual variety while maintaining excellent readability and user experience across all interface elements.