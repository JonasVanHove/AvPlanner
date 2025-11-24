"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Settings, Download, Moon, Sun, Globe, Bell, ChevronDown, Monitor, Share2, Copy, QrCode, Eye, EyeOff, Leaf, Snowflake, Flower, Sun as SummerSun, Home, Contrast, Flame, Terminal, MessageSquare, Lightbulb, Bug } from "lucide-react"
import { ExportDialog } from "./export-dialog"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useTheme } from "next-themes"
import { useTranslation, type Locale } from "@/lib/i18n"
import { useIsMobile } from "@/hooks/use-mobile"
import { useVersion } from "@/hooks/use-version"
import { useRouter } from "next/navigation"

interface Member {
  id: string
  first_name: string
  last_name: string
  email?: string
  profile_image?: string
}

interface Team {
  id: string
  name: string
  slug?: string
  invite_code: string
  is_password_protected: boolean
}

interface SettingsDropdownProps {
  currentLocale: Locale
  members: Member[]
  team?: Team
  forceOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

// Stable content component to avoid remounting on each parent render
function SettingsPanelContent(props: {
  currentLocale: Locale
  team?: Team
  theme: string | undefined
  onThemeChange: (val: string) => void
  simplifiedMode: boolean
  onSimplifiedModeToggle: (enabled: boolean) => void
  onOpenExport: () => void
  isGeneratingQR: boolean
  generateQR: (url?: string) => void | Promise<void>
  downloadQR: () => void
  qrDataUrl: string | null
  showQR: boolean
  hideQR: () => void
  copyToClipboard: (text: string) => Promise<void>
  shareUrl: string
  notifications: boolean
  onNotificationsToggle: (enabled: boolean) => void
  testNotificationMessage: string
  onChangeTestMessage: (val: string) => void
  onSendTestNotification: () => void
  version?: string | null
  versionLoading: boolean
  onLanguageChange: (locale: Locale) => void
  sendFeedbackEmail?: (type: 'idea' | 'bug') => Promise<void>
  onClose?: () => void
  teamInviteUrl?: string
  teamSlugUrl?: string
}) {
  const {
    currentLocale,
    team,
    theme,
    onThemeChange,
    simplifiedMode,
    onSimplifiedModeToggle,
    onOpenExport,
    isGeneratingQR,
    generateQR,
    downloadQR,
    qrDataUrl,
    showQR,
    hideQR,
    copyToClipboard,
    shareUrl,
    notifications,
    onNotificationsToggle,
    testNotificationMessage,
    onChangeTestMessage,
    onSendTestNotification,
    version,
    versionLoading,
    onLanguageChange,
    onClose,
  } = props

  const { t } = useTranslation(currentLocale)

  return (
    <div className="space-y-1">
      {team && (
        <>
          <DropdownMenuItem 
            onClick={() => {
              // Redirect Manage Team to the My Teams overview
              window.location.href = `/my-teams`
              onClose?.()
            }}
            className="cursor-pointer"
          >
            <Settings className="mr-2 h-4 w-4" />
            {currentLocale === "en" ? "Manage Team" : currentLocale === "nl" ? "Team Beheren" : "Gérer l'équipe"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {/* Feedback / Bug reporting links */}
          <DropdownMenuItem
            onClick={() => {
              onClose?.()
              window.open('https://github.com/JonasVanHove/AvPlanner/discussions/new?category=ideas', '_blank', 'noopener,noreferrer')
            }}
            className="cursor-pointer group flex items-center"
          >
            <Lightbulb className="mr-2 h-4 w-4 text-gray-300 transition-colors duration-150 group-hover:text-yellow-400" />
            {currentLocale === "en" ? "Submit Idea" : currentLocale === "nl" ? "Dien idee in" : "Soumettre une idée"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              onClose?.()
              window.open('https://github.com/JonasVanHove/AvPlanner/issues/new/choose', '_blank', 'noopener,noreferrer')
            }}
            className="cursor-pointer group flex items-center"
          >
            <Bug className="mr-2 h-4 w-4 text-gray-300 transition-colors duration-150 group-hover:text-green-400" />
            {currentLocale === "en" ? "Report a Bug" : currentLocale === "nl" ? "Meld een bug" : "Signaler un bug"}
          </DropdownMenuItem>
        </>
      )}

      {/* Share Section */}
      <div className="px-2 py-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <Share2 className="mr-2 h-4 w-4" />
            <Label className="text-sm font-medium">
              {currentLocale === "en" ? "Share" : currentLocale === "nl" ? "Delen" : "Partager"}
            </Label>
          </div>
          <div className="flex items-center gap-1">
            {team?.is_password_protected ? (
              <>
                <Eye className="h-3 w-3 text-orange-500" />
                <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                  {currentLocale === "en" ? "Protected" : currentLocale === "nl" ? "Beveiligd" : "Protégé"}
                </span>
              </>
            ) : (
              <>
                <EyeOff className="h-3 w-3 text-green-500" />
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                  {currentLocale === "en" ? "Public" : currentLocale === "nl" ? "Openbaar" : "Public"}
                </span>
              </>
            )}
          </div>
        </div>
        {team?.invite_code && (
          <div className="mb-3">
            <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
              {currentLocale === "en" ? "Invite Code URL (Primary)" : currentLocale === "nl" ? "Uitnodigingscode URL (Primair)" : "URL du code d'invitation (Principal)"}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                value={`${window.location.origin}${currentLocale === "en" ? "" : `/${currentLocale}`}/team/${team.invite_code}`}
                readOnly
                className="flex-1 h-8 text-xs bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(`${window.location.origin}${currentLocale === "en" ? "" : `/${currentLocale}`}/team/${team.invite_code}`)}
                className="h-8 w-8 p-0 border-gray-200 dark:border-gray-600"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {team?.slug && (
          <div className="mb-3">
            <Label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
              {currentLocale === "en" ? "Friendly URL (Alternative)" : currentLocale === "nl" ? "Vriendelijke URL (Alternatief)" : "URL conviviale (Alternative)"}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                value={`${window.location.origin}${currentLocale === "en" ? "" : `/${currentLocale}`}/team/${team.slug}`}
                readOnly
                className="flex-1 h-8 text-xs bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(`${window.location.origin}${currentLocale === "en" ? "" : `/${currentLocale}`}/team/${team.slug}`)}
                className="h-8 w-8 p-0 border-gray-200 dark:border-gray-600"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        <div className={`${team?.is_password_protected ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'} border rounded p-2 mb-3`}>
          <p className={`text-xs ${team?.is_password_protected ? 'text-orange-800 dark:text-orange-200' : 'text-green-800 dark:text-green-200'}`}>
            {team?.is_password_protected 
              ? (currentLocale === "en" ? "🔒 Password protected - Users need password to access" : currentLocale === "nl" ? "🔒 Wachtwoord beveiligd - Gebruikers hebben wachtwoord nodig" : "🔒 Protégé par mot de passe - Mot de passe requis")
              : (currentLocale === "en" ? "🔓 Public access - Anyone with link can view" : currentLocale === "nl" ? "🔓 Openbare toegang - Iedereen met link kan bekijken" : "🔓 Accès public - Visible avec le lien")
            }
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateQR(team?.invite_code ? `${window.location.origin}${currentLocale === "en" ? "" : `/${currentLocale}`}/team/${team.invite_code}` : shareUrl)}
            disabled={isGeneratingQR}
            className="flex-1 h-8 text-xs border-gray-200 dark:border-gray-600"
          >
            <QrCode className="mr-1 h-3 w-3" />
            {isGeneratingQR ? 
              (currentLocale === "en" ? "Generating..." : currentLocale === "nl" ? "Genereren..." : "Génération...") :
              (currentLocale === "en" ? "QR Code" : currentLocale === "nl" ? "QR-code" : "Code QR")
            }
          </Button>
          {qrDataUrl && (
            <Button
              variant="outline"
              size="sm"
              onClick={downloadQR}
              className="h-8 w-8 p-0 border-gray-200 dark:border-gray-600"
            >
              <Download className="h-3 w-3" />
            </Button>
          )}
        </div>

        {showQR && qrDataUrl && (
          <div className="mt-3 flex flex-col items-center">
            <img 
              src={qrDataUrl} 
              alt="QR Code" 
              className="w-32 h-32 border border-gray-200 dark:border-gray-600 rounded"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={hideQR}
              className="mt-2 h-6 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {currentLocale === "en" ? "Hide" : currentLocale === "nl" ? "Verbergen" : "Masquer"}
            </Button>
          </div>
        )}
      </div>

      <div className="h-px bg-gray-200 dark:bg-gray-600 my-1" />

      <div
        onClick={() => {
          onOpenExport()
          onClose?.()
        }}
        className="flex items-center px-2 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-sm transition-colors"
      >
        <Download className="mr-2 h-4 w-4" />
        <span>{t("settings.export")}</span>
      </div>

      <div className="h-px bg-gray-200 dark:bg-gray-600 my-1" />

      <div className="px-2 py-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            {simplifiedMode ? (
              <EyeOff className="mr-2 h-4 w-4" />
            ) : (
              <Eye className="mr-2 h-4 w-4" />
            )}
            <Label className="text-sm font-medium">{t("settings.simplifiedMode")}</Label>
          </div>
          <Switch
            checked={simplifiedMode}
            onCheckedChange={onSimplifiedModeToggle}
            className="h-4 w-7"
          />
        </div>
      </div>

      {(team?.slug === 'efficiency-team' || team?.invite_code === 'efficiency-team') && (
        <div className="px-2 py-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              {theme === "dark" ? (
                <Moon className="mr-2 h-4 w-4" />
              ) : theme === "light" ? (
                <Sun className="mr-2 h-4 w-4" />
              ) : theme === "autumn" ? (
                <Leaf className="mr-2 h-4 w-4 text-orange-600" />
              ) : theme === "winter" ? (
                <Snowflake className="mr-2 h-4 w-4 text-blue-500" />
              ) : theme === "spring" ? (
                <Flower className="mr-2 h-4 w-4 text-green-500" />
              ) : theme === "summer" ? (
                <SummerSun className="mr-2 h-4 w-4 text-yellow-500" />
              ) : theme === "cozy" ? (
                <Home className="mr-2 h-4 w-4 text-amber-600" />
              ) : theme === "blackwhite" ? (
                <Contrast className="mr-2 h-4 w-4" />
              ) : theme === "bythestove" ? (
                <Flame className="mr-2 h-4 w-4 text-red-600" />
              ) : theme === "testdev" ? (
                <Terminal className="mr-2 h-4 w-4 text-green-500" />
              ) : (
                <Monitor className="mr-2 h-4 w-4" />
              )}
              <Label className="text-sm font-medium">
                {currentLocale === "en" ? "Theme" : currentLocale === "nl" ? "Thema" : "Thème"}
              </Label>
            </div>
          </div>
          <Select
            value={theme || "system"}
            onValueChange={(val) => {
              onThemeChange(val)
              if (typeof window !== 'undefined') {
                setTimeout(() => window.location.reload(), 0)
              }
            }}
          >
            <SelectTrigger className="w-full h-8 text-sm bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <SelectItem value="system" className="text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center">
                  <Monitor className="mr-2 h-3 w-3" />
                  {currentLocale === "en" ? "System" : currentLocale === "nl" ? "Systeem" : "Système"}
                </div>
              </SelectItem>
              <SelectItem value="light" className="text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center">
                  <Sun className="mr-2 h-3 w-3" />
                  {currentLocale === "en" ? "Light" : currentLocale === "nl" ? "Licht" : "Clair"}
                </div>
              </SelectItem>
              <SelectItem value="dark" className="text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center">
                  <Moon className="mr-2 h-3 w-3" />
                  {currentLocale === "en" ? "Dark" : currentLocale === "nl" ? "Donker" : "Sombre"}
                </div>
              </SelectItem>
              <SelectItem value="autumn" className="text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center">
                  <Leaf className="mr-2 h-3 w-3 text-orange-600" />
                  {currentLocale === "en" ? "Autumn" : currentLocale === "nl" ? "Herfst" : "Automne"}
                </div>
              </SelectItem>
              <SelectItem value="winter" className="text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center">
                  <Snowflake className="mr-2 h-3 w-3 text-blue-500" />
                  {currentLocale === "en" ? "Winter" : currentLocale === "nl" ? "Winter" : "Hiver"}
                </div>
              </SelectItem>
              <SelectItem value="spring" className="text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center">
                  <Flower className="mr-2 h-3 w-3 text-green-500" />
                  {currentLocale === "en" ? "Spring" : currentLocale === "nl" ? "Lente" : "Printemps"}
                </div>
              </SelectItem>
              <SelectItem value="summer" className="text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center">
                  <SummerSun className="mr-2 h-3 w-3 text-yellow-500" />
                  {currentLocale === "en" ? "Summer" : currentLocale === "nl" ? "Zomer" : "Été"}
                </div>
              </SelectItem>
              <SelectItem value="cozy" className="text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center">
                  <Home className="mr-2 h-3 w-3 text-amber-600" />
                  {currentLocale === "en" ? "Cozy" : currentLocale === "nl" ? "Gezellig" : "Confortable"}
                </div>
              </SelectItem>
              <SelectItem value="blackwhite" className="text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center">
                  <Contrast className="mr-2 h-3 w-3" />
                  {currentLocale === "en" ? "Black & White" : currentLocale === "nl" ? "Zwart & Wit" : "Noir & Blanc"}
                </div>
              </SelectItem>
              <SelectItem value="bythestove" className="text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center">
                  <Flame className="mr-2 h-3 w-3 text-red-600" />
                  {currentLocale === "en" ? "By the Stove" : currentLocale === "nl" ? "Bij de Kachel" : "Près du Poêle"}
                </div>
              </SelectItem>
              <SelectItem value="testdev" className="text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center">
                  <Terminal className="mr-2 h-3 w-3 text-green-500" />
                  {currentLocale === "en" ? "Development" : currentLocale === "nl" ? "Ontwikkeling" : "Développement"}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="h-px bg-gray-200 dark:bg-gray-600 my-1" />

      <div className="px-2 py-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <Globe className="mr-2 h-4 w-4" />
            <Label className="text-sm font-medium">{t("settings.language")}</Label>
          </div>
        </div>
        <Select value={currentLocale} onValueChange={onLanguageChange}>
          <SelectTrigger className="w-full h-8 text-sm bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <SelectItem value="en" className="text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
              🇺🇸 English
            </SelectItem>
            <SelectItem value="nl" className="text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
              🇳🇱 Nederlands
            </SelectItem>
            <SelectItem value="fr" className="text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
              🇫🇷 Français
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="h-px bg-gray-200 dark:bg-gray-600 my-1" />

      <div className="px-2 py-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <Bell className="mr-2 h-4 w-4" />
            <Label className="text-sm font-medium">{t("settings.notifications")}</Label>
          </div>
          <Switch
            checked={notifications}
            onCheckedChange={onNotificationsToggle}
            className="h-4 w-7"
          />
        </div>

        {notifications && (
          <div
            className="mt-3 space-y-2"
            onKeyDownCapture={(e) => { e.stopPropagation() }}
            onKeyUpCapture={(e) => { e.stopPropagation() }}
            onKeyPressCapture={(e) => { e.stopPropagation() }}
          >
            <div className="flex items-center gap-2">
              <Input
                value={testNotificationMessage}
                onChange={(e) => onChangeTestMessage(e.target.value)}
                onKeyDownCapture={(e) => { e.stopPropagation() }}
                onKeyUpCapture={(e) => { e.stopPropagation() }}
                onKeyPressCapture={(e) => { e.stopPropagation() }}
                placeholder={currentLocale === "en" ? "Enter test message..." : 
                            currentLocale === "nl" ? "Voer testbericht in..." : 
                            "Entrez un message de test..."}
                className="flex-1 h-8 text-xs bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={onSendTestNotification}
                className="h-8 text-xs border-gray-200 dark:border-gray-600"
              >
                {currentLocale === "en" ? "Test" : currentLocale === "nl" ? "Test" : "Test"}
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {currentLocale === "en" ? "Send a test notification to check if notifications work" :
               currentLocale === "nl" ? "Stuur een testnotificatie om te controleren of notificaties werken" :
               "Envoyez une notification de test pour vérifier si les notifications fonctionnent"}
            </p>
          </div>
        )}
      </div>

      <div className="h-px bg-gray-200 dark:bg-gray-600 my-1" />

      <div className="px-2 py-2">
        <div className="flex items-center justify-center">
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {versionLoading ? "..." : version || "Git not available"}
          </span>
        </div>
      </div>
    </div>
  )
}

export function SettingsDropdown({ currentLocale, members, team, forceOpen, onOpenChange }: SettingsDropdownProps) {
  const [exportDialogOpen, setExportDialogOpen] = useState(false)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isGeneratingQR, setIsGeneratingQR] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [showQR, setShowQR] = useState(false)
  const [notifications, setNotifications] = useState(false)
  const [testNotificationMessage, setTestNotificationMessage] = useState("")
  const [simplifiedMode, setSimplifiedMode] = useState(false)
  const [shareUrl, setShareUrl] = useState("")
  const { setTheme, theme } = useTheme()
  const { t } = useTranslation(currentLocale)
  const isMobile = useIsMobile()
  const { version, isLoading: versionLoading } = useVersion()
  const router = useRouter()
  const { user } = useAuth()

  // Handle forceOpen prop
  useEffect(() => {
    if (forceOpen) {
      if (isMobile) {
        setDrawerOpen(true)
      } else {
        setDropdownOpen(true)
      }
      // Reset the forceOpen state
      onOpenChange?.(true)
    }
  }, [forceOpen, isMobile, onOpenChange])

  // Load preferences on mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem("notifications") !== "false"
    const savedSimplifiedMode = localStorage.getItem("simplifiedMode") === "true"
    setNotifications(savedNotifications)
    setSimplifiedMode(savedSimplifiedMode)
    
    // Generate share URL
    const currentUrl = window.location.href
    const baseUrl = currentUrl.split('?')[0]
    setShareUrl(`${baseUrl}?view=readonly`)
  }, [])

  const handleNotificationsToggle = (enabled: boolean) => {
    setNotifications(enabled)
    localStorage.setItem("notifications", enabled.toString())
  }

  const handleSimplifiedModeToggle = (enabled: boolean) => {
    setSimplifiedMode(enabled)
    localStorage.setItem("simplifiedMode", enabled.toString())
    
    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('simplifiedModeChanged', { detail: enabled }))
  }
  const handleLanguageChange = (locale: Locale) => {
    try {
      const currentPath = window.location.pathname
      const pathSegments = currentPath.split("/")
      if (pathSegments[1] === "en" || pathSegments[1] === "nl" || pathSegments[1] === "fr") {
        pathSegments[1] = locale
      } else {
        pathSegments.splice(1, 0, locale)
      }
      const newPath = pathSegments.join("/")
      window.location.href = newPath
    } catch (error) {
      console.error("Error changing language:", error)
      alert(t("common.error") || "Er is een fout opgetreden bij het wijzigen van de taal.")
    }
  }

  // Clipboard helper used by SettingsPanelContent
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert(currentLocale === "en" ? "Link copied to clipboard!" :
            currentLocale === "nl" ? "Link gekopieerd naar klembord!" :
            "Lien copié dans le presse-papiers!")
    } catch (error) {
      console.error("Failed to copy:", error)
      alert(currentLocale === "en" ? "Failed to copy link" :
            currentLocale === "nl" ? "Kopiëren mislukt" :
            "Échec de la copie du lien")
    }
  }

  // Generate and download QR helpers
  const generateQR = async (url?: string) => {
    setIsGeneratingQR(true)
    try {
      const QRCode = (await import("qrcode")).default
      const qrDataUrl = await QRCode.toDataURL(url || shareUrl, {
        width: 256,
        margin: 1,
        color: { dark: "#000000", light: "#FFFFFF" },
      })
      setQrDataUrl(qrDataUrl)
      setShowQR(true)
    } catch (error) {
      console.error("Error generating QR code:", error)
      alert(currentLocale === "en" ? "Failed to generate QR code" :
            currentLocale === "nl" ? "QR-code genereren mislukt" :
            "Échec de la génération du code QR")
    } finally {
      setIsGeneratingQR(false)
    }
  }

  const downloadQR = () => {
    if (!qrDataUrl) return
    const link = document.createElement("a")
    link.download = "availability-planner-qr.png"
    link.href = qrDataUrl
    link.click()
  }

  // Send team-wide test notification via app-level event; calendar relays via Realtime
  const handleNotifications = async () => {
    if (!team?.id) return
    const message = testNotificationMessage.trim() || 
      (currentLocale === "en" ? "Test notification from AvPlanner!" :
       currentLocale === "nl" ? "Test notificatie van AvPlanner!" :
       "Notification de test d'AvPlanner!")

    const sender = members.find(m => m.email && m.email.toLowerCase() === (user?.email || '').toLowerCase())
    const senderName = `${sender?.first_name || ''} ${sender?.last_name || ''}`.trim() || sender?.email || 'User'
    const detail = { teamId: team.id, teamName: team.name, message, senderId: sender?.id, senderName, locale: currentLocale }
    window.dispatchEvent(new CustomEvent('teamNotificationSend', { detail }))
  }

  // Compose and open a mailto to all admins for this team (fallback to generic address)
  const sendFeedbackEmail = async (type: 'idea' | 'bug') => {
    try {
      let recipients: string[] = []
      if (team?.id) {
        const { data, error } = await supabase
          .from('members')
          .select('email, role')
          .eq('team_id', team.id)
          .in('role', ['admin', 'owner'])

        if (!error && data && data.length > 0) {
          recipients = data.map((r: any) => r.email).filter(Boolean)
        }
      }

      if (recipients.length === 0) {
        // Fallback addresses
        recipients = [type === 'bug' ? 'bugs@avplanner.app' : 'feedback@avplanner.app']
      }

      const subject = encodeURIComponent(`${team?.name || 'AvPlanner'} - ${type === 'bug' ? 'Bug Report' : 'Feature Request'}`)
      const bodyTemplate = type === 'bug'
        ? `Hi team,%0A%0AI'd like to report a bug in ${team?.name || ''}. Steps to reproduce:%0A1.%0A2.%0A3.%0A%0AExpected result:%0A%0AActual result:%0A%0A(Please include browser and version)%0A`
        : `Hi team,%0A%0AI have an idea or feature request for ${team?.name || ''} (%23team). Describe below:%0A%0A[Describe your idea here]%0A%0AThanks!`

      window.location.href = `mailto:${recipients.join(',')}?subject=${subject}&body=${encodeURIComponent(decodeURIComponent(bodyTemplate))}`
    } catch (e) {
      console.error('Failed to compose feedback email', e)
      window.location.href = type === 'bug' ? 'mailto:bugs@avplanner.app' : 'mailto:feedback@avplanner.app'
    }
  }

  // Stable settings panel to avoid remounts on each keystroke
  const settingsPanel = (
    <SettingsPanelContent
      currentLocale={currentLocale}
      team={team}
      theme={theme}
      onThemeChange={setTheme}
      simplifiedMode={simplifiedMode}
      onSimplifiedModeToggle={handleSimplifiedModeToggle}
      onOpenExport={() => setExportDialogOpen(true)}
      isGeneratingQR={isGeneratingQR}
      generateQR={generateQR}
      downloadQR={downloadQR}
      qrDataUrl={qrDataUrl}
      showQR={showQR}
      hideQR={() => setShowQR(false)}
      copyToClipboard={copyToClipboard}
      shareUrl={shareUrl}
      notifications={notifications}
      onNotificationsToggle={handleNotificationsToggle}
      testNotificationMessage={testNotificationMessage}
      onChangeTestMessage={setTestNotificationMessage}
      onSendTestNotification={handleNotifications}
      version={version}
      versionLoading={versionLoading}
      onLanguageChange={handleLanguageChange}
    />
  )

  return (
    <>
      {isMobile ? (
        // Mobile: Use Drawer for better mobile experience
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 settings-button-mobile"
              data-settings-trigger
            >
              <Settings className="h-4 w-4" />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <DrawerHeader className="pb-2">
              <DrawerTitle className="text-lg font-semibold text-center">
                {currentLocale === "en" ? "Settings" : currentLocale === "nl" ? "Instellingen" : "Paramètres"}
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 max-h-[80vh] overflow-y-auto">
              {settingsPanel}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        // Desktop: Use regular dropdown
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
              data-settings-trigger
            >
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 max-h-[80vh] overflow-y-auto"
          >
            {settingsPanel}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <ExportDialog open={exportDialogOpen} onOpenChange={setExportDialogOpen} members={members} locale={currentLocale} />
    </>
  )
}
