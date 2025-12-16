# commit-zips-sequentially.ps1
# Sequentially apply zip snapshots -> commit each with prompted messages
# Keeps all .zip files in-place (never deletes them)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# -------- CONFIG --------
$RepoDir = $PSScriptRoot
$GitHubOwner = "santosizhar"
$RepoName = "usul-inkswarm-lifelab"
$DefaultBranch = "main"

# If you want to use SSH instead of HTTPS, set this to $true
$UseSshRemote = $false

# If you have root-level .md notes you never want committed, set to $true.
# (We will still KEEP them on disk; just unstage them before committing.)
$ExcludeRootMdFromCommits = $true
# ------------------------

function Assert-Cmd($cmd) {
  if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) {
    throw "Missing dependency: '$cmd'. Install it and retry."
  }
}

function Ensure-Repo($dir) {
  if (-not (Test-Path $dir)) { throw "RepoDir not found: $dir" }
  Set-Location $dir

  Assert-Cmd git

  if (-not (Test-Path (Join-Path $dir ".git"))) {
    Write-Host "No .git found. Initializing new git repository..."
    git init | Out-Host
    git branch -M $DefaultBranch | Out-Host
  } else {
    Write-Host "Detected existing .git in repo folder."
    $ans = Read-Host "Do you want to RESET history (delete .git) and start clean? Type YES to reset, anything else to keep"
    if ($ans -eq "YES") {
      Write-Host "Resetting repo history (removing .git)..."
      Remove-Item -Recurse -Force (Join-Path $dir ".git")
      git init | Out-Host
      git branch -M $DefaultBranch | Out-Host
    } else {
      # ensure branch name
      try { git branch -M $DefaultBranch | Out-Null } catch {}
    }
  }

  # Ignore zips locally so they never get staged
  $excludePath = Join-Path $dir ".git\info\exclude"
  if (-not (Test-Path $excludePath)) { New-Item -ItemType File -Path $excludePath -Force | Out-Null }
  $excludeContent = Get-Content $excludePath -ErrorAction SilentlyContinue
  if ($excludeContent -notcontains "*.zip") { Add-Content $excludePath "*.zip" }
}

function Ensure-Remote($owner, $name, $useSsh) {
  $remoteUrl = if ($useSsh) {
    "git@github.com:$owner/$name.git"
  } else {
    "https://github.com/$owner/$name.git"
  }

  $hasOrigin = $false
  try {
    $remotes = git remote | Out-String
    if ($remotes -match "(?m)^\s*origin\s*$") { $hasOrigin = $true }
  } catch {}

  if (-not $hasOrigin) {
    Write-Host "Adding remote 'origin' -> $remoteUrl"
    git remote add origin $remoteUrl | Out-Host
  } else {
    Write-Host "Setting remote 'origin' -> $remoteUrl"
    git remote set-url origin $remoteUrl | Out-Host
  }
}

function Get-ZipByPattern($dir, [string]$pattern) {
  $zips = Get-ChildItem -Path $dir -File -Filter "*.zip"
  $match = $zips | Where-Object { $_.Name -match $pattern } | Select-Object -First 1
  return $match
}

function Get-KeepSet($dir) {
  $keep = New-Object System.Collections.Generic.HashSet[string]
  $keep.Add(".git") | Out-Null
  # keep all zip files
  (Get-ChildItem -Path $dir -File -Filter "*.zip").Name | ForEach-Object { $keep.Add($_) | Out-Null }
  # keep this script file
  if ($PSCommandPath) { $keep.Add((Split-Path -Leaf $PSCommandPath)) | Out-Null }
  # keep root-level md notes (but we may exclude from commits later)
  if ($ExcludeRootMdFromCommits) {
   Get-ChildItem -Path $dir -File -Filter "*.md" -ErrorAction SilentlyContinue |
    ForEach-Object { $keep.Add($_.Name) | Out-Null }
}

if ($ExcludeRootMdFromCommits) {
  Get-ChildItem -Path $dir -File -Filter "*.md" -ErrorAction SilentlyContinue |
    ForEach-Object { $keep.Add($_.Name) | Out-Null }
}
  return $keep
}

function Wipe-WorkingTreeButKeep($dir, $keepSet) {
  Get-ChildItem -Path $dir -Force | ForEach-Object {
    if ($keepSet.Contains($_.Name)) { return }
    try {
      Remove-Item -LiteralPath $_.FullName -Recurse -Force
    } catch {
      throw "Failed to remove '$($_.FullName)': $($_.Exception.Message)"
    }
  }
}

function Extract-ZipToTemp($zipPath, $tempDir) {
  if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
  New-Item -ItemType Directory -Path $tempDir | Out-Null

  try {
    Expand-Archive -LiteralPath $zipPath -DestinationPath $tempDir -Force
    return
  } catch {
    # fallback to 7z if available
    $sevenZip = Get-Command 7z -ErrorAction SilentlyContinue
    if (-not $sevenZip) { throw "Expand-Archive failed and 7z not found. Install 7-Zip (adds '7z' to PATH) or fix the zip. Error: $($_.Exception.Message)" }
    & 7z x "-o$tempDir" $zipPath -y | Out-Null
  }
}

function Resolve-ExtractionRoot($tempDir) {
  $entries = @(Get-ChildItem -Path $tempDir -Force -ErrorAction SilentlyContinue |
               Where-Object { $_.Name -ne "__MACOSX" })

  if ($entries.Length -eq 1 -and $entries[0].PSIsContainer) {
    return $entries[0].FullName
  }
  return $tempDir
}


function Copy-SnapshotIntoRepo($sourceDir, $repoDir) {
  Assert-Cmd robocopy
  # /E copies subdirs, including empty. /R:1 /W:1 for speed.
  $null = robocopy $sourceDir $repoDir /E /R:1 /W:1 /NFL /NDL /NJH /NJS
}

function StageAndCommit($stepName, $keepSet) {
  # prompt commit message
  $msg = Read-Host "Commit message for '$stepName' (Enter = default)"
  if ([string]::IsNullOrWhiteSpace($msg)) { $msg = $stepName }

  git add -A | Out-Null

  # Ensure zip files never get staged (should already be ignored, but belt+suspenders)
  $zips = Get-ChildItem -File -Filter "*.zip" | Select-Object -ExpandProperty Name
  foreach ($z in $zips) {
    try { git restore --staged -- $z | Out-Null } catch {}
  }

  # Optionally keep root-level .md notes out of commits
  if ($ExcludeRootMdFromCommits) {
    $rootMds = Get-ChildItem -File -Filter "*.md" | Select-Object -ExpandProperty Name
    foreach ($m in $rootMds) {
      try { git restore --staged -- $m | Out-Null } catch {}
    }
  }

  # commit only if there are changes
  $status = git status --porcelain
  if ([string]::IsNullOrWhiteSpace($status)) {
    Write-Host "No changes to commit for '$stepName' -> skipping commit."
    return
  }

  git commit -m $msg | Out-Host
}

# -------- MAIN --------
Ensure-Repo $RepoDir
Ensure-Remote $GitHubOwner $RepoName $UseSshRemote

$keepSet = Get-KeepSet $RepoDir
$tempDir = Join-Path $RepoDir "__tmp_extract__"

# Ordered steps (regex patterns match filenames)
$Steps = @(
  @{ Name = "D-0001"; Pattern = "(?i)D-0001" },
  @{ Name = "D-0002"; Pattern = "(?i)D-0002" },
  @{ Name = "D-0003"; Pattern = "(?i)D-0003" },
  @{ Name = "D-0004"; Pattern = "(?i)D-0004" },
  @{ Name = "D-0005"; Pattern = "(?i)D-0005" },
  @{ Name = "D-0006"; Pattern = "(?i)D-0006" },
  @{ Name = "D-0007"; Pattern = "(?i)D-0007" },
  @{ Name = "D-0008"; Pattern = "(?i)D-0008" },

  @{ Name = "R1 readiness"; Pattern = "(?i)R1.*readiness" },
  @{ Name = "R1"; Pattern = "(?i)(^|[^A-Z0-9])R1([^A-Z0-9]|$)|(?i)R1[_-]v" },

  @{ Name = "D-0010"; Pattern = "(?i)D-0010(_|-).*repo(\.zip)?$|(?i)D-0010(?!.*post)" },
  @{ Name = "D-0010 post CR-0005"; Pattern = "(?i)D-0010.*post.*CR[-_]?0005" },
  @{ Name = "D-0010 post RR-0002"; Pattern = "(?i)D-0010.*post.*RR[-_]?0002(?!.*git)" },
  @{ Name = "D-0010 post RR-0002 git workflow"; Pattern = "(?i)RR[-_]?0002.*git.*workflow|D-0010.*RR[-_]?0002.*git" },

  @{ Name = "R2"; Pattern = "(?i)R2|R2[_-]v" },
  @{ Name = "CODE FREEZE"; Pattern = "(?i)CODE[_-]?FREEZE|CF[-_]?0001" }
)

foreach ($s in $Steps) {
  $zip = Get-ZipByPattern $RepoDir $s.Pattern
  if (-not $zip) {
    Write-Host "SKIP: Missing zip for step: $($s.Name)"
    continue
  }

  Write-Host ""
  Write-Host "=== APPLY: $($s.Name)  ->  $($zip.Name) ==="

  # wipe repo content but keep .git, zips, this script, and optional root md notes
  Wipe-WorkingTreeButKeep $RepoDir $keepSet

  # extract zip to temp
  Extract-ZipToTemp $zip.FullName $tempDir
  $root = Resolve-ExtractionRoot $tempDir

  # copy snapshot into repo root
  Copy-SnapshotIntoRepo $root $RepoDir

  # cleanup temp
  Remove-Item -Recurse -Force $tempDir

  # commit
  StageAndCommit $s.Name $keepSet
}

Write-Host ""
Write-Host "Done. If you want to push everything:"
Write-Host "  git push -u origin $DefaultBranch"
