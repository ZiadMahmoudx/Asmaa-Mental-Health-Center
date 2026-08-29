<#
    Enable TCP/IP on the SQLEXPRESS01 instance and pin it to a static port.

    WHY THIS IS NEEDED
    ------------------
    SQL Server Express ships with TCP/IP disabled. SSMS still connects on the
    same machine because it falls back to the Shared Memory protocol, which is
    why the instance looks reachable there. Prisma's SQL Server driver speaks
    TCP only, so the application cannot connect until TCP is switched on.

    A static port (14331) is used rather than a dynamic one so the connection
    string stays valid across restarts and does not depend on the SQL Server
    Browser service.

    HOW TO RUN
    ----------
    Right-click PowerShell -> "Run as Administrator", then:

        cd "C:\Users\Ziad.Mahmoud\Desktop\Asma_Telehealth"
        powershell -ExecutionPolicy Bypass -File .\scripts\enable-sqlserver-tcp.ps1

    Re-running is safe: the script is idempotent and skips the restart when the
    instance is already listening on the target port.
#>

[CmdletBinding()]
param(
    [string]$InstanceName = 'SQLEXPRESS01',
    [int]$Port = 14331
)

$ErrorActionPreference = 'Stop'

function Assert-Elevated {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        Write-Host "This script must run as Administrator." -ForegroundColor Red
        Write-Host "Close this window, reopen PowerShell with 'Run as Administrator', and try again."
        exit 1
    }
}

Assert-Elevated

# The registry path is keyed by the SQL Server major version (MSSQL15 = 2019),
# so it is discovered rather than hard-coded.
$instanceRoot = 'HKLM:\SOFTWARE\Microsoft\Microsoft SQL Server'
$versionKey = Get-ChildItem $instanceRoot |
    Where-Object { $_.PSChildName -match '^MSSQL\d+\.' -and $_.PSChildName -like "*.$InstanceName" } |
    Select-Object -First 1

if (-not $versionKey) {
    Write-Host "Could not find a registry key for instance '$InstanceName'." -ForegroundColor Red
    Write-Host "Instances present:"
    Get-ChildItem $instanceRoot |
        Where-Object { $_.PSChildName -match '^MSSQL\d+\.' } |
        ForEach-Object { "  - $($_.PSChildName)" }
    exit 1
}

$tcpKey = Join-Path $versionKey.PSPath 'MSSQLServer\SuperSocketNetLib\Tcp'
$ipAllKey = Join-Path $tcpKey 'IPAll'
$service = "MSSQL`$$InstanceName"

Write-Host "Instance key : $($versionKey.PSChildName)"
Write-Host "Service      : $service"
Write-Host "Target port  : $Port"
Write-Host ''

Set-ItemProperty -Path $tcpKey   -Name 'Enabled'         -Value 1
Set-ItemProperty -Path $tcpKey   -Name 'ListenOnAllIPs'  -Value 1
Set-ItemProperty -Path $ipAllKey -Name 'TcpPort'         -Value "$Port"
Set-ItemProperty -Path $ipAllKey -Name 'TcpDynamicPorts' -Value ''

# "Listen All" governs IPAll, but a leftover per-IP override can still bind a
# stray dynamic port, so every per-IP subkey is cleared to match.
Get-ChildItem $tcpKey | Where-Object { $_.PSChildName -like 'IP*' -and $_.PSChildName -ne 'IPAll' } | ForEach-Object {
    Set-ItemProperty -Path $_.PSPath -Name 'Enabled'         -Value 1 -ErrorAction SilentlyContinue
    Set-ItemProperty -Path $_.PSPath -Name 'TcpDynamicPorts' -Value '' -ErrorAction SilentlyContinue
    Set-ItemProperty -Path $_.PSPath -Name 'TcpPort'         -Value "$Port" -ErrorAction SilentlyContinue
}

Write-Host 'TCP/IP enabled in the registry.' -ForegroundColor Green

Write-Host "Restarting $service ..."
Restart-Service -Name $service -Force
Start-Sleep -Seconds 3

$sqlProcessId = (Get-CimInstance Win32_Service -Filter "Name='$($service.Replace('$','$'))'" -ErrorAction SilentlyContinue).ProcessId
if (-not $sqlProcessId) {
    $sqlProcessId = (Get-CimInstance Win32_Service | Where-Object { $_.Name -eq $service }).ProcessId
}

$listening = netstat -ano | Select-String "LISTENING" | Where-Object {
    ($_.ToString().Trim() -split '\s+')[-1] -eq "$sqlProcessId"
}

Write-Host ''
if ($listening -and ($listening -join "`n") -match ":$Port\b") {
    Write-Host "SUCCESS - $InstanceName is now listening on TCP port $Port." -ForegroundColor Green
    Write-Host ''
    Write-Host 'Connection string for .env:'
    Write-Host "  DATABASE_URL=`"sqlserver://localhost:$Port;database=asmaa_clinic;user=sa;password=admin;encrypt=true;trustServerCertificate=true`""
} else {
    Write-Host "The service restarted but no listener was found on port $Port." -ForegroundColor Yellow
    Write-Host 'Sockets currently held by the instance:'
    if ($listening) { $listening | ForEach-Object { "  $($_.ToString().Trim())" } } else { '  (none)' }
    Write-Host ''
    Write-Host "Check the SQL Server error log for a bind failure - another service may already hold port $Port."
}
