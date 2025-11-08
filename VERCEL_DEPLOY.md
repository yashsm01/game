# Vercel Deployment Guide

## Prerequisites

1. Vercel account (sign up at https://vercel.com)
2. Vercel CLI installed: `npm i -g vercel`
3. All environment variables configured

## Deployment Steps

### Option 1: Deploy via Vercel CLI

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy to Vercel**:
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Set up and deploy? **Y**
   - Which scope? (select your account)
   - Link to existing project? **N** (or Y if you have one)
   - Project name? (enter a name or press Enter)
   - Directory? **./** (press Enter)
   - Override settings? **N**

4. **Set Environment Variables**:
   ```bash
   vercel env add DB_USER
   vercel env add DB_PASSWORD
   vercel env add DB_NAME
   vercel env add DB_HOST
   vercel env add DB_PORT
   vercel env add DB_SSL
   vercel env add AWS_ACCESS_KEY_ID
   vercel env add AWS_SECRET_ACCESS_KEY
   vercel env add AWS_REGION
   vercel env add S3_BUCKET
   vercel env add S3_FOLDER
   ```
   
   Or set them via Vercel Dashboard:
   - Go to your project → Settings → Environment Variables
   - Add each variable for **Production**, **Preview**, and **Development**

5. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via GitHub Integration

1. **Push your code to GitHub** (make sure `.env` is in `.gitignore`)

2. **Import project in Vercel**:
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Configure project settings

3. **Add Environment Variables**:
   - In Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add all required variables (see list below)

4. **Deploy**:
   - Vercel will automatically deploy on every push to main branch

## Required Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

```
# Database
DB_USER=postgres
DB_PASSWORD="Qaswedfr#1234"  (Note: Use quotes for passwords with special characters)
DB_NAME=winner_app_db
DB_HOST=database-1.cj2yei0scfob.ap-south-1.rds.amazonaws.com
DB_PORT=5432
DB_SSL=true

# AWS S3
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=eu-north-1
S3_BUCKET=hinex
S3_FOLDER=test

# Optional
NFT_API_URL=your_nft_api_url
NFT_MINT_ADDRESS=your_nft_mint_address
SHARE_TOKEN_MINT=your_share_token_mint
NODE_ENV=production
```

## Important Notes

1. **Database Connection**: Make sure your RDS database allows connections from Vercel's IP ranges. You may need to:
   - Add Vercel's IP ranges to your RDS security group
   - Or set your RDS to allow connections from anywhere (0.0.0.0/0) - less secure but easier

2. **SSL Connection**: The app is configured to use SSL for RDS connections automatically.

3. **Cold Starts**: First request after inactivity may be slower due to database connection initialization.

4. **File Uploads**: Images are uploaded directly to S3, so no local storage is needed.

5. **Static Files**: The `public` folder is served as static files automatically.

## Testing Deployment

After deployment, test these endpoints:

- Health check: `https://your-app.vercel.app/api/health`
- Admin panel: `https://your-app.vercel.app/admin.html`
- Player interface: `https://your-app.vercel.app/player.html`
- S3 test: `https://your-app.vercel.app/api/test-s3`

## Troubleshooting

### Database Connection Errors

- Check that `DB_SSL=true` is set
- Verify RDS security group allows Vercel IPs
- Check database credentials are correct

### AWS S3 Errors

- Verify AWS credentials are set correctly
- Check S3 bucket permissions
- Ensure bucket exists and is accessible

### Build Errors

- Make sure all dependencies are in `package.json`
- Check Node.js version compatibility (Vercel uses Node 18.x by default)

## Custom Domain

To add a custom domain:
1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain
3. Follow DNS configuration instructions

