# Campus Complaint System - Quick Start Script
# This script starts both the backend and frontend servers

Write-Host "🚀 Campus Complaint & Maintenance Management System" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "❌ Node.js is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

Write-Host "✅ Node.js found: $($node.Source)" -ForegroundColor Green
Write-Host ""

# Check if backend dependencies are installed
Write-Host "📦 Checking backend dependencies..." -ForegroundColor Yellow
if (-not (Test-Path "backend/node_modules")) {
    Write-Host "📥 Installing backend dependencies..." -ForegroundColor Yellow
    Push-Location backend
    npm install
    Pop-Location
}

Write-Host ""
Write-Host "✅ Backend ready!" -ForegroundColor Green
Write-Host ""

# Start backend in new window
Write-Host "🔧 Starting backend server..." -ForegroundColor Yellow
$backendProcess = Start-Process powershell -ArgumentList "cd backend; npm start" -PassThru
Write-Host "✅ Backend started (PID: $($backendProcess.Id))" -ForegroundColor Green
Write-Host ""

# Give backend time to start
Start-Sleep -Seconds 2

# Start frontend in new window
Write-Host "🌐 Starting frontend..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Frontend will be served on:" -ForegroundColor Cyan
Write-Host "  📍 http://localhost:8000" -ForegroundColor Green
Write-Host ""

$frontendProcess = Start-Process powershell -ArgumentList "cd frontend; npx http-server -p 8000" -PassThru
Write-Host "✅ Frontend started (PID: $($frontendProcess.Id))" -ForegroundColor Green
Write-Host ""

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🎉 Everything is running!" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Open your browser and visit:" -ForegroundColor Cyan
Write-Host "   👉 http://localhost:8000/campus_complaint_system.html" -ForegroundColor Green
Write-Host ""
Write-Host "Demo Accounts:" -ForegroundColor Yellow
Write-Host "   Admin:  admin@e.com / admin123" -ForegroundColor Gray
Write-Host "   Staff:  staff@e.com / staff123" -ForegroundColor Gray
Write-Host "   User:   user@e.com / user123" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  Make sure MongoDB is running!" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop all servers" -ForegroundColor Gray

# Wait for user to stop
Wait-Process -Id $backendProcess.Id, $frontendProcess.Id -Any
Write-Host ""
Write-Host "Stopping servers..." -ForegroundColor Yellow
Stop-Process -Id $backendProcess.Id -ErrorAction SilentlyContinue
Stop-Process -Id $frontendProcess.Id -ErrorAction SilentlyContinue
Write-Host "👋 Goodbye!" -ForegroundColor Green
