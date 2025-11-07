#!/usr/bin/env python3

"""
Quick API Test Script (Python)

This script tests all AvPlanner API endpoints
Run with: python test-api.py [teamCode] [password]
"""

import sys
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import requests

# Configuration
BASE_URL = "http://localhost:3000"
TEAM_CODE = sys.argv[1] if len(sys.argv) > 1 else "TEAM123"
PASSWORD = sys.argv[2] if len(sys.argv) > 2 else ""


# Colors for console output
class Colors:
    RESET = "\033[0m"
    GREEN = "\033[32m"
    RED = "\033[31m"
    YELLOW = "\033[33m"
    BLUE = "\033[34m"
    CYAN = "\033[36m"


def log(message: str, color: str = "RESET"):
    """Print colored message"""
    color_code = getattr(Colors, color, Colors.RESET)
    print(f"{color_code}{message}{Colors.RESET}")


def test_endpoint(name: str, url: str, expected_status: int = 200) -> Dict[str, Any]:
    """Test a single endpoint"""
    try:
        log(f"\nTesting: {name}", "CYAN")
        log(f"URL: {url}", "BLUE")

        response = requests.get(url)
        data = response.json()

        if response.status_code == expected_status:
            log(
                f"✓ Status: {response.status_code} (Expected: {expected_status})",
                "GREEN",
            )
            log(f"✓ Response received", "GREEN")

            # Show some data details
            if "team" in data:
                log(f"  Team: {data['team']['name']}", "YELLOW")
            if "members" in data:
                log(f"  Members: {len(data['members'])}", "YELLOW")
            if "availability" in data:
                log(f"  Availability entries: {len(data['availability'])}", "YELLOW")
            if "statistics" in data:
                log(f"  Stats: {data['statistics']['availability']}", "YELLOW")

            return {"success": True, "data": data}
        else:
            log(
                f"✗ Unexpected status: {response.status_code} (Expected: {expected_status})",
                "RED",
            )
            log(f"  Response: {data}", "RED")
            return {"success": False, "data": data}
    except Exception as error:
        log(f"✗ Error: {str(error)}", "RED")
        return {"success": False, "error": str(error)}


def get_week_number(date: datetime) -> int:
    """Get ISO week number"""
    return date.isocalendar()[1]


def run_tests():
    """Run all API tests"""
    log("═══════════════════════════════════════", "CYAN")
    log("  AvPlanner API Test Suite (Python)", "CYAN")
    log("═══════════════════════════════════════", "CYAN")
    log(f"Base URL: {BASE_URL}", "BLUE")
    log(f"Team Code: {TEAM_CODE}", "BLUE")
    log(f"Password: {'***' if PASSWORD else '(none)'}", "BLUE")

    results = []

    # Test 1: General Availability
    url = f"{BASE_URL}/api/availability/{TEAM_CODE}"
    if PASSWORD:
        url += f"?password={PASSWORD}"
    results.append(test_endpoint("1. Get All Availability", url))

    # Test 2: Availability with Date Range
    today = datetime.now()
    start_date = (today - timedelta(days=7)).strftime("%Y-%m-%d")
    end_date = (today + timedelta(days=7)).strftime("%Y-%m-%d")

    url = f"{BASE_URL}/api/availability/{TEAM_CODE}?startDate={start_date}&endDate={end_date}"
    if PASSWORD:
        url += f"&password={PASSWORD}"
    results.append(test_endpoint("2. Get Availability with Date Range", url))

    # Test 3: Summary
    url = f"{BASE_URL}/api/availability/{TEAM_CODE}/summary"
    if PASSWORD:
        url += f"?password={PASSWORD}"
    results.append(test_endpoint("3. Get Team Summary", url))

    # Test 4: Day Availability
    test_date = today.strftime("%Y-%m-%d")
    url = f"{BASE_URL}/api/availability/{TEAM_CODE}/day/{test_date}"
    if PASSWORD:
        url += f"?password={PASSWORD}"
    results.append(test_endpoint("4. Get Day Availability", url))

    # Test 5: Week Availability
    year = today.year
    week = get_week_number(today)
    url = f"{BASE_URL}/api/availability/{TEAM_CODE}/week/{year}/{week}"
    if PASSWORD:
        url += f"?password={PASSWORD}"
    results.append(test_endpoint("5. Get Week Availability", url))

    # Test 6: Error Cases
    results.append(
        test_endpoint(
            "6. Invalid Team Code (should fail)",
            f"{BASE_URL}/api/availability/INVALID_TEAM",
            404,
        )
    )

    url = f"{BASE_URL}/api/availability/{TEAM_CODE}/day/invalid-date"
    if PASSWORD:
        url += f"?password={PASSWORD}"
    results.append(test_endpoint("7. Invalid Date Format (should fail)", url, 400))

    # Summary
    log("\n═══════════════════════════════════════", "CYAN")
    log("  Test Summary", "CYAN")
    log("═══════════════════════════════════════", "CYAN")

    passed = sum(1 for r in results if r["success"])
    failed = len(results) - passed

    log(f"Total: {len(results)}", "BLUE")
    log(f"Passed: {passed}", "GREEN")
    log(f"Failed: {failed}", "RED" if failed > 0 else "GREEN")

    if failed == 0:
        log("\n✓ All tests passed!", "GREEN")
    else:
        log("\n✗ Some tests failed", "RED")
        sys.exit(1)


if __name__ == "__main__":
    try:
        run_tests()
    except Exception as error:
        log(f"\nFatal error: {str(error)}", "RED")
        sys.exit(1)
