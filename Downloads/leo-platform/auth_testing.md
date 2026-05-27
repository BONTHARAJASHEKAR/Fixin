# Auth Testing Playbook for Leomote

## Step 1: Create Test User & Session
```bash
mongosh --eval "
use('leomote_db');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  role: 'user',
  plan: 'free',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2: Test API endpoints
```bash
# JWT signup/login
curl -X POST "$BACKEND/api/auth/signup" -H "Content-Type: application/json" \
  -d '{"email":"u@x.com","password":"Test@1234","name":"User"}'

curl -X POST "$BACKEND/api/auth/login" -H "Content-Type: application/json" \
  -d '{"email":"u@x.com","password":"Test@1234"}'

# Google OAuth: GET /api/auth/session (frontend sends session_id from URL fragment)

# Authenticated endpoint:
curl -X GET "$BACKEND/api/auth/me" -H "Authorization: Bearer YOUR_TOKEN"
```

## Step 3: Browser cookie set
```python
await page.context.add_cookies([{
    "name": "session_token", "value": "TOKEN",
    "domain": "your-app.com", "path": "/",
    "httpOnly": True, "secure": True, "sameSite": "None"
}])
```

## Checklist
- [ ] /api/auth/me returns user
- [ ] Dashboard loads without redirect
- [ ] Admin login at /admin/login works with admin@leomote.ai / Admin@2026
