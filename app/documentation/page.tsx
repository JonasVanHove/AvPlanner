import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  BookOpen, 
  Settings, 
  Users, 
  Calendar,
  Download,
  HelpCircle,
  ArrowRight,
  FileText,
  Globe
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'AvPlanner Documentatie',
  description: 'Volledige gebruikershandleiding en documentatie voor AvPlanner - team beschikbaarheidsplanning',
}

export default function DocumentationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">AvPlanner</span>
              </Link>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600">Documentatie</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline" asChild>
                <Link href="/">
                  Terug naar App
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AvPlanner Documentatie
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Welkom bij de gebruikersdocumentatie van AvPlanner. Een moderne, gebruiksvriendelijke applicatie voor het beheren van teambeschikbaarheid.
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <BookOpen className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Aan de slag</CardTitle>
                  <CardDescription>Account aanmaken en eerste team opzetten</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Account registratie</li>
                <li>• Eerste team maken</li>
                <li>• Teams toevoegen</li>
              </ul>
              <Button variant="outline" className="w-full mt-4" asChild>
                <a href="/documentation/setup/" target="_blank" rel="noopener noreferrer">
                  Setup Gids <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Gebruikershandleiding</CardTitle>
                  <CardDescription>Uitgebreide gidsen voor alle functies</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Dashboard navigatie</li>
                <li>• Team beheer</li>
                <li>• Beschikbaarheid plannen</li>
                <li>• Kalender gebruik</li>
              </ul>
              <Button variant="outline" className="w-full mt-4" asChild>
                <a href="/documentation/user-guide/" target="_blank" rel="noopener noreferrer">
                  Gebruikershandleiding <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Settings className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Admin Functies</CardTitle>
                  <CardDescription>Team beheer voor administrators</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Admin panel</li>
                <li>• Leden beheren</li>
                <li>• Rechten toewijzen</li>
                <li>• Team instellingen</li>
              </ul>
              <Button variant="outline" className="w-full mt-4" asChild>
                <a href="/documentation/admin/" target="_blank" rel="noopener noreferrer">
                  Admin Gids <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Documentation Sections */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Left Column */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <span>Kalender & Planning</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Kalender Gebruik</span>
                  <Button size="sm" variant="ghost" asChild>
                    <a href="/documentation/user-guide/calendar-usage.md" target="_blank" rel="noopener noreferrer">
                      Bekijk
                    </a>
                  </Button>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Beschikbaarheid Plannen</span>
                  <Button size="sm" variant="ghost" asChild>
                    <a href="/documentation/user-guide/availability-planning.md" target="_blank" rel="noopener noreferrer">
                      Bekijk
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="w-5 h-5 text-green-600" />
                  <span>Export & Integraties</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Export Functionaliteit</span>
                  <Button size="sm" variant="ghost" asChild>
                    <a href="/documentation/user-guide/export-data.md" target="_blank" rel="noopener noreferrer">
                      Bekijk
                    </a>
                  </Button>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Rollen en Rechten</span>
                  <Button size="sm" variant="ghost" asChild>
                    <a href="/documentation/features/roles-permissions.md" target="_blank" rel="noopener noreferrer">
                      Bekijk
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <HelpCircle className="w-5 h-5 text-orange-600" />
                  <span>Hulp & Troubleshooting</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Veelgestelde Vragen</span>
                  <Button size="sm" variant="ghost" asChild>
                    <a href="/documentation/troubleshooting/faq.md" target="_blank" rel="noopener noreferrer">
                      Bekijk
                    </a>
                  </Button>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Login Problemen</span>
                  <Button size="sm" variant="ghost" asChild>
                    <a href="/documentation/troubleshooting/login-issues.md" target="_blank" rel="noopener noreferrer">
                      Bekijk
                    </a>
                  </Button>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">Browser Ondersteuning</span>
                  <Button size="sm" variant="ghost" asChild>
                    <a href="/documentation/troubleshooting/browser-support.md" target="_blank" rel="noopener noreferrer">
                      Bekijk
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="w-5 h-5 text-indigo-600" />
                  <span>Talen</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">🇳🇱 Nederlands</span>
                  <Button size="sm" variant="ghost" asChild>
                    <a href="/documentation/README.md" target="_blank" rel="noopener noreferrer">
                      Bekijk
                    </a>
                  </Button>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">🇬🇧 English</span>
                  <Button size="sm" variant="ghost" asChild>
                    <a href="/documentation/README-en.md" target="_blank" rel="noopener noreferrer">
                      Bekijk
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Features Overview */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle>AvPlanner Hoofdfuncties</CardTitle>
            <CardDescription>
              Een overzicht van de belangrijkste mogelijkheden van AvPlanner
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-green-100 rounded-lg mt-1">
                  <Calendar className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Interactieve Kalender</h4>
                  <p className="text-sm text-gray-600">Visuele beschikbaarheidsplanning met intuïtieve interface</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg mt-1">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Team Management</h4>
                  <p className="text-sm text-gray-600">Meerdere teams met rolgebaseerde toegang</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg mt-1">
                  <Globe className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Meertalig</h4>
                  <p className="text-sm text-gray-600">Nederlands, Engels en Frans ondersteuning</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg mt-1">
                  <Download className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Export Opties</h4>
                  <p className="text-sm text-gray-600">Excel, CSV en kalender export functionaliteit</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-red-100 rounded-lg mt-1">
                  <Settings className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Beveiliging</h4>
                  <p className="text-sm text-gray-600">Wachtwoordbeveiliging en gebruikersrechten</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-indigo-100 rounded-lg mt-1">
                  <FileText className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Mobile Ready</h4>
                  <p className="text-sm text-gray-600">Werkt op alle apparaten en browsers</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Complete Documentation Link */}
        <div className="text-center">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="py-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Volledige Documentatie Bekijken
              </h3>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Voor de meest uitgebreide en up-to-date documentatie, bekijk de volledige documentatie folder met alle gidsen, voorbeelden en troubleshooting informatie.
              </p>
              <Button size="lg" asChild>
                <a href="/documentation/README.md" target="_blank" rel="noopener noreferrer">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Open Volledige Documentatie
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-gray-50 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p className="mb-2">
              <strong>AvPlanner Documentatie</strong> - Versie 1.5.1
            </p>
            <p className="text-sm">
              Laatste update: Oktober 2025 | 
              <Link href="/" className="text-blue-600 hover:text-blue-800 ml-1">
                Terug naar AvPlanner
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}