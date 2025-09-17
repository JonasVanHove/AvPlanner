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

function getVersionFromGit(): string {
  try {
    // Get the latest commit message
    const latestCommitMessage = execSync('git log -1 --pretty=%s', { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim()
    
    // Try to extract version from commit message
    const versionFromCommit = extractVersionFromCommitMessage(latestCommitMessage)
    if (versionFromCommit) {
      return versionFromCommit
    }
    
    // Fallback: look through recent commits for version
    const recentCommits = execSync('git log --oneline -10', { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).split('\n')
    
    for (const commit of recentCommits) {
      const version = extractVersionFromCommitMessage(commit)
      if (version) {
        return version
      }
    }
    
    // Ultimate fallback: count commits as patch version
    const commitCount = execSync('git rev-list --count HEAD', { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim()
    
    return `1.5.${commitCount}`
    
  } catch (error) {
    // Git not available or not in a git repo
    return '1.5.0'
  }
}

export function getVersionInfo(): VersionInfo {
  try {
    // Get version from git commits
    const version = getVersionFromGit()
    
    let gitCommit: string | undefined
    let gitBranch: string | undefined
    let commitMessage: string | undefined

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

    return {
      version,
      gitCommit,
      gitBranch,
      commitMessage,
      buildDate: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    }
  } catch (error) {
    console.warn('Could not get version info:', error)
    return {
      version: '1.5.0',
      buildDate: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    }
  }
}

export function getVersionString(): string {
  const info = getVersionInfo()
  let versionString = `v${info.version}`
  
  if (info.gitCommit) {
    versionString += ` (${info.gitCommit})`
  }
  
  return versionString
}

export function getDetailedVersionInfo(): string {
  const info = getVersionInfo()
  let details = `v${info.version}`
  
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
