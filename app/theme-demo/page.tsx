"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useTheme } from "next-themes"
import { Monitor, Sun, Moon, Leaf, Snowflake, Flower, Sun as SummerSun, Home, Contrast, Flame, Terminal } from "lucide-react"

export default function ThemeDemo() {
  const { setTheme, theme } = useTheme()
  
  const themes = [
    { 
      name: "System", 
      value: "system", 
      icon: Monitor, 
      description: "Follow your system preference",
      color: "bg-gray-500"
    },
    { 
      name: "Light", 
      value: "light", 
      icon: Sun, 
      description: "Clean and bright interface",
      color: "bg-yellow-500"
    },
    { 
      name: "Dark", 
      value: "dark", 
      icon: Moon, 
      description: "Easy on the eyes",
      color: "bg-gray-800"
    },
    { 
      name: "Autumn", 
      value: "autumn", 
      icon: Leaf, 
      description: "Warm fall colors with orange and brown tones",
      color: "bg-orange-600"
    },
    { 
      name: "Winter", 
      value: "winter", 
      icon: Snowflake, 
      description: "Cool winter palette with blue and silver tones",
      color: "bg-blue-500"
    },
    { 
      name: "Spring", 
      value: "spring", 
      icon: Flower, 
      description: "Fresh spring colors with green and light tones",
      color: "bg-green-500"
    },
    { 
      name: "Summer", 
      value: "summer", 
      icon: SummerSun, 
      description: "Bright summer palette with yellow and warm tones",
      color: "bg-yellow-500"
    },
    { 
      name: "Cozy", 
      value: "cozy", 
      icon: Home, 
      description: "Warm and comfortable living room vibes",
      color: "bg-amber-600"
    },
    { 
      name: "Black & White", 
      value: "blackwhite", 
      icon: Contrast, 
      description: "Classic monochrome minimalist design",
      color: "bg-gray-900"
    },
    { 
      name: "By the Stove", 
      value: "bythestove", 
      icon: Flame, 
      description: "Cozy fireplace warmth with red and orange",
      color: "bg-red-600"
    },
    { 
      name: "Development", 
      value: "testdev", 
      icon: Terminal, 
      description: "Hacker-style green on dark theme for developers",
      color: "bg-green-600"
    },
  ]

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">AvPlanner Theme Gallery</h1>
          <p className="text-muted-foreground text-lg">
            Explore our beautiful seasonal themes. Click on any theme to activate it!
          </p>
          <Badge variant="outline" className="mt-2">
            Current: {theme || "system"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {themes.map((themeOption) => {
            const Icon = themeOption.icon
            const isActive = theme === themeOption.value

            return (
              <Card 
                key={themeOption.value}
                className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                  isActive ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'
                }`}
                onClick={() => setTheme(themeOption.value)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${themeOption.color} bg-opacity-20`}>
                      <Icon className={`h-6 w-6 text-${themeOption.color.split('-')[1]}-600`} />
                    </div>
                    {isActive && (
                      <Badge variant="default" className="text-xs">
                        Active
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg">{themeOption.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {themeOption.description}
                  </CardDescription>
                  
                  <div className="mt-4 space-y-2">
                    <div className="flex gap-1">
                      <div className="w-6 h-6 rounded bg-primary"></div>
                      <div className="w-6 h-6 rounded bg-secondary"></div>
                      <div className="w-6 h-6 rounded bg-accent"></div>
                      <div className="w-6 h-6 rounded bg-muted"></div>
                    </div>
                    <Button 
                      variant={isActive ? "default" : "outline"} 
                      size="sm" 
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation()
                        setTheme(themeOption.value)
                      }}
                    >
                      {isActive ? "Currently Active" : "Apply Theme"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="mt-12 text-center">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>How to Use Themes</CardTitle>
              <CardDescription>
                Themes are available throughout the entire AvPlanner application
              </CardDescription>
            </CardHeader>
            <CardContent className="text-left space-y-4">
              <div>
                <h4 className="font-semibold mb-2">🎨 Seasonal Themes</h4>
                <p className="text-sm text-muted-foreground">
                  Our new seasonal themes provide unique color palettes inspired by nature's seasons.
                  Each theme uses the same CSS variable structure for consistency.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">⚙️ Access Themes</h4>
                <p className="text-sm text-muted-foreground">
                  You can change themes from the Settings dropdown in any calendar view,
                  or use this demo page to preview all available options.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">💾 Persistence</h4>
                <p className="text-sm text-muted-foreground">
                  Your theme choice is automatically saved and will persist across sessions.
                  System theme follows your device's dark/light mode preference.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}