# Supabase Keep-Alive Schedule

This guide explains how to keep your Supabase project active and prevent it from being suspended due to inactivity.

## Overview

The keep-alive system includes:
- **API endpoint**: `/api/keep-alive` - performs read operations on key tables
- **Security**: Optional secret key authentication
- **Configuration**: Multiple cron service options

## Setup Options

### Option 1: Vercel Cron Jobs (Recommended for Vercel-hosted projects)

If you're hosting on Vercel, the easiest approach is using their built-in cron functionality.

**File**: `vercel.json` (already created)

Current configuration runs the keep-alive endpoint daily at midnight (recommended for free tier):
```json
{
  "crons": [
    {
      "path": "/api/keep-alive",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**Cron schedule formats** (using standard cron notation):
- `0 0 * * *` - Daily at midnight (current)
- `0 */6 * * *` - Every 6 hours
- `0 0,6,12,18 * * *` - Four times daily
- `0 * * * *` - Every hour

**To activate**:
1. Deploy to Vercel (push to your repository)
2. Go to Vercel Dashboard → Project Settings → Cron Jobs
3. Verify the cron job is listed and enabled

---

### Option 2: External Cron Service (Works anywhere)

Use a free external service like:
- **cron-job.org** (free, up to 10 jobs)
- **EasyCron** (free tier available)
- **healthchecks.io** (can trigger HTTP requests)

**Steps**:

1. **Set environment variable**:
   ```bash
   KEEP_ALIVE_SECRET_KEY=your-super-secret-key-here
   ```
   
2. **Create the cron job** with:
   - **URL**: `https://yoursite.com/api/keep-alive`
   - **Method**: GET
   - **Header**: `Authorization: Bearer your-super-secret-key-here`
   - **Schedule**: Daily at any time (e.g., 2 AM)

3. **Popular free services**:
   - [cron-job.org](https://cron-job.org) - Simple, free
   - [EasyCron](https://www.easycron.com) - Good for multiple jobs
   - [healthchecks.io](https://healthchecks.io) - More features

---

### Option 3: Self-Hosted with Node Cron (Local machine)

If running your app locally on a server:

**Install dependency**:
```bash
npm install node-cron
```

**Create scheduler file** (`lib/keepAliveScheduler.js`):
```javascript
import cron from 'node-cron';

export function startKeepAliveScheduler(baseUrl = 'http://localhost:3000') {
  // Run daily
  cron.schedule('0 0 * * *', async () => {
    try {
      const response = await fetch(`${baseUrl}/api/keep-alive`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.KEEP_ALIVE_SECRET_KEY}`
        }
      });
      const data = await response.json();
      console.log('Keep-alive check:', data.timestamp, 'Status:', data.success);
    } catch (error) {
      console.error('Keep-alive check failed:', error);
    }
  });

  console.log('Keep-alive scheduler started (runs daily)');
}
```

**In your app entry point** (`app/layout.js` or server startup):
```javascript
import { startKeepAliveScheduler } from '@/lib/keepAliveScheduler';

// Call during app initialization (server-side only)
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  startKeepAliveScheduler();
}
```

---

## API Endpoint Details

**Endpoint**: `GET /api/keep-alive`

**Headers**:
```
Authorization: Bearer your-secret-key-here (optional but recommended)
```

**Response** (success):
```json
{
  "success": true,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "results": {
    "seasonSummaries": { "success": true, "count": 5 },
    "divisions": { "success": true, "count": 3 },
    "players": { "success": true, "count": 42 },
    "matches": { "success": true, "count": 120 },
    "previousMatches": { "success": true, "count": 500 }
  }
}
```

**Response** (error):
```json
{
  "success": false,
  "error": "Failed to execute keep-alive check",
  "details": "error message here"
}
```

---

## Environment Variables

Add to your `.env.local` file:

```bash
# Optional: Secret key for authorization (prevents unauthorized calls)
KEEP_ALIVE_SECRET_KEY=your-super-secret-key-here

# Existing Supabase variables (should already exist)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## Testing

**Local testing**:
```bash
# Without auth
curl http://localhost:3000/api/keep-alive

# With auth
curl -H "Authorization: Bearer your-secret-key" http://localhost:3000/api/keep-alive
```

**Production testing** (Vercel):
```bash
# Without auth
curl https://yoursite.com/api/keep-alive

# With auth
curl -H "Authorization: Bearer your-secret-key" https://yoursite.com/api/keep-alive
```

---

## Monitoring

**Check Vercel logs**:
1. Go to Vercel Dashboard
2. Select your project
3. Go to "Deployments" → Latest deployment
4. Click "View Logs" → "Cron"
5. You'll see execution history

**Set up notifications**:
- Vercel can notify you of cron failures
- External services typically have monitoring dashboards

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check your secret key matches in env variables |
| 500 Error | Verify Supabase credentials are correct |
| Cron not running | Ensure deployment is successful; check Vercel cron settings |
| No database activity | Try increasing frequency or check Supabase logs |

---

## Recommendation

For the best experience:
- **Vercel-hosted**: Use Option 1 (Vercel Cron) - no additional setup
- **Other hosting**: Use Option 2 (External Service) - reliable and free
- **Self-hosted/Always-on server**: Use Option 3 (Node Cron)

**Frequency**: Daily keeps free-tier projects active indefinitely.
