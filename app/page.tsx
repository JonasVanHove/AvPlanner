import { TeamForm } from "@/components/team-form"
import { LanguageSelector } from "@/components/language-selector"
import { useTranslation } from "@/lib/i18n"

export default function HomePage() {
  const { t } = useTranslation("en")

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold">Availability Planner</h1>
            <LanguageSelector currentLocale="en" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Plan Your Team's Availability</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Create a team, add members, and coordinate availability with an intuitive calendar interface.
          </p>
        </div>

        <TeamForm locale="en" />
      </main>
    </div>
  )
}
