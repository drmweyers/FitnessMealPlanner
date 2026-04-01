#!/bin/bash
# Setup staging environment for FitnessMealPlanner
# Run this after authenticating with doctl

echo "🚀 Setting up staging environment..."

# Check if doctl is authenticated
if ! doctl account get &> /dev/null; then
    echo "❌ Error: doctl is not authenticated. Run: doctl auth init"
    exit 1
fi

echo "✅ doctl authenticated"

# Get production app ID
echo ""
echo "📋 Fetching production app..."
doctl apps list

echo ""
echo "👆 Look for your production app (mea-images-app) and copy its ID"
echo "   It looks like: a1b2c3d4-e5f6-7890-abcd-ef1234567890"
echo ""
read -p "Enter your PRODUCTION App ID: " PROD_APP_ID

# Get production app spec
echo ""
echo "📥 Downloading production app spec..."
doctl apps spec get $PROD_APP_ID > prod-spec.yaml

# Modify spec for staging
echo "🔄 Creating staging spec..."
sed 's/name: mea-images-app/name: fitnessmealplanner-staging/' prod-spec.yaml > staging-spec.yaml
sed -i '' 's/deploy_on_push: true/deploy_on_push: false/' staging-spec.yaml 2>/dev/null || sed -i 's/deploy_on_push: true/deploy_on_push: false/' staging-spec.yaml

# Update service name
sed -i '' 's/name: fitnessmealplanner$/name: fitnessmealplanner-staging/' staging-spec.yaml 2>/dev/null || sed -i 's/name: fitnessmealplanner$/name: fitnessmealplanner-staging/' staging-spec.yaml

# Change instance size to basic-xs for cost savings
sed -i '' 's/instance_size_slug: apps-s-1vcpu-0.5gb/instance_size_slug: basic-xs/' staging-spec.yaml 2>/dev/null || sed -i 's/instance_size_slug: apps-s-1vcpu-0.5gb/instance_size_slug: basic-xs/' staging-spec.yaml

echo "✅ Staging spec created: staging-spec.yaml"

# Create staging app
echo ""
echo "🚀 Creating staging app..."
doctl apps create --spec staging-spec.yaml

# Wait a moment and get the new app ID
sleep 5
echo ""
echo "📋 Fetching staging app ID..."
doctl apps list | grep fitnessmealplanner-staging

echo ""
echo "👆 Copy the ID for 'fitnessmealplanner-staging'"
read -p "Enter your STAGING App ID: " STAGING_APP_ID

# Save to GitHub
echo ""
echo "💾 Saving to GitHub..."
if command -v gh &> /dev/null; then
    gh variable set DO_STAGING_APP_ID --body "$STAGING_APP_ID"
    echo "✅ Staging App ID saved to GitHub"
else
    echo "⚠️  GitHub CLI not found. Install it: https://cli.github.com/"
    echo "   Then run: gh variable set DO_STAGING_APP_ID --body \"$STAGING_APP_ID\""
fi

# Cleanup
rm -f prod-spec.yaml

echo ""
echo "🎉 Done! Staging environment setup complete."
echo ""
echo "Next steps:"
echo "1. Check staging app in DigitalOcean dashboard"
echo "2. Set up staging database (if needed)"
echo "3. PRs will now deploy to staging automatically"
