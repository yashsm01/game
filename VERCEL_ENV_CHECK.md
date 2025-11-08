# Vercel Environment Variables Checklist

## Required Environment Variables for Production

Make sure ALL of these are set in **Vercel Dashboard → Settings → Environment Variables** for **Production**, **Preview**, and **Development** environments:

### Database Configuration (REQUIRED)
```
DB_USER=postgres
DB_PASSWORD="Qaswedfr#1234"
DB_NAME=winner_app_db
DB_HOST=database-1.cj2yei0scfob.ap-south-1.rds.amazonaws.com
DB_PORT=5432
DB_SSL=true
```

### AWS S3 Configuration (REQUIRED)
```
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=eu-north-1
S3_BUCKET=hinex
S3_FOLDER=test
```

### Node Environment (REQUIRED)
```
NODE_ENV=production
```
**IMPORTANT**: Set this to `production` WITHOUT quotes. Just: `production`

### Optional NFT Configuration
```
NFT_API_URL=your_nft_api_url
NFT_MINT_ADDRESS=your_nft_mint_address
SHARE_TOKEN_MINT=your_share_token_mint
```

## How to Set Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. For each variable:
   - Click **Add New**
   - Enter the **Key** (e.g., `DB_USER`)
   - Enter the **Value** (e.g., `postgres`)
   - **IMPORTANT**: For values with special characters like `#`, wrap in quotes: `"Qaswedfr#1234"`
   - Select environments: **Production**, **Preview**, **Development**
   - Click **Save**

## Common Issues

### Issue: "Database configuration not found"
**Solution**: Make sure `NODE_ENV=production` is set (without quotes)

### Issue: "Missing required environment variables"
**Solution**: Check that all DB_* variables are set correctly

### Issue: Password with special characters not working
**Solution**: Wrap the password value in quotes: `"Qaswedfr#1234"`

### Issue: Database connection timeout
**Solution**: 
- Check that `DB_SSL=true` is set
- Verify RDS security group allows connections from Vercel IPs
- Check that database credentials are correct

## Verification

After setting all variables, redeploy and check the logs. You should see:
```
[DB Config] Sequelize instance created successfully for database: winner_app_db
✅ PostgreSQL connection established successfully.
```

If you see errors, the logs will now tell you exactly which variables are missing.

