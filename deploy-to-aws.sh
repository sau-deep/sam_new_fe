#!/bin/bash

# Deploy SAM v2 (new UI) to AWS S3 + CloudFront at the ROOT path
# Live at: https://coecmamsupport.com
# NOTE: The old UI now lives under /v3 — this script must NEVER delete v3/*.

set -e

BUCKET_NAME="${BUCKET_NAME:-coecmamsupport.com}"
CLOUDFRONT_DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:-E4L4PA4P2IR55}"
AWS_REGION="${AWS_REGION:-ap-south-1}"
WEBSITE_URL="${WEBSITE_URL:-https://coecmamsupport.com}"

AWS_PROFILE="${AWS_PROFILE-sauravsolanki}"
PROFILE_ARGS=()
if [ -n "$AWS_PROFILE" ]; then
    PROFILE_ARGS=(--profile "$AWS_PROFILE")
    export AWS_PROFILE
else
    unset AWS_PROFILE
fi

echo "🚀 Deploying SAM v2 (New UI) to ROOT..."
echo "📦 Bucket: s3://$BUCKET_NAME/"
echo "🌐 CloudFront: $CLOUDFRONT_DISTRIBUTION_ID"
echo "🔗 Website: $WEBSITE_URL"
if [ -n "$AWS_PROFILE" ]; then
    echo "🔑 AWS Profile: $AWS_PROFILE"
else
    echo "🔑 AWS Profile: (using env credentials)"
fi
echo "============================================"

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed."
    exit 1
fi

# Verify AWS credentials
if ! aws sts get-caller-identity "${PROFILE_ARGS[@]}" &> /dev/null; then
    if [ -n "$AWS_PROFILE" ]; then
        echo "❌ AWS credentials not configured for profile '$AWS_PROFILE'."
        echo "   Run: aws configure --profile $AWS_PROFILE"
    else
        echo "❌ AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY."
    fi
    exit 1
fi

# Build the React app (homepage=/ in package.json ensures root-relative asset paths)
echo "🏗️ Building React app..."
npm run build

if [ ! -d "build" ]; then
    echo "❌ Build failed or build directory not found"
    exit 1
fi
echo "✅ Build completed successfully!"

# 1. Upload general files with long-term cache.
#    IMPORTANT excludes:
#      - special files handled separately below (html/serviceWorker/manifest)
#      - "v3/*"  → the OLD UI lives there; --delete must never touch it
echo "📤 Uploading general files to s3://$BUCKET_NAME/ ..."
aws s3 sync build/ s3://$BUCKET_NAME/ \
  --region $AWS_REGION \
  "${PROFILE_ARGS[@]}" \
  --cache-control "public, max-age=31536000" \
  --exclude "*.html" \
  --exclude "serviceWorker.js" \
  --exclude "manifest.json" \
  --exclude "v3/*" \
  --delete

# 2. Upload HTML files with no-cache (for SPA routing)
echo "📝 Uploading HTML files with no-cache..."
find build -name "*.html" -type f | while read file; do
    key=${file#build/}
    aws s3 cp "$file" s3://$BUCKET_NAME/$key \
      --region $AWS_REGION \
      "${PROFILE_ARGS[@]}" \
      --content-type "text/html; charset=utf-8" \
      --cache-control "no-cache, no-store, must-revalidate" \
      --metadata-directive REPLACE
done

# 3. Upload Service Worker with no-cache + root scope (CRITICAL for PWA at root)
echo "⚙️ Uploading Service Worker with special headers..."
if [ -f "build/serviceWorker.js" ]; then
    aws s3 cp build/serviceWorker.js s3://$BUCKET_NAME/serviceWorker.js \
      --region $AWS_REGION \
      "${PROFILE_ARGS[@]}" \
      --content-type "application/javascript; charset=utf-8" \
      --cache-control "no-cache, no-store, must-revalidate" \
      --metadata "service-worker-allowed=/" \
      --metadata-directive REPLACE
    echo "✅ Service Worker uploaded with PWA headers"
else
    echo "⚠️ serviceWorker.js not found - offline functionality may not work"
fi

# 4. Upload Manifest with proper MIME type
echo "📋 Uploading PWA Manifest..."
if [ -f "build/manifest.json" ]; then
    aws s3 cp build/manifest.json s3://$BUCKET_NAME/manifest.json \
      --region $AWS_REGION \
      "${PROFILE_ARGS[@]}" \
      --content-type "application/manifest+json; charset=utf-8" \
      --cache-control "public, max-age=86400" \
      --metadata-directive REPLACE
    echo "✅ Manifest uploaded"
fi

# 5. Upload JavaScript files with proper MIME type
echo "📜 Uploading JavaScript files..."
find build -name "*.js" -not -name "serviceWorker.js" -type f | while read file; do
    key=${file#build/}
    aws s3 cp "$file" s3://$BUCKET_NAME/$key \
      --region $AWS_REGION \
      "${PROFILE_ARGS[@]}" \
      --content-type "application/javascript; charset=utf-8" \
      --cache-control "public, max-age=31536000" \
      --metadata-directive REPLACE
done

# 6. Upload CSS files with proper MIME type
echo "🎨 Uploading CSS files..."
find build -name "*.css" -type f | while read file; do
    key=${file#build/}
    aws s3 cp "$file" s3://$BUCKET_NAME/$key \
      --region $AWS_REGION \
      "${PROFILE_ARGS[@]}" \
      --content-type "text/css; charset=utf-8" \
      --cache-control "public, max-age=31536000" \
      --metadata-directive REPLACE
done

# 7. Upload image files
echo "🖼️ Uploading images..."
for ext in png jpg jpeg gif svg ico webp; do
    find build -name "*.$ext" -type f | while read file; do
        key=${file#build/}
        content_type="image/$ext"
        if [ "$ext" = "svg" ]; then
            content_type="image/svg+xml"
        elif [ "$ext" = "ico" ]; then
            content_type="image/x-icon"
        fi
        aws s3 cp "$file" s3://$BUCKET_NAME/$key \
          --region $AWS_REGION \
          "${PROFILE_ARGS[@]}" \
          --content-type "$content_type" \
          --cache-control "public, max-age=86400" \
          --metadata-directive REPLACE
    done
done

# 8. Invalidate CloudFront cache (root deploy → invalidate everything)
echo "🔄 Invalidating CloudFront cache..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
  "${PROFILE_ARGS[@]}" \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)

echo "✅ CloudFront invalidation created: $INVALIDATION_ID"
echo "⏳ Cache invalidation usually takes 1-5 minutes..."

echo ""
echo "🎉 SAM v2 DEPLOYMENT COMPLETED (ROOT)! 🎉"
echo "============================================"
echo "🌐 New UI (root): $WEBSITE_URL"
echo "🌐 Old UI:        https://coecmamsupport.com/v3"
echo ""
echo "📊 Monitoring:"
echo "- CloudFront Invalidation: $INVALIDATION_ID"
echo "- S3 Console: https://s3.console.aws.amazon.com/s3/buckets/$BUCKET_NAME"
echo "- CloudFront Console: https://console.aws.amazon.com/cloudfront/home#distribution-settings:$CLOUDFRONT_DISTRIBUTION_ID"
echo ""

if [ -z "${CI:-}" ]; then
    if command -v open &> /dev/null; then
        open $WEBSITE_URL
    elif command -v xdg-open &> /dev/null; then
        xdg-open $WEBSITE_URL
    fi
fi

echo "✨ Deployment complete!"
exit 0
