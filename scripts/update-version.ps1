# PowerShell script to update version and commit
param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("patch", "minor", "major")]
    [string]$Type = "patch"
)

Write-Host "Updating version with type: $Type" -ForegroundColor Green

try {
    # Update version in package.json
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    $currentVersion = $packageJson.version
    Write-Host "Current version: $currentVersion" -ForegroundColor Yellow
    
    $versionParts = $currentVersion.Split('.')
    $major = [int]$versionParts[0]
    $minor = [int]$versionParts[1]
    $patch = [int]$versionParts[2]
    
    switch ($Type) {
        "major" { 
            $newVersion = "$($major + 1).0.0"
        }
        "minor" { 
            $newVersion = "$major.$($minor + 1).0"
        }
        "patch" { 
            $newVersion = "$major.$minor.$($patch + 1)"
        }
    }
    
    $packageJson.version = $newVersion
    $packageJson | ConvertTo-Json -Depth 10 | Set-Content "package.json"
    
    Write-Host "Updated version to: $newVersion" -ForegroundColor Green
    
    # Commit changes if in git repo
    $gitStatus = git status --porcelain 2>$null
    if ($LASTEXITCODE -eq 0) {
        git add package.json
        git commit -m "chore: bump version to v$newVersion"
        Write-Host "Committed version bump to v$newVersion" -ForegroundColor Green
    } else {
        Write-Host "Not in a git repository" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "Error updating version: $_" -ForegroundColor Red
    exit 1
}
