# Launch Claude Code with default Claude models (no proxy)
Write-Host "🚀 Starting Claude Code with native Claude models..." -ForegroundColor Cyan
Write-Host ""

# Make sure we're not using any proxy
Write-Host "✅ Using Claude directly (no proxy)" -ForegroundColor Green
Write-Host "📂 Working directory: $PWD" -ForegroundColor Gray
Write-Host ""

# Clear any potential proxy environment variable
$env:CLAUDE_CODE_API_PROXY = ""

# Launch Claude Code without proxy
Write-Host "💡 Launching Claude Code..." -ForegroundColor Yellow
claude code

# Note: If you need to explicitly avoid proxy, you can set environment variable
# $env:CLAUDE_CODE_API_PROXY = ""
