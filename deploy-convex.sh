#!/bin/bash
echo "🚀 Deploying Convex projects table..."
echo "This will add the projects table to your existing Convex database"
echo ""

# Deploy to Convex
npx convex deploy

echo ""
echo "✅ Convex deployment complete!"
echo "🎯 Your pipeline now has real-time auto-sync!"
echo "Visit: https://sage-tasks.vercel.app/pipeline"