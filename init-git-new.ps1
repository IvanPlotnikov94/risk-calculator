# Script to initialize Git repository and create GitHub repo
# Run this script from PowerShell: .\init-git.ps1

Write-Host "=== Risk Calculator - Git Initialization ===" -ForegroundColor Cyan
Write-Host ""

# Navigate to project directory
$projectPath = "C:\github\vibecoding\risk-calculator"
Set-Location $projectPath
Write-Host "Working directory: $projectPath" -ForegroundColor Green
Write-Host ""

# Step 1: Initialize git
Write-Host "Step 1: Initializing Git repository..." -ForegroundColor Yellow
git init
if ($LASTEXITCODE -eq 0) {
    Write-Host "вњ“ Git repository initialized" -ForegroundColor Green
} else {
    Write-Host "вњ— Failed to initialize Git" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 2: Configure git (optional, only if not configured globally)
$userName = git config user.name
if ([string]::IsNullOrEmpty($userName)) {
    Write-Host "Git user not configured. Please configure:" -ForegroundColor Yellow
    Write-Host 'git config --global user.name "Your Name"'
    Write-Host 'git config --global user.email "your.email@example.com"'
    Write-Host ""
}

# Step 3: Add files
Write-Host "Step 2: Adding files (respecting .gitignore)..." -ForegroundColor Yellow
git add .
if ($LASTEXITCODE -eq 0) {
    Write-Host "вњ“ Files added to staging area" -ForegroundColor Green
} else {
    Write-Host "вњ— Failed to add files" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Show status
Write-Host "Step 3: Git status (files to be committed):" -ForegroundColor Yellow
git status --short
Write-Host ""

# Step 5: Create commit
Write-Host "Step 4: Creating initial commit..." -ForegroundColor Yellow
$commitMessage = @"
Initial commit: Risk Calculator MVP v0.1.0 with validation

Features:
- Support for Long/Short positions
- Multiple entry points with dynamic calculations
- Partial scenarios for each entry
- Risk/Reward analysis
- Validation for SL/TP levels with visual warnings
- Comprehensive documentation
- Unit tests with Vitest
"@

git commit -m $commitMessage
if ($LASTEXITCODE -eq 0) {
    Write-Host "вњ“ Initial commit created" -ForegroundColor Green
} else {
    Write-Host "вњ— Failed to create commit" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 6: Check branch name
$branchName = git branch --show-current
Write-Host "Current branch: $branchName" -ForegroundColor Cyan
Write-Host ""

# Step 7: Check if gh CLI is available
Write-Host "Step 5: Checking GitHub CLI..." -ForegroundColor Yellow
$ghVersion = gh --version 2>$null

if ($LASTEXITCODE -ne 0)
{
    Write-Host "вњ— GitHub CLI (gh) is not installed" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Cyan
    Write-Host "1. Install GitHub CLI: winget install --id GitHub.cli" -ForegroundColor White
    Write-Host "2. Create repository manually on github.com/new" -ForegroundColor White
    Write-Host "3. Then run: git remote add origin `<your-repo-url`>" -ForegroundColor White
    Write-Host "4. Finally: git push -u origin $branchName" -ForegroundColor White
    Write-Host ""
    Write-Host "Local repository has been initialized successfully!" -ForegroundColor Green
}
else
{
    Write-Host "вњ“ GitHub CLI is available: $($ghVersion[0])" -ForegroundColor Green
    Write-Host ""
    
    # Create GitHub repository
    Write-Host "Step 6: Creating GitHub repository..." -ForegroundColor Yellow
    $repoDescription = "Trading risk calculator with multiple entry points and position validation"
    gh repo create risk-calculator --public --source=. --remote=origin --description=$repoDescription
    
    if ($LASTEXITCODE -ne 0)
    {
        Write-Host "вњ— Failed to create GitHub repository" -ForegroundColor Red
        Write-Host "You may need to create it manually on GitHub.com" -ForegroundColor Yellow
    }
    else
    {
        Write-Host "вњ“ GitHub repository created" -ForegroundColor Green
        Write-Host ""
        
        # Push to GitHub
        Write-Host "Step 7: Pushing to GitHub..." -ForegroundColor Yellow
        git push -u origin $branchName
        
        if ($LASTEXITCODE -ne 0)
        {
            Write-Host "вњ— Failed to push to GitHub" -ForegroundColor Red
            Write-Host "You can try manually: git push -u origin $branchName" -ForegroundColor Yellow
        }
        else
        {
            Write-Host "вњ“ Code pushed to GitHub successfully!" -ForegroundColor Green
            Write-Host ""
            Write-Host "=== Success! ===" -ForegroundColor Green
            Write-Host "Your repository is now available on GitHub" -ForegroundColor Cyan
            
            # Get repo URL
            $repoUrl = gh repo view --json url -q .url
            Write-Host "Repository URL: $repoUrl" -ForegroundColor Cyan
        }
    }
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Cyan

