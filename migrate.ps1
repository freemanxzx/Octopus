$ErrorActionPreference = "Stop"

Write-Host "1. Cleaning legacy buildup folders..."
Remove-Item -Recurse -Force node_modules, dist, build, release, dist-electron -ErrorAction SilentlyContinue

Write-Host "2. Creating OctopusMD directory..."
New-Item -ItemType Directory -Force -Path OctopusMD

Write-Host "3. Moving essential source folders..."
$folders = @("src", "public", "electron", "extension", "scripts")
foreach ($f in $folders) {
    if (Test-Path $f) {
        Move-Item -Path $f -Destination "OctopusMD\"
    }
}

Write-Host "4. Moving configuration files..."
$files = Get-ChildItem -File | Where-Object { $_.Name -like "*.json" -or $_.Name -like "*.html" -or $_.Name -like "*.cjs" -or $_.Name -like "*.js" -or $_.Name -like "*.bat" -or $_.Name -like ".npmrc" -or $_.Name -like ".vscode" }
foreach ($file in $files) {
    if ($file.Name -ne "migrate.ps1") {
        Move-Item -Path $file.FullName -Destination "OctopusMD\"
    }
}

Write-Host "5. Handling old editor backups..."
New-Item -ItemType Directory -Force -Path "OctopusMD\reference"
$backups = Get-ChildItem -File | Where-Object { $_.Name -like "old_editor_*" }
foreach ($b in $backups) {
    Move-Item -Path $b.FullName -Destination "OctopusMD\reference\"
}

Write-Host "Migration complete!"
