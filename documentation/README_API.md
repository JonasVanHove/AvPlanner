# API Documentation Overview

Welcome to the AvPlanner API documentation! This directory contains everything you need to integrate with the AvPlanner availability system.

## 📚 Documentation Files

### English Documentation
- **[API.md](./API.md)** - Complete API reference with detailed examples
  - All endpoints explained
  - Request/response formats
  - Code examples (JavaScript, Python, cURL)
  - Best practices and error handling

### Nederlandse Documentatie
- **[API_NL.md](./API_NL.md)** - Nederlandse snelstart gids
  - Overzicht van alle endpoints
  - Voorbeelden in Nederlands
  - Quick start code voorbeelden

### Testing Tools
- **[AvPlanner_API.postman_collection.json](./AvPlanner_API.postman_collection.json)** - Postman/Insomnia collection
  - Pre-configured API requests
  - Test cases for all endpoints
  - Environment variables setup
  - Error scenario testing

## 🚀 Quick Start

### 1. Basic Request

```bash
# Get team availability
curl "http://localhost:3000/api/availability/TEAM123"

# With password
curl "http://localhost:3000/api/availability/TEAM123?password=secret"
```

### 2. Get Specific Day

```bash
curl "http://localhost:3000/api/availability/TEAM123/day/2025-01-15"
```

### 3. Get Week Data

```bash
curl "http://localhost:3000/api/availability/TEAM123/week/2025/3"
```

### 4. Get Summary

```bash
curl "http://localhost:3000/api/availability/TEAM123/summary"
```

## 📋 Available Endpoints

| Endpoint | Description | Documentation |
|----------|-------------|---------------|
| `GET /api/availability/{teamCode}` | Get team availability with flexible filtering | [Docs](./API.md#1-get-team-availability) |
| `GET /api/availability/{teamCode}/summary` | Get statistical summary | [Docs](./API.md#2-get-team-summary) |
| `GET /api/availability/{teamCode}/day/{date}` | Get specific day availability | [Docs](./API.md#3-get-day-availability) |
| `GET /api/availability/{teamCode}/week/{year}/{week}` | Get week availability | [Docs](./API.md#4-get-week-availability) |

## 🔑 Authentication

For password-protected teams, add the password as a query parameter:

```
?password=your-team-password
```

## 🧪 Testing the API

### Option 1: Use Test Scripts

We provide test scripts in both JavaScript and Python:

**Node.js:**
```bash
cd scripts
node test-api.js TEAM123 optional-password
```

**Python:**
```bash
cd scripts
python test-api.py TEAM123 optional-password
```

### Option 2: Use Postman/Insomnia

1. Import the collection: `AvPlanner_API.postman_collection.json`
2. Update environment variables:
   - `base_url`: Your API base URL (default: `http://localhost:3000`)
   - `team_code`: Your team code
   - `team_password`: Optional password
3. Run requests or entire test suite

### Option 3: Manual Testing with cURL

See examples in [API.md](./API.md) or [API_NL.md](./API_NL.md)

## 📊 Response Format

All responses are in JSON format:

```json
{
  "team": {
    "id": "uuid",
    "name": "Team Name",
    "invite_code": "TEAM123"
  },
  "members": [...],
  "availability": [...]
}
```

## ⚠️ Error Handling

| Status Code | Description |
|-------------|-------------|
| `200` | Success |
| `400` | Bad request (invalid parameters) |
| `401` | Unauthorized (password required/invalid) |
| `404` | Team not found |
| `500` | Internal server error |

Error response format:
```json
{
  "error": "Error message",
  "message": "Optional detailed message"
}
```

## 💡 Common Use Cases

### 1. Display Team Availability on Website

```javascript
async function displayTeamAvailability(teamCode, password) {
  const response = await fetch(
    `https://your-domain.com/api/availability/${teamCode}/day/${today}?password=${password}`
  );
  const data = await response.json();
  
  // Display members and their availability
  data.members.forEach(member => {
    console.log(`${member.full_name}: ${member.availability || 'No data'}`);
  });
}
```

### 2. Weekly Report Generation

```python
import requests

def generate_weekly_report(team_code, year, week, password=None):
    url = f"https://your-domain.com/api/availability/{team_code}/week/{year}/{week}"
    params = {'password': password} if password else {}
    
    response = requests.get(url, params=params)
    data = response.json()
    
    print(f"Week {week} Report:")
    print(f"Total Available: {data['week_summary']['total_available']}")
    print(f"Total Unavailable: {data['week_summary']['total_unavailable']}")
```

### 3. Integration with Calendar Systems

```javascript
async function syncToCalendar(teamCode, password) {
  const today = new Date();
  const startDate = today.toISOString().split('T')[0];
  const endDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];
  
  const response = await fetch(
    `https://your-domain.com/api/availability/${teamCode}?` +
    `startDate=${startDate}&endDate=${endDate}&password=${password}`
  );
  
  const data = await response.json();
  
  // Process availability data for calendar sync
  data.availability.forEach(entry => {
    // Add to calendar...
  });
}
```

## 🔒 Security Notes

- Passwords are Base64 encoded (simple implementation)
- No rate limiting is currently implemented
- Consider adding API keys for production use
- All endpoints are publicly accessible (with password auth where needed)
- Store passwords securely on the client side

## 🛠️ Development

### Running Locally

```bash
# Start the development server
npm run dev

# Test API endpoints
curl "http://localhost:3000/api/availability/TEAM123"
```

### Adding New Endpoints

See the [API README](../app/api/availability/README.md) for guidelines on adding new endpoints.

## 📖 Additional Resources

- [Main README](../README.md) - Project overview
- [Setup Guide](./setup/) - Installation and configuration
- [User Guide](./user-guide/) - How to use the application
- [API Implementation](../app/api/availability/) - Source code

## 🆘 Support

For issues or questions:
1. Check the [troubleshooting guide](./troubleshooting/)
2. Review the complete [API documentation](./API.md)
3. Test with the provided test scripts
4. Create an issue in the repository

## 📝 Changelog

### Version 1.0.0 (November 2025)
- ✅ Initial API release
- ✅ General availability endpoint with flexible filtering
- ✅ Summary statistics endpoint
- ✅ Day-specific endpoint
- ✅ Week-based endpoint
- ✅ Password authentication support
- ✅ ISO week support
- ✅ Complete documentation (EN/NL)
- ✅ Test scripts (Node.js/Python)
- ✅ Postman collection

---

**Made with ❤️ for the AvPlanner project**
