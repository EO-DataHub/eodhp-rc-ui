#!/bin/bash
set -e
AWS_S3_BUCKET="${.sparkgeo.dev}"
echo "Deploying to $AWS_S3_BUCKET"
ls -lah dist
aws s3 sync dist/ s3://$AWS_S3_BUCKET/
echo "Deployed to $AWS_S3_BUCKET"
echo "Invalidating CloudFront Cache - $CLOUDFRONT_DIST_ID"
aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_DIST_ID --paths "/*"