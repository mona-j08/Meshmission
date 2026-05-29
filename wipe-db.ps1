# MeshMission Database Wipe Script
# This script deletes all collections and documents from your Firebase project.

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "🔥 MESH-MISSION DATABASE WIPE UTILITY 🔥" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Connecting to Firebase project: meshmission-a6f89..." -ForegroundColor Yellow
Write-Host "WARNING: This will permanently delete all Firestore data!" -ForegroundColor Red

# Run the Firebase CLI command to delete all collections
npx firebase-tools firestore:delete --all-collections --project meshmission-a6f89 --force

Write-Host ""
Write-Host "✅ Database wiped successfully!" -ForegroundColor Green
Write-Host "You can now reload the mobile app and admin panel to start fresh." -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
