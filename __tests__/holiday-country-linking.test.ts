import { describe, it, expect } from '@jest/globals'

// Mock data based on the user's example
const mockCountries = [
  { idx: 0, code: "BE", name: "Belgium" },
  { idx: 1, code: "FR", name: "France" }
]

const mockHolidays = [
  {
    idx: 0,
    id: "596ba50a-fa56-4520-9b39-a387e593b449",
    country_code: "FR",
    date: "2025-01-01",
    name: "Jour de l'An",
    is_official: true,
    custom: false
  },
  {
    idx: 1,
    id: "d34cd080-cd54-4f92-81b3-08ba859c2e17",
    country_code: "BE",
    date: "2025-01-01",
    name: "Nieuwjaar",
    is_official: true,
    custom: false
  }
]

const mockTeamMembers = [
  {
    idx: 3,
    id: "382f2818-67a8-4929-b220-d110ff9338af",
    team_id: "5ce51f10-43f1-4d9e-8844-f01382b0489f",
    first_name: "Jonas",
    last_name: "Van Hove",
    email: "jonas.vanhove@arcelormittal.com",
    country_code: "BE"
  }
]

// Helper functions to test the linking logic
function getCountriesWithHolidays(countries: typeof mockCountries, holidays: typeof mockHolidays) {
  return countries.filter(country => 
    holidays.some(holiday => holiday.country_code === country.code)
  )
}

function getHolidaysForCountry(holidays: typeof mockHolidays, countryCode: string) {
  return holidays.filter(holiday => holiday.country_code === countryCode)
}

function getTeamMembersByCountry(members: typeof mockTeamMembers, countryCode: string) {
  return members.filter(member => member.country_code === countryCode)
}

function groupHolidaysByCountry(holidays: typeof mockHolidays) {
  return holidays.reduce((acc, holiday) => {
    if (!acc[holiday.country_code]) {
      acc[holiday.country_code] = []
    }
    acc[holiday.country_code].push(holiday)
    return acc
  }, {} as Record<string, typeof holidays>)
}

describe('Holiday Management Country Linking', () => {
  it('should correctly link countries to holidays via country_code', () => {
    const countriesWithHolidays = getCountriesWithHolidays(mockCountries, mockHolidays)
    
    expect(countriesWithHolidays).toHaveLength(2)
    expect(countriesWithHolidays.map(c => c.code)).toEqual(['BE', 'FR'])
  })

  it('should filter holidays by country code', () => {
    const belgianHolidays = getHolidaysForCountry(mockHolidays, 'BE')
    const frenchHolidays = getHolidaysForCountry(mockHolidays, 'FR')
    
    expect(belgianHolidays).toHaveLength(1)
    expect(belgianHolidays[0].name).toBe('Nieuwjaar')
    
    expect(frenchHolidays).toHaveLength(1) 
    expect(frenchHolidays[0].name).toBe("Jour de l'An")
  })

  it('should link team members to holidays via country_code', () => {
    const belgianMembers = getTeamMembersByCountry(mockTeamMembers, 'BE')
    const belgianHolidays = getHolidaysForCountry(mockHolidays, 'BE')
    
    expect(belgianMembers).toHaveLength(1)
    expect(belgianMembers[0].first_name).toBe('Jonas')
    expect(belgianHolidays[0].name).toBe('Nieuwjaar')
    
    // Verify the linking works via country_code
    expect(belgianMembers[0].country_code).toBe(belgianHolidays[0].country_code)
  })

  it('should group holidays by country correctly', () => {
    const grouped = groupHolidaysByCountry(mockHolidays)
    
    expect(Object.keys(grouped)).toEqual(['FR', 'BE'])
    expect(grouped['BE']).toHaveLength(1)
    expect(grouped['FR']).toHaveLength(1)
    expect(grouped['BE'][0].name).toBe('Nieuwjaar')
    expect(grouped['FR'][0].name).toBe("Jour de l'An")
  })

  it('should handle empty arrays gracefully', () => {
    expect(getCountriesWithHolidays([], [])).toEqual([])
    expect(getHolidaysForCountry([], 'BE')).toEqual([])
    expect(groupHolidaysByCountry([])).toEqual({})
  })

  it('should handle unknown country codes', () => {
    expect(getHolidaysForCountry(mockHolidays, 'NL')).toEqual([])
    expect(getTeamMembersByCountry(mockTeamMembers, 'DE')).toEqual([])
  })
})