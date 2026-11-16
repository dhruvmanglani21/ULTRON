$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$snapshot = [ordered]@{ collectedAt = [DateTime]::UtcNow.ToString('o'); checks = [ordered]@{} }
function Read-Check([string]$name, [scriptblock]$read) {
  try { $data = & $read; $snapshot.checks[$name] = @{ status = 'ok'; data = $data } }
  catch { $snapshot.checks[$name] = @{ status = 'unavailable'; reason = 'Windows did not return this check under the current user permissions.' } }
}
Read-Check 'system' {
  $os = Get-CimInstance -ClassName Win32_OperatingSystem -OperationTimeoutSec 5
  @{ name = $os.Caption; version = $os.Version; build = $os.BuildNumber; uptimeHours = [Math]::Round(((Get-Date) - $os.LastBootUpTime).TotalHours, 1); totalMemoryBytes = [double]$os.TotalVisibleMemorySize * 1024; freeMemoryBytes = [double]$os.FreePhysicalMemory * 1024 }
}
Read-Check 'cpu' {
  $processors = @(Get-CimInstance -ClassName Win32_Processor -OperationTimeoutSec 5)
  $loads = @($processors | Where-Object { $null -ne $_.LoadPercentage } | ForEach-Object { [double]$_.LoadPercentage })
  $load = $null
  if ($loads.Count -gt 0) { $load = [Math]::Round(($loads | Measure-Object -Average).Average, 1) }
  @{ loadPercent = $load; logicalProcessors = [Environment]::ProcessorCount; sample = 'Recent Windows CPU-load snapshot; not a sustained-load benchmark.' }
}
Read-Check 'processes' {
  $first = @{}
  foreach ($proc in @(Get-Process)) { try { if ($null -ne $proc.CPU) { $first[$proc.Id] = [double]$proc.CPU } } catch {} }
  $watch = [Diagnostics.Stopwatch]::StartNew()
  Start-Sleep -Milliseconds 600
  $second = @(Get-Process)
  $seconds = $watch.Elapsed.TotalSeconds
  $rows = @()
  foreach ($proc in $second) {
    try {
      if (!$first.ContainsKey($proc.Id) -or $null -eq $proc.CPU) { continue }
      $percent = [Math]::Max(0, [Math]::Min(100, (([double]$proc.CPU - $first[$proc.Id]) / $seconds / [Environment]::ProcessorCount) * 100))
      $rows += @{ name = $proc.ProcessName; pid = $proc.Id; cpuPercent = [Math]::Round($percent, 1); memoryBytes = [double]$proc.WorkingSet64 }
    } catch {}
  }
  @{ sampleSeconds = [Math]::Round($seconds, 2); topCpu = @($rows | Sort-Object -Property cpuPercent -Descending | Select-Object -First 5); topMemory = @($rows | Sort-Object -Property memoryBytes -Descending | Select-Object -First 5); sampledProcesses = $rows.Count }
}
Read-Check 'storage' {
  @(Get-CimInstance -ClassName Win32_LogicalDisk -Filter 'DriveType=3' -OperationTimeoutSec 5 | Where-Object { $_.Size -gt 0 } | ForEach-Object { @{ drive = $_.DeviceID; totalBytes = [double]$_.Size; freeBytes = [double]$_.FreeSpace; systemDrive = ($_.DeviceID -eq $env:SystemDrive) } })
}
Read-Check 'diskHealth' {
  @(Get-PhysicalDisk | ForEach-Object { @{ health = [string]$_.HealthStatus; operational = ($_.OperationalStatus -join ', '); mediaType = [string]$_.MediaType } })
}
Read-Check 'network' {
  $profiles = @(Get-NetConnectionProfile)
  $active = @($profiles | ForEach-Object { if ($_.NetworkCategory -eq 'DomainAuthenticated') { 'Domain' } else { [string]$_.NetworkCategory } } | Select-Object -Unique)
  $firewalls = @(Get-NetFirewallProfile | Where-Object { $active -contains [string]$_.Name } | ForEach-Object { @{ profile = [string]$_.Name; enabled = [bool]$_.Enabled } })
  @{ connectedProfiles = $profiles.Count; reportsInternet = [bool](@($profiles | Where-Object { $_.IPv4Connectivity -eq 'Internet' -or $_.IPv6Connectivity -eq 'Internet' }).Count -gt 0); activeFirewalls = $firewalls; note = 'Windows connectivity status only; no external network probe.' }
}
Read-Check 'security' {
  $defender = $null; $providers = @(); $providerCheck = $false
  try { $defender = Get-MpComputerStatus } catch {}
  try { $providers = @(Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntiVirusProduct -OperationTimeoutSec 5 | ForEach-Object { $_.displayName }); $providerCheck = $true } catch {}
  if ($null -eq $defender -and !$providerCheck) { throw 'Protection status unavailable' }
  if ($null -eq $defender) { @{ defenderAvailable = $false; registeredProducts = $providers } }
  else { @{ defenderAvailable = $true; antivirusEnabled = [bool]$defender.AntivirusEnabled; realTimeEnabled = [bool]$defender.RealTimeProtectionEnabled; mode = [string]$defender.AMRunningMode; signatureAgeDays = $defender.AntivirusSignatureAge; registeredProducts = $providers } }
}
Read-Check 'reliability' {
  $logs = @()
  foreach ($log in @('System', 'Application')) {
    try {
      $events = @(Get-WinEvent -FilterHashtable @{ LogName = $log; Level = @(1, 2); StartTime = (Get-Date).AddHours(-24) } -MaxEvents 100)
      $groups = @($events | Group-Object -Property ProviderName, Id | Sort-Object -Property Count -Descending | Select-Object -First 5 | ForEach-Object { @{ provider = [string]$_.Group[0].ProviderName; eventId = [int]$_.Group[0].Id; count = $_.Count } })
      $logs += @{ log = $log; available = $true; errorCount = $events.Count; capped = ($events.Count -eq 100); groups = $groups }
    } catch {
      if ($_.FullyQualifiedErrorId -like 'NoMatchingEventsFound*') { $logs += @{ log = $log; available = $true; errorCount = 0; capped = $false; groups = @() } }
      else { $logs += @{ log = $log; available = $false } }
    }
  }
  @{ periodHours = 24; logs = $logs }
}
Read-Check 'restart' {
  $cbs = Test-Path -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending'
  $updates = Test-Path -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired'
  @{ pending = [bool]($cbs -or $updates); windowsUpdateFlag = [bool]$updates; servicingFlag = [bool]$cbs; note = 'Checks known servicing/update restart flags, not all possible restart requirements or available updates.' }
}
Read-Check 'startup' {
  $entries = @(Get-CimInstance -ClassName Win32_StartupCommand -OperationTimeoutSec 5)
  @{ count = $entries.Count; note = 'Registered startup entries; does not measure startup delay or enumerate every service/task.' }
}
Read-Check 'battery' {
  $items = @(Get-CimInstance -ClassName Win32_Battery -OperationTimeoutSec 5)
  @{ present = ($items.Count -gt 0); chargePercent = @($items | ForEach-Object { if ($null -ne $_.EstimatedChargeRemaining) { [int]$_.EstimatedChargeRemaining } }) }
}
# Deliberately omit usernames, hostnames, IPs, SSIDs, file paths, command lines,
# event messages, disk serial numbers, browser history and private content.
@{ success = $true; snapshot = $snapshot } | ConvertTo-Json -Depth 10 -Compress
