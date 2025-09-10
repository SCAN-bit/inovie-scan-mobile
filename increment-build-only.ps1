Write-Host "Incrementation du build number uniquement..."

# Lire le fichier build.gradle
$gradlePath = "android/app/build.gradle"
$appJsonPath = "app.json"
$gradleContent = Get-Content $gradlePath
$appJsonContent = Get-Content $appJsonPath -Raw | ConvertFrom-Json

# Incrementer versionCode dans build.gradle
$currentCode = 0
$newCode = 0
$updatedGradleContent = @()
$versionCodeFound = $false
foreach ($line in $gradleContent) {
    if ($line -match 'versionCode (\d+)' -and !$versionCodeFound) {
        $currentCode = [int]$matches[1]
        $newCode = $currentCode + 1
        $updatedGradleContent += $line -replace "versionCode $currentCode", "versionCode $newCode"
        Write-Host "build.gradle versionCode: $currentCode -> $newCode"
        $versionCodeFound = $true
    } else {
        $updatedGradleContent += $line
    }
}

# Mettre a jour versionCode dans app.json
$currentAppJsonCode = $appJsonContent.expo.android.versionCode
$appJsonContent.expo.android.versionCode = $newCode
Write-Host "app.json versionCode: $currentAppJsonCode -> $newCode"

# Sauvegarder les fichiers
Set-Content -Path $gradlePath -Value $updatedGradleContent
$appJsonContent | ConvertTo-Json -Depth 10 | Set-Content -Path $appJsonPath -NoNewline

Write-Host "Build number incremente !" 