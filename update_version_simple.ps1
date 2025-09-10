param(
    [string]$newVersion
)

Write-Host "=== Mise à jour vers la version $newVersion ==="

try {
    # 1. Mise à jour app.json
    Write-Host "1. Mise à jour app.json..."
    $appJsonPath = "app.json"
    $appContent = Get-Content $appJsonPath -Raw
    $appContent = $appContent -replace '"version":\s*"[^"]*"', "`"version`": `"$newVersion`""
    Set-Content $appJsonPath $appContent -NoNewline
    Write-Host "   ✓ app.json mis à jour"

    # 2. Mise à jour build.gradle
    Write-Host "2. Mise à jour build.gradle..."
    $gradlePath = "android/app/build.gradle"
    $gradleContent = Get-Content $gradlePath

    # Mettre à jour versionName
    $gradleContent = $gradleContent -replace 'versionName\s+"[^"]*"', "versionName `"$newVersion`""
    
    # Incrémenter versionCode
    $versionCodeLine = $gradleContent | Where-Object { $_ -match 'versionCode' }
    if ($versionCodeLine) {
        # Extraire le numéro actuel
        $matches = [regex]::Match($versionCodeLine, 'versionCode\s+(\d+)')
        if ($matches.Success) {
            $currentCode = [int]$matches.Groups[1].Value
            $newCode = $currentCode + 1
            $gradleContent = $gradleContent -replace 'versionCode\s+\d+', "versionCode $newCode"
            Write-Host "   ✓ versionCode: $currentCode → $newCode"
        }
    }
    
    Set-Content $gradlePath $gradleContent
    Write-Host "   ✓ build.gradle mis à jour"

    Write-Host ""
    Write-Host "=== Mise à jour terminée avec succès ! ==="
    Write-Host "Nouvelle version: $newVersion"
    
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)"
    exit 1
} 