# Gmail OAuth Implementation Guide

## Overview

This document describes the complete Gmail OAuth 2.0 integration for Shadow. The implementation handles the authorization flow, token exchange, and provides success/error feedback to users.

## Files Added/Modified

### New Files Created

1. **backend/oauth/gmailOAuth.ts**
   - Core OAuth service module
   - Handles authorization URL generation
   - Exchanges auth codes for tokens
   - Manages token refresh
   - Provides in-memory token storage (mock)

2. **dashboard/pages/OAuthSuccess.tsx**
   - Full-screen success page after authorization
   - Shows confirmation message with provider details
   - Provides links back to dashboard/settings

3. **dashboard/pages/OAuthError.tsx**
   - Full-screen error page on auth failure
   - Displays error code and description
   - Provides troubleshooting guide

### Modified Files

1. **backend/apiRoutes.ts**
   - Added OAuth imports and state storage
   - Added `GET /api/integrations/auth/gmail` - initiates OAuth flow
   - Added `GET /integrations/connect/gmail/callback` - handles OAuth callback
   - Added `GET /api/integrations/status/:provider` - check integration status
   - Added `POST /api/integrations/disconnect/:provider` - disconnect integration

2. **dashboard/routing/router.ts**
   - Added `oauth-success` and `oauth-error` page types

3. **dashboard/App.tsx**
   - Added OAuth page imports
   - Added route handling for OAuth pages
   - OAuth pages render without dashboard shell

4. **dashboard/pages/Settings.tsx**
   - Added "Connect Gmail" button in integrations tab
   - Added OAuth state management
   - Added error handling for connection failures

## Architecture

### OAuth Flow

```
User clicks "Connect Gmail"
  ↓
Frontend: GET /api/integrations/auth/gmail
  ↓
Backend: Generate state + authorization URL
  ↓
Redirect to: https://accounts.google.com/o/oauth2/v2/auth?...
  ↓
User authorizes in Google
  ↓
Google redirects to: /integrations/connect/gmail/callback?code=...&state=...
  ↓
Backend: Validate state, exchange code for tokens
  ↓
Store tokens in mock storage
  ↓
Redirect to: /oauth-success?provider=gmail&user_id=...
  ↓
Frontend: Show success page with next steps
```

### Token Management

- **Access Token**: Used for API calls to Gmail
- **Refresh Token**: Used to renew access tokens when expired
- **Storage**: Currently in-memory (mock) - suitable for development
- **Auto-Refresh**: Tokens are automatically refreshed when expired

## Google Cloud Console Setup

### Prerequisites

1. Google Cloud Project created
2. Gmail API enabled
3. OAuth 2.0 credentials configured

### Step-by-Step Setup

#### 1. Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one: "Shadow")
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Choose **Web Application**
6. Name: "Shadow Dashboard"

#### 2. Configure Redirect URIs

In the OAuth 2.0 Client ID credentials:

**Authorized redirect URIs:**
- `http://localhost:3000/integrations/connect/gmail/callback` (development)
- `https://yourdomain.com/integrations/connect/gmail/callback` (production)

#### 3. Copy Credentials to .env

After creating credentials, copy:

```
GMAIL_CLIENT_ID=<your-client-id>
GMAIL_CLIENT_SECRET=<your-client-secret>
GMAIL_REDIRECT_URI=http://localhost:3000/integrations/connect/gmail/callback
```

#### 4. Configure OAuth Consent Screen

1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type
3. Fill in application details:
   - **App name**: Shadow
   - **User support email**: your-email@gmail.com
   - **Developer contact**: your-email@gmail.com

#### 5. Add Gmail Scopes

In the OAuth consent screen, add scopes:

- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.send`

These allow Shadow to:
- Read emails (detect commitments)
- Send draft communications (with user approval)

## Testing the OAuth Flow

### Prerequisites

1. Environment variables configured (see above)
2. Dev server running: `npm run dev`
3. Logged in to a Google account

### Test Steps

#### 1. Start Development Server

```bash
npm run dev
```

Expected output:
```
✓ Backend API running at http://localhost:3000
✓ Frontend proxied from http://localhost:5173
```

#### 2. Navigate to Settings

1. Open http://localhost:3000 in browser
2. Click Settings (⚙️) in sidebar
3. Click "Integrations" tab

#### 3. Connect Gmail

1. Click **"+ Connect Gmail"** button
2. You'll be redirected to Google's OAuth page
3. Sign in if needed
4. Grant permissions to Shadow
5. After authorization, you'll see a success page

#### 4. Verify Connection

On the success page, you should see:
- ✓ Confirmation message
- Gmail icon and provider name
- User ID (mock identifier)
- Next steps (what Shadow will do)
- Buttons to return to Settings or Dashboard

#### 5. Test Error Handling

To test error handling:

1. **Cancel Authorization**: Click "Cancel" on Google's permission page
   - Should redirect to error page with "access_denied"

2. **Invalid State**: Manually manipulate the callback URL's state parameter
   - Should show "Invalid state parameter" error

3. **Network Error**: Disconnect internet before authorization code is exchanged
   - Should show "token_exchange_failed" error

### Expected Behavior

#### Success Flow

1. User clicks "Connect Gmail"
2. Loading state shows "Connecting..."
3. Redirected to Google OAuth consent screen
4. User authorizes
5. Redirected to `/oauth-success` page
6. Success page displays with integration details
7. User can return to Settings or Dashboard

#### Error Flow

1. Authorization fails (user denies, network error, etc.)
2. Redirected to `/oauth-error` page
3. Error page shows:
   - Error code (e.g., "access_denied")
   - Detailed error description
   - Troubleshooting steps
4. User can retry or return to dashboard

## API Endpoints

### 1. Initiate OAuth Flow

```
GET /api/integrations/auth/gmail
```

**Response:**
```json
{
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&state=..."
}
```

**Error Response:**
```json
{
  "error": "Failed to generate authorization URL",
  "message": "Gmail OAuth configuration missing: GMAIL_CLIENT_ID required"
}
```

### 2. OAuth Callback Handler

```
GET /integrations/connect/gmail/callback?code=...&state=...
```

**Success Response:**
Redirects to `/oauth-success?provider=gmail&user_id=...`

**Error Response:**
Redirects to `/oauth-error?error=...&description=...`

### 3. Check Integration Status

```
GET /api/integrations/status/:provider
```

**Example Response:**
```json
{
  "provider": "gmail",
  "status": "connected",
  "lastSync": "2026-07-30T04:00:20.000Z"
}
```

### 4. Disconnect Integration

```
POST /api/integrations/disconnect/:provider
```

**Response:**
```json
{
  "success": true,
  "message": "Disconnected from gmail"
}
```

## Token Storage

### Current Implementation (Mock)

Tokens are stored in-memory using a `Map<string, OAuthTokens>`:

```typescript
const tokenStore = new Map<string, OAuthTokens>();
```

**Limitations:**
- Tokens lost on server restart
- No persistence across processes
- Not suitable for production

### Production Implementation

For production, replace mock storage with:

**Option 1: Database Storage**
```typescript
// Store in MongoDB
const Integration = db.collection('integrations');
await Integration.updateOne(
  { user_id, provider: 'gmail' },
  { $set: { tokens, status: 'connected' } },
  { upsert: true }
);
```

**Option 2: Redis Cache**
```typescript
// Store in Redis with TTL
await redis.setex(
  `tokens:${userId}:gmail`,
  tokens.expiresIn,
  JSON.stringify(tokens)
);
```

**Option 3: Secure Session Storage**
```typescript
// Store in encrypted session
req.session.integrations = {
  gmail: { tokens, status: 'connected' }
};
```

## Security Considerations

### Current Implementation

✅ **What's Secure:**
- State parameter prevents CSRF attacks
- Authorization code is short-lived
- Secrets stored in environment variables
- No hardcoded credentials

⚠️ **What Needs Improvement for Production:**
- Add PKCE (Proof Key for Code Exchange) for mobile apps
- Encrypt tokens before storage
- Add token revocation handling
- Implement rate limiting on OAuth endpoints
- Add request signing for token exchange
- Use secure cookies for state storage (not in-memory Map)

### Environment Variables

Never commit secrets to git:

```bash
# .env (local development only, never commit)
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...

# .gitignore
.env
.env.local
```

## Scope Permissions

The implementation requests these Gmail scopes:

```
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/gmail.send
```

**Justification:**
- `gmail.readonly`: Read emails to detect commitments
- `gmail.send`: Send drafted acknowledgements/completions (with user approval)

**User Consent:**
Users must explicitly authorize these permissions in the OAuth consent screen.

## Troubleshooting

### Issue: "Failed to generate authorization URL"

**Cause:** Missing environment variables

**Solution:**
```bash
# Ensure these are set in .env
echo $GMAIL_CLIENT_ID
echo $GMAIL_CLIENT_SECRET
echo $GMAIL_REDIRECT_URI
```

### Issue: "Invalid state parameter"

**Cause:** 
- State expired (server restarted)
- Manual URL tampering
- Browser back button after callback

**Solution:**
- Restart the authorization flow
- Clear browser cache
- Don't manually edit OAuth URLs

### Issue: "Token exchange failed"

**Cause:**
- Authorization code expired (>10 minutes)
- Network timeout
- Invalid client credentials

**Solution:**
- Start authorization flow again
- Check network connectivity
- Verify credentials in Google Cloud Console

### Issue: OAuth page stuck on loading

**Cause:**
- Vite dev server not running
- Port 5173 blocked
- CORS issues

**Solution:**
```bash
# Kill any processes using ports 3000, 5173
lsof -i :3000
lsof -i :5173

# Restart dev server
npm run dev
```

## Next Steps (Not Implemented)

1. **Persistent Token Storage**
   - Replace in-memory Map with database

2. **Email Scanning Integration**
   - Use tokens to call Gmail API
   - Fetch emails for commitment detection

3. **Evidence Verification**
   - Use GitHub/Calendar tokens to verify commitments

4. **Automated Draft Generation**
   - Generate acknowledgement/completion messages
   - Store as pending drafts for user approval

5. **Token Refresh UI**
   - Show when integrations need re-authorization
   - Handle token expiration gracefully

## Files Summary

| File | Type | Purpose |
|------|------|---------|
| `backend/oauth/gmailOAuth.ts` | NEW | OAuth service logic |
| `dashboard/pages/OAuthSuccess.tsx` | NEW | Success feedback page |
| `dashboard/pages/OAuthError.tsx` | NEW | Error feedback page |
| `backend/apiRoutes.ts` | MODIFIED | OAuth endpoints |
| `dashboard/routing/router.ts` | MODIFIED | Route types |
| `dashboard/App.tsx` | MODIFIED | Route handling |
| `dashboard/pages/Settings.tsx` | MODIFIED | Connect button |

## Verification Commands

```bash
# Type checking
npx tsc --noEmit

# Run tests
npm test

# Start dev server
npm run dev

# Check backend OAuth endpoint
curl http://localhost:3000/api/integrations/auth/gmail
```

All commands should succeed with no errors.
