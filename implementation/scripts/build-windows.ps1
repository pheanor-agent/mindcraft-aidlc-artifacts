param([string]$OutputRoot = (Join-Path $PSScriptRoot '../../dist'))
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot
$OutputRoot = [IO.Path]::GetFullPath($OutputRoot)
$package = Join-Path $OutputRoot 'windows-package'
$cache = Join-Path $OutputRoot 'build-cache'
New-Item -ItemType Directory -Force -Path $cache | Out-Null
$nodeVersion = '22.19.0'
$archiveName = "node-v$nodeVersion-win-x64.zip"
$archive = Join-Path $cache $archiveName
if (-not (Test-Path $archive)) { Invoke-WebRequest "https://nodejs.org/dist/v$nodeVersion/$archiveName" -OutFile $archive }
$sums = (Invoke-WebRequest "https://nodejs.org/dist/v$nodeVersion/SHASUMS256.txt" -UseBasicParsing).Content
$expected = ($sums -split "`n" | Where-Object { $_.Trim().EndsWith(" $archiveName") }).Trim().Split(' ')[0]
if (-not $expected -or (Get-FileHash $archive -Algorithm SHA256).Hash -ne $expected) { throw 'Node archive SHA-256 mismatch' }
& tar.exe -xf $archive -C $cache
if ($LASTEXITCODE -ne 0) { throw 'Runtime extraction failed' }
$current = Join-Path $package 'current'
$app = Join-Path $current 'app'
New-Item -ItemType Directory -Force -Path $app | Out-Null
$copyScript = "require('node:fs').cpSync(process.argv[1],process.argv[2],{recursive:true,force:true})"
& node -e $copyScript (Join-Path $cache "node-v$nodeVersion-win-x64") (Join-Path $current 'runtime')
if ($LASTEXITCODE -ne 0) { throw 'Runtime copy failed' }
foreach ($name in @('src', 'node_modules', 'package.json', 'package-lock.json', 'README.md', 'ROUTING.md')) {
  & node -e $copyScript (Join-Path $repo $name) (Join-Path $app $name)
  if ($LASTEXITCODE -ne 0) { throw "Copy failed: $name" }
}
$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
$vs = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (-not $vs) { throw 'Visual Studio C++ x64 build tools are required to build native binaries.' }
$vcvars = Join-Path $vs 'VC\Auxiliary\Build\vcvars64.bat'
$compile = Join-Path $cache 'compile.cmd'
@"
@echo off
call "$vcvars"
if errorlevel 1 exit /b 1
cl /nologo /O2 /MT /W3 "$repo\native\windows-launcher.c" /Fo"$cache\windows-launcher.obj" /Fe"$package\MindCraft.exe" /link user32.lib
if errorlevel 1 exit /b 1
cl /nologo /O2 /MT /W3 "$repo\native\wincred-helper.c" /Fo"$cache\wincred-helper.obj" /Fe"$current\wincred-helper.exe" /link advapi32.lib
exit /b %errorlevel%
"@ | Set-Content -LiteralPath $compile -Encoding ascii
& $env:ComSpec /d /c "`"$compile`""
if ($LASTEXITCODE -ne 0) { throw 'Native compilation failed' }
Push-Location $repo
try {
  & npm.cmd sbom --sbom-format cyclonedx --omit dev | Set-Content (Join-Path $app 'sbom.json') -Encoding utf8
  if ($LASTEXITCODE -ne 0) { throw 'SBOM generation failed' }
  $revision = & git rev-parse HEAD
  & (Join-Path $current 'runtime/node.exe') scripts/generate-windows-manifest.mjs $current '0.1.0' $revision
  if ($LASTEXITCODE -ne 0) { throw 'Manifest generation failed' }
} finally { Pop-Location }
Write-Output "Portable executable: $package\MindCraft.exe"
