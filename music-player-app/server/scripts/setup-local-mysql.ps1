param(
  [string]$HostName = "127.0.0.1",
  [int]$Port = 3306,
  [string]$User = "root",
  [string]$Database = "clesss_music_player",
  [string]$MusicRoot = "D:\ClessS"
)

$ErrorActionPreference = "Stop"

function ConvertTo-PlainText {
  param([securestring]$SecureValue)

  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
  try {
    [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

$mysql = Get-Command mysql -ErrorAction Stop
$securePassword = Read-Host "MySQL password for user '$User'" -AsSecureString
$password = ConvertTo-PlainText $securePassword
$escapedPassword = [System.Uri]::EscapeDataString($password)
$databaseUrl = "mysql://$User`:$escapedPassword@$HostName`:$Port/$Database"

$env:MYSQL_PWD = $password
try {
  & $mysql.Source -h $HostName -P $Port -u $User -e "CREATE DATABASE IF NOT EXISTS ``$Database`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
} finally {
  Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
}

$workspaceRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$envPath = Join-Path $workspaceRoot ".env"
$serverEnvPath = Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")) ".env"

$envContent = @"
NODE_ENV=development

CLIENT_PORT=5173
SERVER_PORT=3000
CLIENT_ORIGIN=http://localhost:5173

MYSQL_HOST=$HostName
MYSQL_PORT=$Port
MYSQL_USER=$User
MYSQL_PASSWORD=$password
MYSQL_DATABASE=$Database
DATABASE_URL="$databaseUrl"

MUSIC_ROOT="$MusicRoot"
UPLOAD_FOLDER="ClessS 本地上传"

ADMIN_PASSWORD=change-this-admin-password
ADMIN_TOKEN_SECRET=change-this-token-secret
"@

$envContent | Set-Content -Encoding UTF8 -LiteralPath $envPath
$envContent | Set-Content -Encoding UTF8 -LiteralPath $serverEnvPath

Write-Host "Database '$Database' is ready."
Write-Host ".env written to $envPath"
Write-Host "Server .env written to $serverEnvPath"
Write-Host "Next:"
Write-Host "  cd $workspaceRoot\music-player-app"
Write-Host "  pnpm --dir server prisma:push"
Write-Host "  pnpm --dir server songs:scan"
