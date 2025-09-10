param([string]$newVersion)

Write-Host "Mise a jour vers la version $newVersion"

# 1. Mettre a jour app.json
Write-Host "1. Mise a jour app.json..."
$appContent = Get-Content "app.json" -Raw
$appContent = $appContent -replace '"version": "[^"]*"', "`"version`": `"$newVersion`""
Set-Content "app.json" $appContent -NoNewline
Write-Host "app.json mis a jour"

# 2. Mettre a jour build.gradle
Write-Host "2. Mise a jour build.gradle..."
$gradleContent = Get-Content "android/app/build.gradle"

# Mettre a jour versionName
$gradleContent = $gradleContent -replace 'versionName "[^"]*"', "versionName `"$newVersion`""

# Incrementer versionCode
foreach ($line in $gradleContent) {
    if ($line -match 'versionCode (\d+)') {
        $currentCode = [int]$matches[1]
        $newCode = $currentCode + 1
        $gradleContent = $gradleContent -replace "versionCode $currentCode", "versionCode $newCode"
        Write-Host "versionCode: $currentCode -> $newCode"
        break
    }
}

Set-Content "android/app/build.gradle" $gradleContent
Write-Host "build.gradle mis a jour"
Write-Host "Termine !" 