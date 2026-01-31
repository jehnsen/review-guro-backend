# Testing Guide - Season Pass Codes & Free Tier

## Quick Test: Generate Valid Codes

### Option 1: Via API (Recommended)

**Generate 10 test codes (no expiration):**

```bash
curl -X POST http://localhost:3000/api/season-pass-codes/generate \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "count": 10,
    "batchId": "TEST-BATCH",
    "notes": "Testing codes - no expiration"
  }'
```

**Important:** Don't include `expiresAt` field if you want codes that never expire!

### Option 2: Via Database (Quick & Dirty)

```sql
-- Insert a test code directly into database
INSERT INTO season_pass_codes (id, code, is_redeemed, batch_id, notes, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'RG-TEST1-TEST1',
  false,
  'MANUAL-TEST',
  'Manual test code',
  NOW(),
  NOW()
);

-- Generate more test codes
INSERT INTO season_pass_codes (id, code, is_redeemed, batch_id, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'RG-TEST2-TEST2', false, 'MANUAL-TEST', NOW(), NOW()),
  (gen_random_uuid(), 'RG-TEST3-TEST3', false, 'MANUAL-TEST', NOW(), NOW()),
  (gen_random_uuid(), 'RG-TEST4-TEST4', false, 'MANUAL-TEST', NOW(), NOW());
```

## Complete Test Flow

### 1. Setup - Create Test User

```bash
# Register a free tier user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User"
  }'

# Login to get token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPass123!"
  }'
```

Save the `accessToken` from the response.

### 2. Test Free Tier Limits

**Check practice limits:**
```bash
curl -X GET http://localhost:3000/api/practice/limits \
  -H "Authorization: Bearer YOUR_USER_TOKEN"

# Expected response:
# {
#   "isPremium": false,
#   "dailyLimit": 15,
#   "usedToday": 0,
#   "remainingToday": 15
# }
```

**Check mock exam limits:**
```bash
curl -X GET http://localhost:3000/api/mock-exams/limits \
  -H "Authorization: Bearer YOUR_USER_TOKEN"

# Expected response:
# {
#   "isPremium": false,
#   "maxQuestionsPerExam": 20,
#   "maxExamsPerMonth": 3,
#   "examsUsedThisMonth": 0,
#   "remainingExamsThisMonth": 3
# }
```

### 3. Test Practice Question Limit

**Submit 16 answers to hit the limit:**

```bash
# First answer (should work)
curl -X POST http://localhost:3000/api/practice/submit \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questionId": "SOME_QUESTION_UUID",
    "selectedOptionId": "a"
  }'

# Repeat 15 times...

# 16th answer (should fail with 403)
curl -X POST http://localhost:3000/api/practice/submit \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "questionId": "SOME_QUESTION_UUID",
    "selectedOptionId": "a"
  }'

# Expected error:
# {
#   "success": false,
#   "error": {
#     "code": "FORBIDDEN",
#     "message": "Daily practice limit reached. Free users can answer up to 15 questions per day. Upgrade to Season Pass for unlimited access."
#   }
# }
```

### 4. Test Mock Exam Limit

**Try creating a mock exam with >20 questions:**

```bash
curl -X POST http://localhost:3000/api/mock-exams \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "totalQuestions": 50,
    "timeLimitMinutes": 60,
    "passingScore": 80,
    "categories": "MIXED"
  }'

# Expected error:
# {
#   "success": false,
#   "error": {
#     "code": "FORBIDDEN",
#     "message": "Free users can create mock exams with up to 20 questions. Upgrade to Season Pass for exams with up to 170 questions."
#   }
# }
```

### 5. Test Season Pass Code Redemption

**Verify code before redeeming:**

```bash
curl -X POST http://localhost:3000/api/season-pass-codes/verify \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "RG-TEST1-TEST1"
  }'

# Expected response:
# {
#   "success": true,
#   "message": "Code is valid and ready to redeem",
#   "data": {
#     "valid": true,
#     "message": "Code is valid and ready to redeem",
#     "details": {
#       "isRedeemed": false,
#       "expiresAt": null
#     }
#   }
# }
```

**Redeem the code:**

```bash
curl -X POST http://localhost:3000/api/season-pass-codes/redeem \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "RG-TEST1-TEST1"
  }'

# Expected response:
# {
#   "success": true,
#   "message": "Season Pass activated successfully! You now have unlimited access.",
#   "data": {
#     "success": true,
#     "message": "Season Pass activated successfully! You now have unlimited access.",
#     "subscription": {
#       "id": "uuid",
#       "planName": "Season Pass",
#       "status": "active",
#       "activatedAt": "2024-01-31T..."
#     }
#   }
# }
```

### 6. Verify Premium Access

**Check limits after redemption:**

```bash
curl -X GET http://localhost:3000/api/practice/limits \
  -H "Authorization: Bearer YOUR_USER_TOKEN"

# Expected response:
# {
#   "isPremium": true,
#   "dailyLimit": -1,        // -1 = unlimited
#   "usedToday": 0,
#   "remainingToday": -1     // -1 = unlimited
# }

curl -X GET http://localhost:3000/api/mock-exams/limits \
  -H "Authorization: Bearer YOUR_USER_TOKEN"

# Expected response:
# {
#   "isPremium": true,
#   "maxQuestionsPerExam": 170,
#   "maxExamsPerMonth": -1,         // -1 = unlimited
#   "examsUsedThisMonth": 0,
#   "remainingExamsThisMonth": -1   // -1 = unlimited
# }
```

**Create mock exam with 170 questions (should work now):**

```bash
curl -X POST http://localhost:3000/api/mock-exams \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "totalQuestions": 170,
    "timeLimitMinutes": 120,
    "passingScore": 80,
    "categories": "MIXED"
  }'

# Should succeed!
```

## Common Issues & Solutions

### Issue: "Invalid code format"

**Problem:** Code doesn't match RG-XXXXX-XXXXX pattern

**Solution:** Ensure code follows the format exactly:
- Must start with "RG-"
- Two groups of 5 alphanumeric characters
- Separated by hyphens
- Examples: ✅ `RG-ABC12-XYZ34` ❌ `RG-ABC-XYZ` (too short)

### Issue: "Code has expired"

**Causes:**
1. Code was created with `expiresAt` date in the past
2. Testing with an old code

**Solution:**
```sql
-- Check code expiration in database
SELECT code, expires_at, is_redeemed
FROM season_pass_codes
WHERE code = 'RG-XXXXX-XXXXX';

-- Remove expiration from code
UPDATE season_pass_codes
SET expires_at = NULL
WHERE code = 'RG-XXXXX-XXXXX';
```

### Issue: "Code already redeemed"

**Cause:** Code was already used by another user

**Solution:** Generate a new code or use a different test code

```sql
-- Check redemption status
SELECT code, is_redeemed, redeemed_by, redeemed_at
FROM season_pass_codes
WHERE code = 'RG-XXXXX-XXXXX';

-- Reset code (for testing only!)
UPDATE season_pass_codes
SET is_redeemed = false, redeemed_by = NULL, redeemed_at = NULL
WHERE code = 'RG-XXXXX-XXXXX';
```

### Issue: "You already have an active Season Pass"

**Cause:** User already has premium access

**Solution:** This is expected behavior. Use a different test user.

```sql
-- Check user premium status
SELECT email, is_premium, premium_expiry
FROM users
WHERE email = 'testuser@example.com';

-- Remove premium (for testing only!)
UPDATE users
SET is_premium = false, premium_expiry = NULL
WHERE email = 'testuser@example.com';

-- Also delete subscription
DELETE FROM subscriptions WHERE user_id = (
  SELECT id FROM users WHERE email = 'testuser@example.com'
);
```

## Admin Testing

### Generate Codes for E-book Bundle

```bash
curl -X POST http://localhost:3000/api/season-pass-codes/generate \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "count": 500,
    "batchId": "EBOOK-2024-Q1",
    "notes": "CSE Reviewer E-book Bundle - Q1 2024"
  }'
```

### Check Batch Statistics

```bash
curl -X GET http://localhost:3000/api/season-pass-codes/batch/EBOOK-2024-Q1/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### List Unredeemed Codes

```bash
curl -X GET http://localhost:3000/api/season-pass-codes/unredeemed?limit=50 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### List Recently Redeemed Codes

```bash
curl -X GET http://localhost:3000/api/season-pass-codes/redeemed?limit=50 \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Database Queries for Monitoring

```sql
-- Check all codes in a batch
SELECT code, is_redeemed, redeemed_at, expires_at
FROM season_pass_codes
WHERE batch_id = 'TEST-BATCH'
ORDER BY created_at DESC;

-- Check redemption stats
SELECT
  batch_id,
  COUNT(*) as total,
  SUM(CASE WHEN is_redeemed THEN 1 ELSE 0 END) as redeemed,
  COUNT(*) - SUM(CASE WHEN is_redeemed THEN 1 ELSE 0 END) as remaining
FROM season_pass_codes
GROUP BY batch_id;

-- Check daily practice usage
SELECT u.email, dpu.date, dpu.questions_count
FROM daily_practice_usage dpu
JOIN users u ON u.id = dpu.user_id
WHERE dpu.date = CURRENT_DATE
ORDER BY dpu.questions_count DESC;

-- Check users with premium
SELECT email, is_premium, premium_expiry, created_at
FROM users
WHERE is_premium = true
ORDER BY created_at DESC;
```

## Reset Everything (Fresh Start)

```sql
-- Reset test user to free tier
UPDATE users
SET is_premium = false, premium_expiry = NULL
WHERE email = 'testuser@example.com';

-- Delete test subscriptions
DELETE FROM subscriptions
WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test%');

-- Delete daily practice usage
DELETE FROM daily_practice_usage
WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test%');

-- Reset test codes
UPDATE season_pass_codes
SET is_redeemed = false, redeemed_by = NULL, redeemed_at = NULL
WHERE batch_id LIKE 'TEST%';

-- Or delete test codes entirely
DELETE FROM season_pass_codes WHERE batch_id LIKE 'TEST%';
```

## Postman Collection

Import these into Postman for easier testing:

1. Create environment variables:
   - `baseUrl`: `http://localhost:3000`
   - `userToken`: (set after login)
   - `adminToken`: (set after admin login)

2. Test collection structure:
   ```
   📁 ReviewGuro API Tests
   ├── 📁 Auth
   │   ├── Register User
   │   └── Login User
   ├── 📁 Free Tier Tests
   │   ├── Get Practice Limits
   │   ├── Get Mock Exam Limits
   │   ├── Submit Answer (test limit)
   │   └── Create Mock Exam (test limit)
   ├── 📁 Season Pass Codes
   │   ├── Verify Code
   │   ├── Redeem Code
   │   ├── Generate Codes (Admin)
   │   ├── Get Batch Stats (Admin)
   │   ├── List Unredeemed (Admin)
   │   └── List Redeemed (Admin)
   └── 📁 Premium Verification
       ├── Get Practice Limits (Premium)
       ├── Get Mock Exam Limits (Premium)
       └── Create Large Mock Exam
   ```

## Troubleshooting Checklist

- [ ] Server is running (`npm run dev`)
- [ ] Database migrations applied (`npx prisma migrate dev`)
- [ ] User has valid JWT token
- [ ] Code follows correct format (RG-XXXXX-XXXXX)
- [ ] Code exists in database
- [ ] Code is not expired
- [ ] Code is not already redeemed
- [ ] User doesn't already have premium
- [ ] Environment variables are set correctly
