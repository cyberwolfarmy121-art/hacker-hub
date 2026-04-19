# Hacker Hub Deployment Script
# Run this to deploy to GitHub Pages

echo "=== Hacker Hub Deployment ==="
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "Error: Git is not installed"
    exit 1
fi

# Initialize git if not already
if [ ! -d ".git" ]; then
    echo "Initializing git..."
    git init
    git branch -M main
fi

# Add all files
echo "Staging files..."
git add .

# Commit
echo "Committing..."
git commit -m "Hacker Hub - Deploy to GitHub Pages"

# Check if remote exists
if ! git remote get-url origin &> /dev/null; then
    echo ""
    echo "=== SETUP: Add your GitHub repository ==="
    echo "Run: git remote add origin https://github.com/YOUR_USERNAME/hacker-hub.git"
    echo ""
    echo "Then run: git push -u origin main"
    exit 0
fi

# Deploy
echo "Pushing to GitHub..."
git push -u origin main

echo ""
echo "=== Deployment Complete! ==="
echo "Go to: https://cyberwolfarmy121-art.github.io/hacker-hub/"
echo ""
echo "Note: For full functionality, you need to host the backend separately."