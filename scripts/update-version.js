#!/usr/bin/env node

const fs = require('fs')
const { execSync } = require('child_process')

const packagePath = './package.json'
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))

function updateVersion(type) {
  const [major, minor, patch] = pkg.version.split('.').map(Number)
  
  switch (type) {
    case 'major':
      pkg.version = `${major + 1}.0.0`
      break
    case 'minor':
      pkg.version = `${major}.${minor + 1}.0`
      break
    case 'patch':
    default:
      pkg.version = `${major}.${minor}.${patch + 1}`
      break
  }
  
  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n')
  console.log(`Version updated to ${pkg.version}`)
  
  // Auto commit if in git repo
  try {
    execSync('git status --porcelain', { stdio: 'ignore' })
    execSync(`git add package.json`)
    execSync(`git commit -m "chore: bump version to v${pkg.version}"`)
    console.log(`Committed version bump to v${pkg.version}`)
  } catch (error) {
    console.log('Not in a git repository or no changes to commit')
  }
}

const type = process.argv[2] || 'patch'
updateVersion(type)
