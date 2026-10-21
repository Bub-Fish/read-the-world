$ErrorActionPreference = 'Stop'
$projectDirectory = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
Push-Location -LiteralPath $projectDirectory
try {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed; Android package was not created.' }

    $releaseDirectory = Join-Path $projectDirectory 'releases'
    New-Item -ItemType Directory -Path $releaseDirectory -Force | Out-Null
    $archivePath = Join-Path $releaseDirectory 'readworld-android.zip'
    # Explicit list: never bundle local data, API keys, .env, .git or Windows node_modules.
    $entries = @(
        'dist', 'server', 'src', 'public', 'deploy',
        'package.json', 'package-lock.json', 'README.md',
        'index.html', 'vite.config.ts', 'tsconfig.json'
    ) | ForEach-Object { Join-Path $projectDirectory $_ }
    Compress-Archive -LiteralPath $entries -DestinationPath $archivePath -Force
    Write-Output "Android package: $archivePath"
    Get-FileHash -LiteralPath $archivePath -Algorithm SHA256
} finally {
    Pop-Location
}
