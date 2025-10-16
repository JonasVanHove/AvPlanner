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
import { useTranslation, type Locale } from '@/lib/i18n'
import { notFound } from 'next/navigation'

interface DocumentationPageProps {
  params: {
    locale: string
  }
}

export async function generateMetadata({ params }: DocumentationPageProps): Promise<Metadata> {
  const locale = params.locale as Locale
  
  if (!["en", "nl", "fr"].includes(locale)) {
    return {
      title: 'AvPlanner Documentation',
      description: 'Complete user guide and documentation for AvPlanner - team availability planning',
    }
  }

  const { t } = useTranslation(locale)
  
  return {
    title: t('docs.title'),
    description: t('docs.subtitle'),
  }
}

export default function DocumentationPage({ params }: DocumentationPageProps) {
  const locale = params.locale as Locale

  if (!["en", "nl", "fr"].includes(locale)) {
    notFound()
  }

  const { t } = useTranslation(locale)

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href={`/${locale}`} className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">AvPlanner</span>
              </Link>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600">{t('docs.title')}</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="outline" asChild>
                <Link href={`/${locale}`}>
                  {t('docs.backToApp')}
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
            {t('docs.title')}
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('docs.subtitle')}
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
                  <CardTitle className="text-lg">{t('docs.gettingStarted')}</CardTitle>
                  <CardDescription>{t('docs.gettingStartedDesc')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600 whitespace-pre-line">
                {t('docs.gettingStartedItems')}
              </div>
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link href={`/${locale}/documentation/setup`}>
                  {t('docs.setupGuide')} <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
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
                  <CardTitle className="text-lg">{t('docs.userGuide')}</CardTitle>
                  <CardDescription>{t('docs.userGuideDesc')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600 whitespace-pre-line">
                {t('docs.userGuideItems')}
              </div>
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link href={`/${locale}/documentation/user-guide`}>
                  {t('docs.userGuide')} <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
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
                  <CardTitle className="text-lg">{t('docs.adminGuide')}</CardTitle>
                  <CardDescription>{t('docs.adminGuideDesc')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600 whitespace-pre-line">
                {t('docs.adminGuideItems')}
              </div>
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link href={`/${locale}/documentation/admin`}>
                  {t('docs.adminGuide')} <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <FileText className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t('docs.features')}</CardTitle>
                  <CardDescription>{t('docs.featuresDesc')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600 whitespace-pre-line">
                {t('docs.featuresItems')}
              </div>
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link href={`/${locale}/documentation/features`}>
                  {t('docs.features')} <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <HelpCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t('docs.troubleshooting')}</CardTitle>
                  <CardDescription>{t('docs.troubleshootingDesc')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600 whitespace-pre-line">
                {t('docs.troubleshootingItems')}
              </div>
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link href={`/${locale}/documentation/troubleshooting`}>
                  {t('docs.troubleshooting')} <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader className="pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Globe className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t('docs.support')}</CardTitle>
                  <CardDescription>{t('docs.supportDesc')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-gray-600 whitespace-pre-line">
                {t('docs.supportItems')}
              </div>
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link href={`/${locale}/documentation/support`}>
                  {t('docs.support')} <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Key Features Section */}
        <section className="bg-white rounded-xl p-8 shadow-sm mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('docs.keyFeatures')}</h2>
            <p className="text-lg text-gray-600">{t('docs.keyFeaturesDesc')}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{t('docs.feature1')}</h3>
              <p className="text-sm text-gray-600">{t('docs.feature1Desc')}</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{t('docs.feature2')}</h3>
              <p className="text-sm text-gray-600">{t('docs.feature2Desc')}</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{t('docs.feature3')}</h3>
              <p className="text-sm text-gray-600">{t('docs.feature3Desc')}</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download className="w-8 h-8 text-yellow-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{t('docs.feature4')}</h3>
              <p className="text-sm text-gray-600">{t('docs.feature4Desc')}</p>
            </div>
          </div>
        </section>

        {/* Quick Start Guide */}
        <section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('docs.quickStart')}</h2>
            <p className="text-lg text-gray-600">{t('docs.quickStartDesc')}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl mb-4">
                1
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{t('docs.step1')}</h3>
              <p className="text-sm text-gray-600">{t('docs.step1Desc')}</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-xl mb-4">
                2
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{t('docs.step2')}</h3>
              <p className="text-sm text-gray-600">{t('docs.step2Desc')}</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xl mb-4">
                3
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{t('docs.step3')}</h3>
              <p className="text-sm text-gray-600">{t('docs.step3Desc')}</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-yellow-600 text-white rounded-full flex items-center justify-center font-bold text-xl mb-4">
                4
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{t('docs.step4')}</h3>
              <p className="text-sm text-gray-600">{t('docs.step4Desc')}</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}