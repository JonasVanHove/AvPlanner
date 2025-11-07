# AvPlanner API Endpoints

This directory contains the API endpoints for accessing AvPlanner availability data.

## Directory Structure

```
api/availability/
├── [teamCode]/
│   ├── route.ts                    # Main availability endpoint
│   ├── summary/
│   │   └── route.ts                # Team summary statistics
│   ├── day/
│   │   └── [date]/
│   │       └── route.ts            # Single day availability
│   └── week/
│       └── [year]/
│           └── [week]/
│               └── route.ts        # Week availability
```

## Endpoints Overview

### 1. General Availability (`/api/availability/[teamCode]`)
- **File**: `[teamCode]/route.ts`
- **Purpose**: Flexible availability retrieval with various filtering options
- **Supports**: Date ranges, specific dates, week numbers, member filtering

### 2. Summary Statistics (`/api/availability/[teamCode]/summary`)
- **File**: `[teamCode]/summary/route.ts`
- **Purpose**: Get overview statistics without detailed data
- **Returns**: Member counts, availability statistics, date coverage

### 3. Day Availability (`/api/availability/[teamCode]/day/[date]`)
- **File**: `[teamCode]/day/[date]/route.ts`
- **Purpose**: Detailed availability for a specific date
- **Returns**: All members with their status for that day + summary

### 4. Week Availability (`/api/availability/[teamCode]/week/[year]/[week]`)
- **File**: `[teamCode]/week/[year]/[week]/route.ts`
- **Purpose**: Full week overview (Monday-Sunday, ISO week)
- **Returns**: Daily breakdown + weekly totals

## Common Features

All endpoints support:
- ✅ Team lookup by invite code or slug
- ✅ Password authentication for protected teams
- ✅ Hidden member filtering
- ✅ Consistent error handling
- ✅ JSON responses

## Authentication

For password-protected teams, include the password as a query parameter:
```
?password=your-team-password
```

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200`: Success
- `400`: Bad request (invalid parameters)
- `401`: Unauthorized (password required/invalid)
- `404`: Team not found
- `500`: Internal server error

## Usage Examples

See the full documentation in `/documentation/API.md` for:
- Detailed parameter descriptions
- Request/response examples
- Code samples (JavaScript, Python, cURL)
- Best practices

Quick test with cURL:
```bash
# Test basic endpoint
curl "http://localhost:3000/api/availability/TEAM123"

# With password
curl "http://localhost:3000/api/availability/TEAM123?password=secret"

# Specific day
curl "http://localhost:3000/api/availability/TEAM123/day/2025-01-15"

# Summary
curl "http://localhost:3000/api/availability/TEAM123/summary"
```

## Development Notes

### Adding New Endpoints

When adding new endpoints, ensure:
1. Proper TypeScript types for params
2. Password authentication check for protected teams
3. Team lookup by both invite_code and slug
4. Consistent error response format
5. Documentation update in `/documentation/API.md`

### Database Queries

All endpoints use the Supabase client from `@/lib/supabase`:
- Teams table: `id`, `name`, `slug`, `invite_code`, `password_hash`, `is_password_protected`
- Members table: `id`, `team_id`, `first_name`, `last_name`, `email`, `role`, `status`, `is_hidden`
- Availability table: `id`, `member_id`, `date`, `status`, `created_at`, `updated_at`

### Performance Considerations

- Use `.in()` for bulk member queries
- Apply filters early (date range, member_id)
- Order results consistently
- Consider caching for frequently accessed data

## Testing

Test each endpoint with:
1. Valid team code
2. Invalid team code (should return 404)
3. Password-protected team without password (should return 401)
4. Password-protected team with wrong password (should return 401)
5. Various date formats and ranges
6. Hidden member filtering

Example test:
```bash
# Should return 404
curl "http://localhost:3000/api/availability/INVALID"

# Should return 401
curl "http://localhost:3000/api/availability/PROTECTED_TEAM"

# Should succeed
curl "http://localhost:3000/api/availability/PROTECTED_TEAM?password=correct"
```

## Related Documentation

- [Full API Documentation](../../documentation/API.md) - Complete API reference
- [Dutch Quick Start](../../documentation/API_NL.md) - Nederlandse snelstart gids
- [Supabase Setup](../../documentation/setup/) - Database configuration

## Security Notes

- Passwords are Base64 encoded (simple implementation)
- No rate limiting is currently implemented
- Consider adding API keys for production use
- All endpoints are publicly accessible (with password auth where needed)
