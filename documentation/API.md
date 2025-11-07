# AvPlanner API Documentation

## Overview

The AvPlanner API provides programmatic access to team availability data. You can retrieve availability information for teams using their invite code or slug, with optional password authentication for protected teams.

**Base URL**: `https://your-domain.com/api/availability`

## Authentication

For password-protected teams, include the password as a query parameter:
```
?password=your-team-password
```

## Common Parameters

All endpoints support the following query parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `password` | string | Team password (required for password-protected teams) |
| `includeHidden` | boolean | Include hidden members in results (default: false) |

## Response Format

All successful responses return JSON with appropriate HTTP status codes:
- `200`: Success
- `400`: Bad request (invalid parameters)
- `401`: Unauthorized (missing or invalid password)
- `404`: Team not found
- `500`: Internal server error

## Endpoints

### 1. Get Team Availability

Retrieve availability data for a specific team with flexible date filtering.

**Endpoint**: `GET /api/availability/{teamCode}`

**URL Parameters**:
- `teamCode` (required): Team invite code or slug

**Query Parameters**:
| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `password` | string | Team password | `?password=mypass123` |
| `startDate` | string | Start date (YYYY-MM-DD) | `?startDate=2025-01-01` |
| `endDate` | string | End date (YYYY-MM-DD) | `?endDate=2025-01-31` |
| `date` | string | Specific date (YYYY-MM-DD) | `?date=2025-01-15` |
| `week` | number | Week number (1-53, requires year) | `?week=5&year=2025` |
| `year` | number | Year for week parameter | `?year=2025` |
| `memberId` | string | Filter by specific member ID | `?memberId=uuid-here` |
| `includeHidden` | boolean | Include hidden members | `?includeHidden=true` |

**Example Requests**:

```bash
# Get all availability data
curl "https://your-domain.com/api/availability/TEAM123"

# Get availability for a date range
curl "https://your-domain.com/api/availability/TEAM123?startDate=2025-01-01&endDate=2025-01-31"

# Get availability for a specific week
curl "https://your-domain.com/api/availability/TEAM123?week=5&year=2025"

# Password-protected team
curl "https://your-domain.com/api/availability/TEAM123?password=secret123&startDate=2025-01-01"
```

**Example Response**:

```json
{
  "team": {
    "id": "uuid-here",
    "name": "Development Team",
    "slug": "dev-team",
    "invite_code": "TEAM123",
    "is_password_protected": false
  },
  "members": [
    {
      "id": "member-uuid",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@example.com",
      "role": "admin",
      "status": "active",
      "is_hidden": false,
      "profile_image": "https://...",
      "order_index": 0,
      "birth_date": "1990-01-15"
    }
  ],
  "availability": [
    {
      "id": "avail-uuid",
      "member_id": "member-uuid",
      "date": "2025-01-15",
      "status": "available",
      "created_at": "2025-01-10T10:00:00Z",
      "updated_at": "2025-01-10T10:00:00Z"
    }
  ],
  "dateRange": {
    "startDate": "2025-01-01",
    "endDate": "2025-01-31"
  }
}
```

### 2. Get Team Summary

Get statistical summary of team availability without detailed member data.

**Endpoint**: `GET /api/availability/{teamCode}/summary`

**URL Parameters**:
- `teamCode` (required): Team invite code or slug

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `password` | string | Team password |
| `startDate` | string | Start date (YYYY-MM-DD) |
| `endDate` | string | End date (YYYY-MM-DD) |

**Example Request**:

```bash
curl "https://your-domain.com/api/availability/TEAM123/summary?startDate=2025-01-01&endDate=2025-01-31"
```

**Example Response**:

```json
{
  "team": {
    "id": "uuid-here",
    "name": "Development Team",
    "slug": "dev-team",
    "invite_code": "TEAM123",
    "is_password_protected": false,
    "created_at": "2024-12-01T10:00:00Z"
  },
  "statistics": {
    "members": {
      "total": 15,
      "active": 12,
      "hidden": 1
    },
    "availability": {
      "total_entries": 450,
      "available": 320,
      "unavailable": 100,
      "maybe": 30,
      "unique_dates": 30
    },
    "dateRange": {
      "earliest": "2025-01-01",
      "latest": "2025-01-31",
      "requested_start": "2025-01-01",
      "requested_end": "2025-01-31"
    }
  }
}
```

### 3. Get Day Availability

Get detailed availability for a specific day.

**Endpoint**: `GET /api/availability/{teamCode}/day/{date}`

**URL Parameters**:
- `teamCode` (required): Team invite code or slug
- `date` (required): Date in YYYY-MM-DD format

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `password` | string | Team password |
| `includeHidden` | boolean | Include hidden members |

**Example Request**:

```bash
curl "https://your-domain.com/api/availability/TEAM123/day/2025-01-15"
```

**Example Response**:

```json
{
  "team": {
    "id": "uuid-here",
    "name": "Development Team",
    "slug": "dev-team",
    "invite_code": "TEAM123",
    "is_password_protected": false
  },
  "date": "2025-01-15",
  "members": [
    {
      "id": "member-uuid",
      "first_name": "John",
      "last_name": "Doe",
      "full_name": "John Doe",
      "email": "john@example.com",
      "role": "admin",
      "status": "active",
      "is_hidden": false,
      "profile_image": "https://...",
      "order_index": 0,
      "birth_date": "1990-01-15",
      "availability": "available"
    },
    {
      "id": "member-uuid-2",
      "first_name": "Jane",
      "last_name": "Smith",
      "full_name": "Jane Smith",
      "email": "jane@example.com",
      "role": "member",
      "status": "active",
      "is_hidden": false,
      "profile_image": null,
      "order_index": 1,
      "birth_date": null,
      "availability": "unavailable"
    }
  ],
  "summary": {
    "total_members": 2,
    "available": 1,
    "unavailable": 1,
    "maybe": 0,
    "no_data": 0
  }
}
```

### 4. Get Week Availability

Get availability data for an entire week (Monday-Sunday, ISO week).

**Endpoint**: `GET /api/availability/{teamCode}/week/{year}/{week}`

**URL Parameters**:
- `teamCode` (required): Team invite code or slug
- `year` (required): Year (e.g., 2025)
- `week` (required): ISO week number (1-53)

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `password` | string | Team password |
| `includeHidden` | boolean | Include hidden members |

**Example Request**:

```bash
curl "https://your-domain.com/api/availability/TEAM123/week/2025/3"
```

**Example Response**:

```json
{
  "team": {
    "id": "uuid-here",
    "name": "Development Team",
    "slug": "dev-team",
    "invite_code": "TEAM123",
    "is_password_protected": false
  },
  "week": {
    "year": 2025,
    "week_number": 3,
    "start_date": "2025-01-13",
    "end_date": "2025-01-19",
    "dates": [
      "2025-01-13",
      "2025-01-14",
      "2025-01-15",
      "2025-01-16",
      "2025-01-17",
      "2025-01-18",
      "2025-01-19"
    ]
  },
  "members": [
    {
      "id": "member-uuid",
      "first_name": "John",
      "last_name": "Doe",
      "full_name": "John Doe",
      "email": "john@example.com",
      "role": "admin",
      "status": "active",
      "is_hidden": false,
      "profile_image": "https://...",
      "order_index": 0,
      "birth_date": "1990-01-15",
      "availability": {
        "2025-01-13": "available",
        "2025-01-14": "available",
        "2025-01-15": "unavailable",
        "2025-01-16": "available",
        "2025-01-17": null,
        "2025-01-18": null,
        "2025-01-19": "maybe"
      }
    }
  ],
  "daily_summary": [
    {
      "date": "2025-01-13",
      "available": 8,
      "unavailable": 2,
      "maybe": 1,
      "no_data": 1
    }
  ],
  "week_summary": {
    "total_members": 12,
    "total_available": 45,
    "total_unavailable": 15,
    "total_maybe": 8,
    "total_no_data": 16
  }
}
```

## Availability Status Values

The `status` field in availability data can have the following values:

| Status | Description |
|--------|-------------|
| `available` | Member is available |
| `unavailable` | Member is not available |
| `maybe` | Member might be available (tentative) |
| `null` | No data provided for this date |

## Error Responses

### 400 Bad Request
```json
{
  "error": "Invalid date format. Use YYYY-MM-DD."
}
```

### 401 Unauthorized
```json
{
  "error": "Password required",
  "message": "This team is password-protected. Please provide a password."
}
```

or

```json
{
  "error": "Invalid password"
}
```

### 404 Not Found
```json
{
  "error": "Team not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "details": "Error message here"
}
```

## Rate Limiting

Currently, there are no rate limits enforced. However, please be considerate with API usage:
- Cache responses when possible
- Use the most specific endpoint for your needs
- Batch requests when fetching data for multiple days

## Best Practices

1. **Use the most specific endpoint**: If you need data for a single day, use the `/day/{date}` endpoint rather than fetching a large date range.

2. **Cache responses**: Availability data doesn't change frequently. Cache responses for reasonable periods (e.g., 5-15 minutes).

3. **Handle password-protected teams**: Always check if a team is password-protected and prompt users for the password before making API calls.

4. **Error handling**: Implement proper error handling for all HTTP status codes, especially 401 (password errors) and 404 (team not found).

5. **Date formats**: Always use ISO 8601 date format (YYYY-MM-DD) for date parameters.

6. **Week calculations**: Week numbers follow the ISO 8601 standard where weeks start on Monday. Week 1 is the first week with a Thursday in the new year.

## Code Examples

### JavaScript/TypeScript (Fetch API)

```typescript
// Basic request
async function getTeamAvailability(teamCode: string, password?: string) {
  const url = new URL(`https://your-domain.com/api/availability/${teamCode}`);
  if (password) {
    url.searchParams.append('password', password);
  }
  
  const response = await fetch(url.toString());
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch availability');
  }
  
  return await response.json();
}

// Get week availability
async function getWeekAvailability(
  teamCode: string, 
  year: number, 
  week: number, 
  password?: string
) {
  const url = new URL(
    `https://your-domain.com/api/availability/${teamCode}/week/${year}/${week}`
  );
  if (password) {
    url.searchParams.append('password', password);
  }
  
  const response = await fetch(url.toString());
  return await response.json();
}

// Get day availability
async function getDayAvailability(
  teamCode: string, 
  date: string, 
  password?: string
) {
  const url = new URL(
    `https://your-domain.com/api/availability/${teamCode}/day/${date}`
  );
  if (password) {
    url.searchParams.append('password', password);
  }
  
  const response = await fetch(url.toString());
  return await response.json();
}
```

### Python (requests)

```python
import requests
from datetime import datetime

class AvPlannerAPI:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
    
    def get_availability(
        self, 
        team_code: str, 
        password: str = None,
        start_date: str = None,
        end_date: str = None
    ):
        url = f"{self.base_url}/api/availability/{team_code}"
        params = {}
        
        if password:
            params['password'] = password
        if start_date:
            params['startDate'] = start_date
        if end_date:
            params['endDate'] = end_date
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()
    
    def get_day_availability(
        self, 
        team_code: str, 
        date: str,
        password: str = None
    ):
        url = f"{self.base_url}/api/availability/{team_code}/day/{date}"
        params = {'password': password} if password else {}
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()
    
    def get_week_availability(
        self, 
        team_code: str, 
        year: int,
        week: int,
        password: str = None
    ):
        url = f"{self.base_url}/api/availability/{team_code}/week/{year}/{week}"
        params = {'password': password} if password else {}
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()

# Usage
api = AvPlannerAPI("https://your-domain.com")

try:
    # Get availability for a team
    data = api.get_availability("TEAM123", password="secret")
    print(f"Found {len(data['members'])} members")
    
    # Get specific day
    day_data = api.get_day_availability("TEAM123", "2025-01-15")
    print(f"Available: {day_data['summary']['available']}")
    
except requests.HTTPError as e:
    print(f"Error: {e.response.json()}")
```

### cURL Examples

```bash
# Get all availability for a team
curl -X GET "https://your-domain.com/api/availability/TEAM123"

# With password
curl -X GET "https://your-domain.com/api/availability/TEAM123?password=secret123"

# Get date range
curl -X GET "https://your-domain.com/api/availability/TEAM123?startDate=2025-01-01&endDate=2025-01-31"

# Get specific day
curl -X GET "https://your-domain.com/api/availability/TEAM123/day/2025-01-15"

# Get specific week
curl -X GET "https://your-domain.com/api/availability/TEAM123/week/2025/3"

# Get summary statistics
curl -X GET "https://your-domain.com/api/availability/TEAM123/summary?startDate=2025-01-01&endDate=2025-01-31"

# Pretty print JSON response
curl -X GET "https://your-domain.com/api/availability/TEAM123" | jq '.'
```

## Support

For issues or questions about the API, please contact support or create an issue in the project repository.

## Changelog

### Version 1.0.0 (November 2025)
- Initial API release
- Endpoints: general availability, summary, day, week
- Password authentication support
- ISO week support
- Flexible date filtering
