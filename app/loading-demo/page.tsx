"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  LoadingSpinner, 
  PulseLoader, 
  DotsLoader, 
  SkeletonLoader, 
  LoadingOverlay 
} from "@/components/ui/loading-spinner"

export default function LoadingDemoPage() {
  const [showOverlay, setShowOverlay] = useState(false)

  const handleShowOverlay = () => {
    setShowOverlay(true)
    setTimeout(() => setShowOverlay(false), 3000)
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Loading Animaties Demo</h1>
        <p className="text-gray-600">Verschillende loading animaties voor je applicatie</p>
      </div>

      {/* Spinner Variants */}
      <Card>
        <CardHeader>
          <CardTitle>Loading Spinners</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Verschillende varianten</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="flex flex-col items-center gap-2">
                <LoadingSpinner variant="default" size="lg" />
                <span className="text-sm text-gray-600">Default</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <LoadingSpinner variant="secondary" size="lg" />
                <span className="text-sm text-gray-600">Secondary</span>
              </div>
              <div className="flex flex-col items-center gap-2 bg-gray-800 p-4 rounded">
                <LoadingSpinner variant="white" size="lg" />
                <span className="text-sm text-white">White</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <LoadingSpinner variant="accent" size="lg" />
                <span className="text-sm text-gray-600">Accent</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Verschillende groottes</h3>
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <LoadingSpinner size="sm" />
                <span className="text-sm text-gray-600">Small</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <LoadingSpinner size="default" />
                <span className="text-sm text-gray-600">Default</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <LoadingSpinner size="lg" />
                <span className="text-sm text-gray-600">Large</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <LoadingSpinner size="xl" />
                <span className="text-sm text-gray-600">Extra Large</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">Met tekst</h3>
            <div className="space-y-4">
              <LoadingSpinner size="lg" text="Gegevens laden..." showText />
              <LoadingSpinner variant="accent" size="default" text="Even geduld..." showText />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pulse Loaders */}
      <Card>
        <CardHeader>
          <CardTitle>Pulse Loaders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex flex-col items-center gap-2">
              <PulseLoader variant="default" size="lg" />
              <span className="text-sm text-gray-600">Default</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <PulseLoader variant="secondary" size="lg" />
              <span className="text-sm text-gray-600">Secondary</span>
            </div>
            <div className="flex flex-col items-center gap-2 bg-gray-800 p-4 rounded">
              <PulseLoader variant="white" size="lg" />
              <span className="text-sm text-white">White</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <PulseLoader variant="accent" size="lg" />
              <span className="text-sm text-gray-600">Accent</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dots Loaders */}
      <Card>
        <CardHeader>
          <CardTitle>Dots Loaders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex flex-col items-center gap-2">
              <DotsLoader variant="default" size="lg" />
              <span className="text-sm text-gray-600">Default</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <DotsLoader variant="secondary" size="lg" />
              <span className="text-sm text-gray-600">Secondary</span>
            </div>
            <div className="flex flex-col items-center gap-2 bg-gray-800 p-4 rounded">
              <DotsLoader variant="white" size="lg" />
              <span className="text-sm text-white">White</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <DotsLoader variant="accent" size="lg" />
              <span className="text-sm text-gray-600">Accent</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Skeleton Loaders */}
      <Card>
        <CardHeader>
          <CardTitle>Skeleton Loaders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">3 Lijnen (default)</h4>
              <SkeletonLoader />
            </div>
            <div>
              <h4 className="font-medium mb-3">5 Lijnen</h4>
              <SkeletonLoader lines={5} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading in Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Loading in Buttons</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button disabled className="bg-blue-600 text-white">
              <LoadingSpinner variant="white" size="sm" className="mr-2" />
              Bezig met opslaan...
            </Button>
            <Button variant="outline" disabled>
              <LoadingSpinner variant="default" size="sm" className="mr-2" />
              Laden...
            </Button>
            <Button variant="secondary" disabled>
              <DotsLoader variant="white" size="sm" className="mr-2" />
              Verwerken...
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading Overlay Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Loading Overlay</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600">
              Gebruik een loading overlay voor langdurige operaties die de hele pagina blokkeren.
            </p>
            <Button onClick={handleShowOverlay}>
              Toon Loading Overlay (3 seconden)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Show overlay when triggered */}
      {showOverlay && (
        <LoadingOverlay text="Bezig met laden..." variant="default" />
      )}
    </div>
  )
}
