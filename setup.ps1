# Secure Police Messaging App - Setup Script
# Run this from the project root directory

Write-Host "🛡️  Secure Police Messaging App - Setup Script" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js installation
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js $nodeVersion installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check npm installation
try {
    $npmVersion = npm --version
    Write-Host "✅ npm $npmVersion installed" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow
Write-Host ""

# Install backend dependencies
Write-Host "📦 Installing backend dependencies..." -ForegroundColor Cyan
Push-Location backend
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Backend installation failed" -ForegroundColor Red
}
Pop-Location

Write-Host ""

# Install mobile dependencies
Write-Host "📱 Installing mobile dependencies..." -ForegroundColor Cyan
Push-Location mobile
npm install
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Mobile dependencies installed" -ForegroundColor Green
} else {
    Write-Host "❌ Mobile installation failed" -ForegroundColor Red
}
Pop-Location

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Configure backend/.env (copy from .env.example)" -ForegroundColor White
Write-Host "2. Start MongoDB (local or Atlas)" -ForegroundColor White
Write-Host "3. Run backend: cd backend && npm run dev" -ForegroundColor White
Write-Host "4. Run mobile: cd mobile && npm start" -ForegroundColor White
Write-Host ""
Write-Host "📖 See QUICKSTART.md for detailed instructions" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
