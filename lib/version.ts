import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

interface VersionInfo {
  version: string
  gitCommit?: string
  gitBranch?: string
  buildDate: string
  environment: string
  commitMessage?: string
}

function extractVersionFromCommitMessage(commitMessage: string): string | null {
  // Look for version patterns in commit message
  const versionPatterns = [
    /v?(\d+\.\d+\.\d+)/i,           // v1.5.0 or 1.5.0
    /version\s+v?(\d+\.\d+\.\d+)/i, // version 1.5.0
    /bump\s+(?:to\s+)?v?(\d+\.\d+\.\d+)/i, // bump to v1.5.0
    /release\s+v?(\d+\.\d+\.\d+)/i, // release v1.5.0
    /^v?(\d+\.\d+\.\d+)/i           // starts with version
  ]
  
  for (const pattern of versionPatterns) {
    const match = commitMessage.match(pattern)
    if (match) {
      return match[1]
    }
  }
  
  return null
}

async function getVersionFromGitHub(): Promise<string> {
  try {
    const response = await fetch('https://api.github.com/repos/JonasVanHove/AvPlanner/commits/main')
    const commit = await response.json()
    
    if (commit && commit.commit && commit.commit.message) {
      return commit.commit.message
    }
    
    return 'Unable to fetch latest commit'
  } catch (error) {
    console.warn('Failed to fetch from GitHub API:', error)
    return 'GitHub API unavailable'
  }
}

function getVersionFromLocalGit(): string | null {
  try {
    // Get the latest commit message and use it as the version
    const latestCommitMessage = execSync('git log -1 --pretty=%s', { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim()
    
    // Return the commit message directly as the version
    return latestCommitMessage || 'No commit message'
    
  } catch (error) {
    // Git not available locally
    return null
  }
}

function getVersionFromGit(): string {
  // First try local git (for development)
  const localVersion = getVersionFromLocalGit()
  if (localVersion) {
    return localVersion
  }
  
  // If local git fails, we'll fetch from GitHub API later
  return 'Fetching from GitHub...'
}

// Cached version info to avoid multiple API calls
let cachedVersionInfo: VersionInfo | null = null

export async function getVersionInfoAsync(): Promise<VersionInfo> {
  try {
    let version: string
    let gitCommit: string | undefined
    let gitBranch: string | undefined
    let commitMessage: string | undefined

    // Try local git first (development)
    const localVersion = getVersionFromLocalGit()
    if (localVersion) {
      version = localVersion
      
      try {
        // Get git commit hash (short)
        gitCommit = execSync('git rev-parse --short HEAD', { 
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore']
        }).trim()
      } catch {
        // Git command failed, ignore
      }

      try {
        // Get git branch name
        gitBranch = execSync('git branch --show-current', { 
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore']
        }).trim()
      } catch {
        // Git command failed, ignore
      }

      try {
        // Get latest commit message
        commitMessage = execSync('git log -1 --pretty=%s', { 
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore']
        }).trim()
      } catch {
        // Git command failed, ignore
      }
    } else {
      // Fetch from GitHub API
      version = await getVersionFromGitHub()
      
      // Try to get commit info from GitHub API
      try {
        const response = await fetch('https://api.github.com/repos/JonasVanHove/AvPlanner/commits/main')
        const commit = await response.json()
        
        if (commit && commit.sha) {
          gitCommit = commit.sha.substring(0, 7) // Short hash
          commitMessage = commit.commit?.message
        }
      } catch {
        // GitHub API failed, ignore
      }
    }

    const versionInfo = {
      version,
      gitCommit,
      gitBranch,
      commitMessage,
      buildDate: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    }
    
    // Cache the result
    cachedVersionInfo = versionInfo
    return versionInfo
    
  } catch (error) {
    console.warn('Could not get version info:', error)
    const fallbackInfo = {
      version: 'Unable to fetch version',
      buildDate: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    }
    cachedVersionInfo = fallbackInfo
    return fallbackInfo
  }
}

export function getVersionInfo(): VersionInfo {
  // Return cached version if available
  if (cachedVersionInfo) {
    return cachedVersionInfo
  }
  
  // Fallback for sync usage - try local git only
  try {
    const localVersion = getVersionFromLocalGit()
    if (localVersion) {
      let gitCommit: string | undefined
      let gitBranch: string | undefined
      
      try {
        gitCommit = execSync('git rev-parse --short HEAD', { 
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore']
        }).trim()
      } catch {}

      try {
        gitBranch = execSync('git branch --show-current', { 
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore']
        }).trim()
      } catch {}
      
      return {
        version: localVersion,
        gitCommit,
        gitBranch,
        commitMessage: localVersion,
        buildDate: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      }
    }
  } catch {}
  
  // Final fallback
  return {
    version: 'Version loading...',
    buildDate: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  }
}

export function getVersionString(): string {
  const info = getVersionInfo()
  let versionString = info.version
  
  if (info.gitCommit) {
    versionString += ` (${info.gitCommit})`
  }
  
  return versionString
}

export async function getVersionStringAsync(): Promise<string> {
  const info = await getVersionInfoAsync()
  let versionString = info.version
  
  if (info.gitCommit) {
    versionString += ` (${info.gitCommit})`
  }
  
  return versionString
}

export function getDetailedVersionInfo(): string {
  const info = getVersionInfo()
  let details = info.version
  
  if (info.gitCommit && info.gitBranch) {
    details += ` • ${info.gitBranch}@${info.gitCommit}`
  } else if (info.gitCommit) {
    details += ` • ${info.gitCommit}`
  }
  
  if (info.environment === 'development') {
    details += ` • dev`
  }
  
  return details
}

export async function getDetailedVersionInfoAsync(): Promise<string> {
  const info = await getVersionInfoAsync()
  let details = info.version
  
  if (info.gitCommit && info.gitBranch) {
    details += ` • ${info.gitBranch}@${info.gitCommit}`
  } else if (info.gitCommit) {
    details += ` • ${info.gitCommit}`
  }
  
  if (info.environment === 'development') {
    details += ` • dev`
  }
  
  return details
}
