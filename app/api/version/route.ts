import { NextRequest, NextResponse } from 'next/server'
import { getVersionInfoAsync, getDetailedVersionInfoAsync } from '@/lib/version'

export async function GET(request: NextRequest) {
  try {
    const versionInfo = await getVersionInfoAsync()
    const detailedInfo = await getDetailedVersionInfoAsync()

    return NextResponse.json({
      version: versionInfo.version,
      buildInfo: detailedInfo,
      gitCommit: versionInfo.gitCommit,
      gitBranch: versionInfo.gitBranch,
      commitMessage: versionInfo.commitMessage,
      buildDate: versionInfo.buildDate,
      environment: versionInfo.environment
    })
  } catch (error) {
    console.error('Error getting version info:', error)
    return NextResponse.json({
      version: 'Git not available',
      buildInfo: 'Git not available',
      environment: 'unknown'
    })
  }
}
