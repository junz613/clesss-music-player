param(
  [string]$HostName = "127.0.0.1",
  [int]$Port = 3306,
  [string]$User = "root",
  [string]$Database = "clesss_music_player",
  [string]$MusicRoot = "D:\ClessS"
)

$ErrorActionPreference = "Stop"

# PowerShell 的 SecureString 不能直接拼接 DATABASE_URL，这里只在内存中短暂转为明文。
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

# MYSQL_PWD 只在当前进程里临时存在，避免把密码写进命令行历史。
$env:MYSQL_PWD = $password
try {
  & $mysql.Source -h $HostName -P $Port -u $User -e "CREATE DATABASE IF NOT EXISTS ``$Database`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
} finally {
  Remove-Item Env:MYSQL_PWD -ErrorAction SilentlyContinue
}

$workspaceRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
$envPath = Join-Path $workspaceRoot ".env"
$serverEnvPath = Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")) ".env"

# Prisma CLI 默认读取 server/.env，运行时代码也会向上兼容读取仓库根目录 .env。
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
