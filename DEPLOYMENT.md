# Deployment Guide - Image Hospital

This guide will help you deploy the Image Hospital app to AWS with a free subdomain.

## Architecture Overview

- **Frontend**: React app → Deploy to AWS S3 + CloudFront (static hosting)
- **Backend**: Node.js/TypeScript API → Deploy to AWS EC2 (or Elastic Beanstalk)
- **Database**: PostgreSQL → AWS RDS (or install on EC2)
- **Domain**: Free subdomain (DuckDNS, Freenom, or similar)

## Prerequisites

- AWS Account (free tier eligible)
- Basic knowledge of AWS Console
- SSH key pair for EC2 access

---

## Step 1: Prepare Application for Production ✅

**Status: COMPLETED**

- ✅ Made API URL configurable via `VITE_API_URL` environment variable
- ✅ Tested frontend build (works correctly)
- ✅ Backend already uses environment variables for configuration

**Next**: Proceed to Step 2

---

## Step 2: Get a Free Subdomain

Choose one of these free subdomain services:

### Option A: DuckDNS (Recommended - Easiest)
1. Go to https://www.duckdns.org/
2. Sign in with GitHub/Google
3. Create a subdomain (e.g., `image-hospital.duckdns.org`)
4. Note your token (you'll need it later)

### Option B: Freenom (Free TLD like .tk, .ml)
1. Go to https://www.freenom.com/
2. Register a free domain (e.g., `imagehospital.tk`)
3. You'll use this domain for both frontend and backend

### Option C: No-IP
1. Go to https://www.noip.com/
2. Create free account
3. Create a hostname (e.g., `image-hospital.ddns.net`)

**Action**: Choose one option and get your subdomain. Then proceed to Step 3.

---

## Step 3: Set Up AWS Account & Services

### 3.1 Create AWS Account (if needed)
1. Go to https://aws.amazon.com/
2. Sign up for AWS account
3. Complete verification

### 3.2 Create IAM User (for programmatic access)
1. Go to AWS Console → IAM
2. Create new user: `image-hospital-deploy`
3. Attach policies:
   - `AmazonS3FullAccess`
   - `CloudFrontFullAccess`
   - `AmazonEC2FullAccess`
   - `AmazonRDSFullAccess`
   - `AmazonRoute53FullAccess` (if using Route 53)
4. Create access keys → **Save them securely!**

**Action**: Complete Step 3.2, then proceed to Step 4.

---

## Step 4: Set Up PostgreSQL Database

### Option A: AWS RDS (Managed - Recommended)
- Pros: Automatic backups, easy scaling
- Cons: Costs ~$15/month (free tier: 750 hours/month for 12 months)

### Option B: Install on EC2 (Free)
- Pros: Free (if using free tier EC2)
- Cons: Manual management

**For now**: We'll use Option B (install on EC2) to keep costs at $0.

**Action**: Proceed to Step 5 to create EC2 instance.

---

## Step 5: Create EC2 Instance for Backend

1. Go to AWS Console → EC2
2. Click "Launch Instance"
3. Configure:
   - **Name**: `image-hospital-backend`
   - **AMI**: Amazon Linux 2023 (free tier eligible)
   - **Instance type**: `t2.micro` (free tier eligible)
   - **Key pair**: Create new or use existing → **Download .pem file!**
   - **Network settings**: 
     - Allow HTTP (port 80)
     - Allow HTTPS (port 443)
     - Allow custom TCP (port 3000) - for API
   - **Storage**: 8 GB (free tier)
4. Click "Launch Instance"
5. Wait for instance to be "Running"
6. Note the **Public IP** address

**Action**: Complete Step 5, note your EC2 Public IP, then proceed to Step 6.

---

## Next Steps (After Step 5)

Once you complete Step 5, I'll provide:
- Step 6: Install PostgreSQL and Node.js on EC2
- Step 7: Deploy backend to EC2
- Step 8: Set up S3 bucket for frontend
- Step 9: Deploy frontend to S3 + CloudFront
- Step 10: Configure DNS and domain
- Step 11: Set up SSL/HTTPS (free with CloudFront)

**Ready for Step 5?** Let me know when you've created the EC2 instance and I'll guide you through the next steps!

