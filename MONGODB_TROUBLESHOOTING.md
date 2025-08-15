# MongoDB Atlas Connection Troubleshooting Guide

## Current Issue: Error Code 8000 - Authentication Failed

### Quick Fixes to Try:

1. **Check MongoDB Atlas Dashboard:**
   - Go to https://cloud.mongodb.com/
   - Verify your cluster is running (not paused)
   - Check Database Access → Database Users
   - Verify username: `tsvetozarkt` exists and has the correct password

2. **IP Whitelist:**
   - Go to Network Access in MongoDB Atlas
   - Add current IP address or use `0.0.0.0/0` for testing (not recommended for production)

3. **Database User Permissions:**
   - Ensure user has `readWrite` permissions on `tsvdistribution` database
   - Or give `Atlas admin` role for full access

### Connection String Options:

Try these in order in your `.env` file:

```bash
# Option 1: Current (URL encoded underscore)
MONGODB_URI=mongodb+srv://tsvetozarkt:Tsvetozar%5FTsveK22@cluster0.iemxyqg.mongodb.net/tsvdistribution?retryWrites=true&w=majority&appName=Cluster0

# Option 2: Without URL encoding
MONGODB_URI=mongodb+srv://tsvetozarkt:Tsvetozar_TsveK22@cluster0.iemxyqg.mongodb.net/tsvdistribution?retryWrites=true&w=majority&appName=Cluster0

# Option 3: Different encoding
MONGODB_URI=mongodb+srv://tsvetozarkt:Tsvetozar%255FTsveK22@cluster0.iemxyqg.mongodb.net/tsvdistribution?retryWrites=true&w=majority&appName=Cluster0

# Option 4: Without database specified
MONGODB_URI=mongodb+srv://tsvetozarkt:Tsvetozar_TsveK22@cluster0.iemxyqg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0

# Option 5: With authSource
MONGODB_URI=mongodb+srv://tsvetozarkt:Tsvetozar_TsveK22@cluster0.iemxyqg.mongodb.net/tsvdistribution?retryWrites=true&w=majority&appName=Cluster0&authSource=admin
```

### MongoDB Atlas Setup Checklist:

- [ ] Cluster is active (not paused)
- [ ] Database user `tsvetozarkt` exists
- [ ] Password is `Tsvetozar_TsveK22` (case-sensitive)
- [ ] User has `readWrite` access to `tsvdistribution` database
- [ ] Current IP is whitelisted (or 0.0.0.0/0 for testing)
- [ ] No network restrictions

### If Still Failing:

1. **Create a new database user** with a simple password (no special characters)
2. **Reset the password** for existing user
3. **Check cluster logs** in MongoDB Atlas
4. **Contact MongoDB Support** if issue persists

### Alternative: Local MongoDB

If Atlas continues to fail, set up local MongoDB:

```bash
# Install MongoDB locally
# Then use:
MONGODB_URI=mongodb://localhost:27017/tsvdistribution
```
