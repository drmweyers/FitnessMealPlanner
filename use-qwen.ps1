# Launch Claude Code Router with Qwen Coder when Claude limit is reached
Write-Host "🚀 Switching to Qwen Coder via Claude Code Router..." -ForegroundColor Cyan
Write-Host ""

# Check if router is running
$status = ccr status 2>&1
if ($status -notmatch "Running") {
    Write-Host "⚠️ Starting Claude Code Router..." -ForegroundColor Yellow
    ccr start
    Start-Sleep -Seconds 2
}

Write-Host "✅ Claude Code Router is ready!" -ForegroundColor Green
Write-Host "📂 Working directory: $PWD" -ForegroundColor Gray
Write-Host ""
Write-Host "💡 You can now use 'ccr code' to continue working with Qwen Coder" -ForegroundColor Yellow
Write-Host "   Example: ccr code 'add meal planning algorithm'" -ForegroundColor Gray
Write-Host ""
Write-Host "🔄 To switch models dynamically, use: /model openrouter-qwen,qwen/qwen-2.5-coder-32b-instruct" -ForegroundColor Gray
Write-Host ""

# Launch Claude Code with router
ccr code
