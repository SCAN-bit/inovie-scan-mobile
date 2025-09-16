param(
    [int]$VersionCode
)

# Lire le fichier app.json
$json = Get-Content 'app.json' | ConvertFrom-Json

# Mettre à jour le versionCode
$json.expo.android.versionCode = $VersionCode

# Sauvegarder le fichier
$json | ConvertTo-Json -Depth 10 | Set-Content 'app.json' -Encoding UTF8

Write-Host "versionCode mis à jour vers $VersionCode dans app.json"
