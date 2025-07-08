export type Locale = "en" | "nl" | "fr"

export const translations = {
  en: {
    // Navigation
    "nav.home": "Home",
    "nav.teams": "Teams",

    // Team management
    "team.create": "Create Team",
    "team.name": "Team Name",
    "team.members": "Team Members",
    "team.members_count": "team members",
    "team.addMember": "Add Member",
    "team.memberName": "Member Name",
    "team.firstName": "First Name",
    "team.lastName": "Last Name",
    "team.email": "Email",
    "team.noMembers": "No members yet. Add some members to get started.",

    // Calendar
    "calendar.title": "Availability Calendar",
    "calendar.team": "Team",
    "calendar.today": "Today",
    "calendar.prevMonth": "Previous Month",
    "calendar.nextMonth": "Next Month",
    "calendar.week": "Week",
    "calendar.weeks": "Weeks",
    "calendar.month": "Month",
    "calendar.quarter": "Quarter",
    "calendar.year": "Year",
    "calendar.1week": "1 Week",
    "calendar.2weeks": "2 Weeks", 
    "calendar.4weeks": "4 Weeks",
    "calendar.8weeks": "8 Weeks",

    // Availability statuses
    "status.available": "Available",
    "status.unavailable": "Unavailable",
    "status.need_to_check": "Need to check",
    "status.absent": "Absent",
    "status.holiday": "Holiday",

    // Bulk update
    "bulk.title": "Bulk Update",
    "bulk.selectMembers": "Select Members",
    "bulk.selectDates": "Select Date Range",
    "bulk.selectStatus": "Select Status",
    "bulk.startDate": "Start Date",
    "bulk.endDate": "End Date",
    "bulk.apply": "Apply Changes",
    "bulk.selectAll": "Select All",
    "bulk.deselectAll": "Deselect All",
    "bulk.selectMembersAndDates": "Please select team members and dates.",
    "bulk.description": "Select team members, dates and status to update multiple availabilities at once.",
    "bulk.selected": "selected",
    "bulk.datesSelected": "dates selected",
    "bulk.updating": "Updating...",
    "bulk.itemsToUpdate": "items to update",

    // Settings
    "settings.title": "Settings",
    "settings.language": "Language",
    "settings.darkMode": "Dark Mode",
    "settings.notifications": "Notifications",
    "settings.export": "Export Data",
    "settings.exportAvailability": "Export Availability",

    // Export
    "export.title": "Export Availability",
    "export.format": "Export Format",
    "export.dateRange": "Date Range",
    "export.download": "Download",
    "export.selectDateRange": "Please select a date range.",
    "export.description": "Choose the format and date range for export.",
    "export.fromDate": "From Date",
    "export.toDate": "To Date",
    "export.exporting": "Exporting...",

    // Days of week
    "day.monday": "MON",
    "day.tuesday": "TUE",
    "day.wednesday": "WED",
    "day.thursday": "THU",
    "day.friday": "FRI",
    "day.saturday": "SAT",
    "day.sunday": "SUN",

    // Months
    "month.january": "January",
    "month.february": "February",
    "month.march": "March",
    "month.april": "April",
    "month.may": "May",
    "month.june": "June",
    "month.july": "July",
    "month.august": "August",
    "month.september": "September",
    "month.october": "October",
    "month.november": "November",
    "month.december": "December",

    // Common
    "common.add": "Add",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.loading": "Loading...",
    "common.close": "Close",
    "common.error": "An error occurred",
  },
  nl: {
    // Navigation
    "nav.home": "Home",
    "nav.teams": "Teams",

    // Team management
    "team.create": "Team Aanmaken",
    "team.name": "Teamnaam",
    "team.members": "Teamleden",
    "team.members_count": "teamleden",
    "team.addMember": "Lid Toevoegen",
    "team.memberName": "Naam van Lid",
    "team.firstName": "Voornaam",
    "team.lastName": "Achternaam",
    "team.email": "E-mail",
    "team.noMembers": "Nog geen leden. Voeg wat leden toe om te beginnen.",

    // Calendar
    "calendar.title": "Beschikbaarheidskalender",
    "calendar.team": "Team",
    "calendar.today": "Vandaag",
    "calendar.prevMonth": "Vorige Maand",
    "calendar.nextMonth": "Volgende Maand",
    "calendar.week": "Week",
    "calendar.weeks": "Weken",
    "calendar.month": "Maand",
    "calendar.quarter": "Kwartaal",
    "calendar.year": "Jaar",
    "calendar.1week": "1 Week",
    "calendar.2weeks": "2 Weken",
    "calendar.4weeks": "4 Weken", 
    "calendar.8weeks": "8 Weken",

    // Availability statuses
    "status.available": "Beschikbaar",
    "status.unavailable": "Niet Beschikbaar",
    "status.need_to_check": "Moet Nakijken",
    "status.absent": "Afwezig",
    "status.holiday": "Vakantie",

    // Bulk update
    "bulk.title": "Bulk Aanpassing",
    "bulk.selectMembers": "Selecteer Leden",
    "bulk.selectDates": "Selecteer Datumbereik",
    "bulk.selectStatus": "Selecteer Status",
    "bulk.startDate": "Startdatum",
    "bulk.endDate": "Einddatum",
    "bulk.apply": "Wijzigingen Toepassen",
    "bulk.selectAll": "Selecteer Alles",
    "bulk.deselectAll": "Deselecteer Alles",
    "bulk.selectMembersAndDates": "Selecteer teamleden en datums.",
    "bulk.description": "Selecteer teamleden, datums en status om meerdere beschikbaarheden tegelijk bij te werken.",
    "bulk.selected": "geselecteerd",
    "bulk.datesSelected": "datums geselecteerd",
    "bulk.updating": "Bijwerken...",
    "bulk.itemsToUpdate": "items bijwerken",

    // Settings
    "settings.title": "Instellingen",
    "settings.language": "Taal",
    "settings.darkMode": "Donkere Modus",
    "settings.notifications": "Meldingen",
    "settings.export": "Gegevens Exporteren",
    "settings.exportAvailability": "Beschikbaarheid Exporteren",

    // Export
    "export.title": "Beschikbaarheid Exporteren",
    "export.format": "Exportformaat",
    "export.dateRange": "Datumbereik",
    "export.download": "Downloaden",
    "export.selectDateRange": "Selecteer een datumbereik.",
    "export.description": "Kies het formaat en datumbereik voor de export.",
    "export.fromDate": "Van Datum",
    "export.toDate": "Tot Datum",
    "export.exporting": "Exporteren...",

    // Days of week
    "day.monday": "MA",
    "day.tuesday": "DI",
    "day.wednesday": "WO",
    "day.thursday": "DO",
    "day.friday": "VR",
    "day.saturday": "ZA",
    "day.sunday": "ZO",

    // Months
    "month.january": "Januari",
    "month.february": "Februari",
    "month.march": "Maart",
    "month.april": "April",
    "month.may": "Mei",
    "month.june": "Juni",
    "month.july": "Juli",
    "month.august": "Augustus",
    "month.september": "September",
    "month.october": "Oktober",
    "month.november": "November",
    "month.december": "December",

    // Common
    "common.add": "Toevoegen",
    "common.cancel": "Annuleren",
    "common.save": "Opslaan",
    "common.delete": "Verwijderen",
    "common.edit": "Bewerken",
    "common.loading": "Laden...",
    "common.close": "Sluiten",
    "common.error": "Er is een fout opgetreden",
  },
  fr: {
    // Navigation
    "nav.home": "Accueil",
    "nav.teams": "Équipes",

    // Team management
    "team.create": "Créer une Équipe",
    "team.name": "Nom de l'Équipe",
    "team.members": "Membres de l'Équipe",
    "team.members_count": "membres de l'équipe",
    "team.addMember": "Ajouter un Membre",
    "team.memberName": "Nom du Membre",
    "team.firstName": "Prénom",
    "team.lastName": "Nom de famille",
    "team.email": "Email",
    "team.noMembers": "Aucun membre pour le moment. Ajoutez des membres pour commencer.",

    // Calendar
    "calendar.title": "Calendrier de Disponibilité",
    "calendar.team": "Équipe",
    "calendar.today": "Aujourd'hui",
    "calendar.prevMonth": "Mois Précédent",
    "calendar.nextMonth": "Mois Suivant",
    "calendar.week": "Semaine",
    "calendar.weeks": "Semaines",
    "calendar.month": "Mois",
    "calendar.quarter": "Trimestre",
    "calendar.year": "Année",
    "calendar.1week": "1 Semaine",
    "calendar.2weeks": "2 Semaines",
    "calendar.4weeks": "4 Semaines",
    "calendar.8weeks": "8 Semaines",

    // Availability statuses
    "status.available": "Disponible",
    "status.unavailable": "Indisponible",
    "status.need_to_check": "À Vérifier",
    "status.absent": "Absent",
    "status.holiday": "Vacances",

    // Bulk update
    "bulk.title": "Mise à Jour en Lot",
    "bulk.selectMembers": "Sélectionner les Membres",
    "bulk.selectDates": "Sélectionner la Plage de Dates",
    "bulk.selectStatus": "Sélectionner le Statut",
    "bulk.startDate": "Date de Début",
    "bulk.endDate": "Date de Fin",
    "bulk.apply": "Appliquer les Modifications",
    "bulk.selectAll": "Tout Sélectionner",
    "bulk.deselectAll": "Tout Désélectionner",
    "bulk.selectMembersAndDates": "Veuillez sélectionner les membres de l'équipe et les dates.",
    "bulk.description": "Sélectionnez les membres de l'équipe, les dates et le statut pour mettre à jour plusieurs disponibilités à la fois.",
    "bulk.selected": "sélectionné",
    "bulk.datesSelected": "dates sélectionnées",
    "bulk.updating": "Mise à jour...",
    "bulk.itemsToUpdate": "éléments à mettre à jour",

    // Settings
    "settings.title": "Paramètres",
    "settings.language": "Langue",
    "settings.darkMode": "Mode Sombre",
    "settings.notifications": "Notifications",
    "settings.export": "Exporter les Données",
    "settings.exportAvailability": "Exporter la Disponibilité",

    // Export
    "export.title": "Exporter la Disponibilité",
    "export.format": "Format d'Export",
    "export.dateRange": "Plage de Dates",
    "export.download": "Télécharger",
    "export.selectDateRange": "Veuillez sélectionner une plage de dates.",
    "export.description": "Choisissez le format et la plage de dates pour l'export.",
    "export.fromDate": "Date de Début",
    "export.toDate": "Date de Fin",
    "export.exporting": "Export en cours...",

    // Days of week
    "day.monday": "LUN",
    "day.tuesday": "MAR",
    "day.wednesday": "MER",
    "day.thursday": "JEU",
    "day.friday": "VEN",
    "day.saturday": "SAM",
    "day.sunday": "DIM",

    // Months
    "month.january": "Janvier",
    "month.february": "Février",
    "month.march": "Mars",
    "month.april": "Avril",
    "month.may": "Mai",
    "month.june": "Juin",
    "month.july": "Juillet",
    "month.august": "Août",
    "month.september": "Septembre",
    "month.october": "Octobre",
    "month.november": "Novembre",
    "month.december": "Décembre",

    // Common
    "common.add": "Ajouter",
    "common.cancel": "Annuler",
    "common.save": "Sauvegarder",
    "common.delete": "Supprimer",
    "common.edit": "Modifier",
    "common.loading": "Chargement...",
    "common.close": "Fermer",
    "common.error": "Une erreur s'est produite",
  },
}

export function useTranslation(locale: Locale = "en") {
  const t = (key: keyof typeof translations.en): string => {
    return translations[locale][key] || translations.en[key] || key
  }

  return { t }
}
