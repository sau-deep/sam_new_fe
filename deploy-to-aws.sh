#!/bin/bash

# Deploy SAM v2 (new UI) to AWS S3 + CloudFront under /v2 path
# Live at: https://coecmamsupport.com/v2

set -e

BUCKET_NAME="${BUCKET_NAME:-coecmamsupport.com}"
S3_PREFIX="v2"
CLOUDFRONT_DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:-E4L4PA4P2IR55}"
AWS_REGION="${AWS_REGION:-ap-south-1}"
WEBSITE_URL="${WEBSITE_URL:-https://coecmamsupport.com/v2}"

AWS_PROFILE="${AWS_PROFILE-sauravsolanki}"
PROFILE_ARGS=()
if [ -n "$AWS_PROFILE" ]; then
    PROFILE_ARGS=(--profile "$AWS_PROFILE")
    export AWS_PROFILE
else
    unset AWS_PROFILE
fi

echo "🚀 Deploying SAM v2 (New UI)..."
echo "📦 Bucket: s3://$BUCKET_NAME/$S3_PREFIX/"
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

# Build the React app (homepage=/v2 in package.json ensures correct asset paths)
echo "🏗️ Building React app..."
npm run build

if [ ! -d "build" ]; then
    echo "❌ Build failed or build directory not found"
    exit 1
fi
echo "✅ Build completed successfully!"

# 1. Upload all files with long-term cache (except special files)
echo "📤 Uploading general files to s3://$BUCKET_NAME/$S3_PREFIX/..."
aws s3 sync build/ s3://$BUCKET_NAME/$S3_PREFIX/ \
  --region $AWS_REGION \
  "${PROFILE_ARGS[@]}" \
  --cache-control "public, max-age=31536000" \
  --exclude "*.html" \
  --exclude "manifest.json" \
  --delete

# 2. Upload HTML files with no-cache (for SPA routing)
echo "📝 Uploading HTML files with no-cache..."
find build -name "*.html" -type f | while read file; do
    key=${file#build/}
    aws s3 cp "$file" s3://$BUCKET_NAME/$S3_PREFIX/$key \
      --region $AWS_REGION \
      "${PROFILE_ARGS[@]}" \
      --content-type "text/html; charset=utf-8" \
      --cache-control "no-cache, no-store, must-revalidate" \
      --metadata-directive REPLACE
done

# 3. Upload Manifest with proper MIME type
echo "📋 Uploading PWA Manifest..."
if [ -f "build/manifest.json" ]; then
    aws s3 cp build/manifest.json s3://$BUCKET_NAME/$S3_PREFIX/manifest.json \
      --region $AWS_REGION \
      "${PROFILE_ARGS[@]}" \
      --content-type "application/manifest+json; charset=utf-8" \
      --cache-control "public, max-age=86400" \
      --metadata-directive REPLACE
    echo "✅ Manifest uploaded"
fi

# 4. Upload JavaScript files with proper MIME type
echo "📜 Uploading JavaScript files..."
find build -name "*.js" -type f | while read file; do
    key=${file#build/}
    aws s3 cp "$file" s3://$BUCKET_NAME/$S3_PREFIX/$key \
      --region $AWS_REGION \
      "${PROFILE_ARGS[@]}" \
      --content-type "application/javascript; charset=utf-8" \
      --cache-control "public, max-age=31536000" \
      --metadata-directive REPLACE
done

# 5. Upload CSS files with proper MIME type
echo "🎨 Uploading CSS files..."
find build -name "*.css" -type f | while read file; do
    key=${file#build/}
    aws s3 cp "$file" s3://$BUCKET_NAME/$S3_PREFIX/$key \
      --region $AWS_REGION \
      "${PROFILE_ARGS[@]}" \
      --content-type "text/css; charset=utf-8" \
      --cache-control "public, max-age=31536000" \
      --metadata-directive REPLACE
done

# 6. Upload image files
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
        aws s3 cp "$file" s3://$BUCKET_NAME/$S3_PREFIX/$key \
          --region $AWS_REGION \
          "${PROFILE_ARGS[@]}" \
          --content-type "$content_type" \
          --cache-control "public, max-age=86400" \
          --metadata-directive REPLACE
    done
done

# 7. Invalidate CloudFront cache for /v2/* only (old UI unaffected)
echo "🔄 Invalidating CloudFront cache for /v2/*..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
  --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
  "${PROFILE_ARGS[@]}" \
  --paths "/v2" "/v2/*" \
  --query 'Invalidation.Id' \
  --output text)

echo "✅ CloudFront invalidation created: $INVALIDATION_ID"
echo "⏳ Cache invalidation usually takes 1-5 minutes..."

echo ""
echo "🎉 SAM v2 DEPLOYMENT COMPLETED! 🎉"
echo "============================================"
echo "🌐 New UI (v2): $WEBSITE_URL"
echo "🌐 Old UI:      https://coecmamsupport.com  (unchanged)"
echo ""
echo "NOTE: For deep-link SPA routing (e.g. /v2/dashboard direct URL),"
echo "ensure CloudFront has a behavior for /v2/* that serves /v2/index.html on 403/404."
echo "See: CloudFront > Distribution > Error Pages or Behaviors."
echo ""
echo "📊 Monitoring:"
echo "- CloudFront Invalidation: $INVALIDATION_ID"
echo "- S3 Console: https://s3.console.aws.amazon.com/s3/buckets/$BUCKET_NAME?prefix=$S3_PREFIX/"
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
