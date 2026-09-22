# Run this once to set up the portfolio website assets
# Double-click to run, or right-click > Run with PowerShell

$src1 = "C:\Users\user\.gemini\antigravity-ide\brain\cff6b3e5-f7aa-4035-be08-363066faaf4b\luxury_restaurant_bg_1785560835589.png"
$src2 = "F:\Rasoi live\rasoi live.png"
$dest = "F:\Rasoi live\web"

Copy-Item $src1 "$dest\hero-bg.png" -Force
Copy-Item $src2 "$dest\logo.png" -Force

Write-Host "✅ Assets copied to $dest" -ForegroundColor Green
Write-Host "Now open F:\Rasoi live\web\index.html in your browser!" -ForegroundColor Cyan
