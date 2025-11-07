#!/usr/bin/env node

/**
 * Quick API Test Script
 * 
 * This script tests all AvPlanner API endpoints
 * Run with: node test-api.js [teamCode] [password]
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEAM_CODE = process.argv[2] || 'TEAM123';
const PASSWORD = process.argv[3] || '';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(name, url, expectedStatus = 200) {
  try {
    log(`\nTesting: ${name}`, 'cyan');
    log(`URL: ${url}`, 'blue');
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.status === expectedStatus) {
      log(`✓ Status: ${response.status} (Expected: ${expectedStatus})`, 'green');
      log(`✓ Response received`, 'green');
      
      // Show some data details
      if (data.team) {
        log(`  Team: ${data.team.name}`, 'yellow');
      }
      if (data.members) {
        log(`  Members: ${data.members.length}`, 'yellow');
      }
      if (data.availability) {
        log(`  Availability entries: ${data.availability.length}`, 'yellow');
      }
      if (data.statistics) {
        log(`  Stats: ${JSON.stringify(data.statistics.availability)}`, 'yellow');
      }
      
      return { success: true, data };
    } else {
      log(`✗ Unexpected status: ${response.status} (Expected: ${expectedStatus})`, 'red');
      log(`  Response: ${JSON.stringify(data)}`, 'red');
      return { success: false, data };
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return { success: false, error };
  }
}

async function runTests() {
  log('═══════════════════════════════════════', 'cyan');
  log('  AvPlanner API Test Suite', 'cyan');
  log('═══════════════════════════════════════', 'cyan');
  log(`Base URL: ${BASE_URL}`, 'blue');
  log(`Team Code: ${TEAM_CODE}`, 'blue');
  log(`Password: ${PASSWORD ? '***' : '(none)'}`, 'blue');
  
  const results = [];
  
  // Test 1: General Availability
  results.push(await testEndpoint(
    '1. Get All Availability',
    `${BASE_URL}/api/availability/${TEAM_CODE}${PASSWORD ? `?password=${PASSWORD}` : ''}`
  ));
  
  // Test 2: Availability with Date Range
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 7);
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 7);
  
  results.push(await testEndpoint(
    '2. Get Availability with Date Range',
    `${BASE_URL}/api/availability/${TEAM_CODE}?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}${PASSWORD ? `&password=${PASSWORD}` : ''}`
  ));
  
  // Test 3: Summary
  results.push(await testEndpoint(
    '3. Get Team Summary',
    `${BASE_URL}/api/availability/${TEAM_CODE}/summary${PASSWORD ? `?password=${PASSWORD}` : ''}`
  ));
  
  // Test 4: Day Availability
  const testDate = today.toISOString().split('T')[0];
  results.push(await testEndpoint(
    '4. Get Day Availability',
    `${BASE_URL}/api/availability/${TEAM_CODE}/day/${testDate}${PASSWORD ? `?password=${PASSWORD}` : ''}`
  ));
  
  // Test 5: Week Availability
  const year = today.getFullYear();
  const week = getWeekNumber(today);
  results.push(await testEndpoint(
    '5. Get Week Availability',
    `${BASE_URL}/api/availability/${TEAM_CODE}/week/${year}/${week}${PASSWORD ? `?password=${PASSWORD}` : ''}`
  ));
  
  // Test 6: Error Cases
  results.push(await testEndpoint(
    '6. Invalid Team Code (should fail)',
    `${BASE_URL}/api/availability/INVALID_TEAM`,
    404
  ));
  
  results.push(await testEndpoint(
    '7. Invalid Date Format (should fail)',
    `${BASE_URL}/api/availability/${TEAM_CODE}/day/invalid-date${PASSWORD ? `?password=${PASSWORD}` : ''}`,
    400
  ));
  
  // Summary
  log('\n═══════════════════════════════════════', 'cyan');
  log('  Test Summary', 'cyan');
  log('═══════════════════════════════════════', 'cyan');
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  log(`Total: ${results.length}`, 'blue');
  log(`Passed: ${passed}`, 'green');
  log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  
  if (failed === 0) {
    log('\n✓ All tests passed!', 'green');
  } else {
    log('\n✗ Some tests failed', 'red');
    process.exit(1);
  }
}

// Helper function to get ISO week number
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

// Run tests
runTests().catch(error => {
  log(`\nFatal error: ${error.message}`, 'red');
  process.exit(1);
});
