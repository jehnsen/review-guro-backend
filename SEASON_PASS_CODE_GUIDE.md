# Season Pass Code System Guide

## Overview
The Season Pass Code system allows users to activate premium features by redeeming unique codes, typically bundled with e-book purchases or distributed through promotions.

## User Workflow

### 1. New User Registration (Free Tier)
```
User registers → isPremium = false (default)
                 ↓
           Free tier limits apply:
           - 15 practice questions/day
           - 20 questions per mock exam
           - 3 mock exams per month
```

### 2. Upgrade to Premium (3 Methods)

#### Method A: PayMongo Payment
```
User pays ₱399 → PayMongo webhook → isPremium = true
                                    ↓
                              Unlimited access
```

#### Method B: Season Pass Code Redemption
```
User purchases e-book → Receives code (RG-XXXXX-XXXXX)
                         ↓
              User enters code in app → Code validated
                                         ↓
                              isPremium = true → Unlimited access
```

#### Method C: Manual Payment Verification
```
User submits payment proof → Admin verifies → isPremium = true
                                               ↓
                                         Unlimited access
```

## Season Pass Code Format

### Code Structure
```
RG-XXXXX-XXXXX

Example: RG-A3B7K-M9P2Q
```

### Characteristics:
- **Prefix**: Always starts with "RG-"
- **Length**: 15 characters total (RG-XXXXX-XXXXX)
- **Characters**: Uses only distinguishable characters (excludes 0, O, 1, I, L)
- **Character set**: 23456789ABCDEFGHJKMNPQRSTUVWXYZ
- **Case-insensitive**: Stored in uppercase, accepts any case

### Why This Format?
- Easy to read and type
- Prevents user confusion (no similar-looking characters)
- Professional appearance
- Short enough to print on materials
- Easy to communicate verbally

## Database Schema

### Table: `season_pass_codes`

```sql
CREATE TABLE "season_pass_codes" (
    "id" UUID PRIMARY KEY,
    "code" VARCHAR(20) UNIQUE NOT NULL,           -- The redemption code
    "is_redeemed" BOOLEAN DEFAULT false,          -- Redemption status
    "redeemed_by" UUID,                           -- User who redeemed
    "redeemed_at" TIMESTAMP,                      -- When redeemed
    "created_by" UUID,                            -- Admin who generated
    "batch_id" VARCHAR(50),                       -- Batch identifier
    "expires_at" TIMESTAMP,                       -- Expiration (optional)
    "notes" TEXT,                                 -- Notes/description
    "created_at" TIMESTAMP DEFAULT now(),
    "updated_at" TIMESTAMP DEFAULT now()
);
```

## API Endpoints

### User Endpoints (Authenticated)

#### 1. Redeem Season Pass Code
```http
POST /api/season-pass-codes/redeem
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "RG-ABC12-XYZ34"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Season Pass activated successfully! You now have unlimited access.",
  "data": {
    "success": true,
    "message": "Season Pass activated successfully! You now have unlimited access.",
    "subscription": {
      "id": "uuid",
      "planName": "Season Pass",
      "status": "active",
      "activatedAt": "2024-01-31T12:00:00Z"
    }
  }
}
```

**Error Responses:**

Invalid format:
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Invalid code format. Code should be in format: RG-XXXXX-XXXXX"
  }
}
```

Already redeemed:
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Code already redeemed"
  }
}
```

Already premium:
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "You already have an active Season Pass"
  }
}
```

#### 2. Verify Code (Before Redemption)
```http
POST /api/season-pass-codes/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "RG-ABC12-XYZ34"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Code is valid and ready to redeem",
  "data": {
    "valid": true,
    "message": "Code is valid and ready to redeem",
    "details": {
      "isRedeemed": false,
      "expiresAt": null
    }
  }
}
```

### Admin Endpoints

#### 3. Generate Codes
```http
POST /api/season-pass-codes/generate
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "count": 100,
  "batchId": "EBOOK-2024-JAN",
  "expiresAt": "2024-12-31T23:59:59Z",
  "notes": "E-book bundle promo - January 2024"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Generated 100 season pass codes",
  "data": {
    "batchId": "EBOOK-2024-JAN",
    "codes": [
      "RG-A3B7K-M9P2Q",
      "RG-X4Y8Z-N2R5T",
      ...
    ],
    "count": 100
  }
}
```

#### 4. Get Batch Statistics
```http
GET /api/season-pass-codes/batch/EBOOK-2024-JAN/stats
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Batch statistics retrieved successfully",
  "data": {
    "batchId": "EBOOK-2024-JAN",
    "total": 100,
    "redeemed": 37,
    "unredeemed": 63,
    "redeemedPercentage": 37.00,
    "createdAt": "2024-01-15T10:00:00Z",
    "expiresAt": "2024-12-31T23:59:59Z",
    "notes": "E-book bundle promo - January 2024"
  }
}
```

#### 5. List Unredeemed Codes
```http
GET /api/season-pass-codes/unredeemed?limit=50
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Unredeemed codes retrieved successfully",
  "data": {
    "codes": [
      {
        "id": "uuid",
        "code": "RG-A3B7K-M9P2Q",
        "isRedeemed": false,
        "batchId": "EBOOK-2024-JAN",
        "expiresAt": "2024-12-31T23:59:59Z",
        "createdAt": "2024-01-15T10:00:00Z"
      },
      ...
    ],
    "count": 50
  }
}
```

#### 6. List Redeemed Codes
```http
GET /api/season-pass-codes/redeemed?limit=50
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Redeemed codes retrieved successfully",
  "data": {
    "codes": [
      {
        "id": "uuid",
        "code": "RG-X4Y8Z-N2R5T",
        "isRedeemed": true,
        "redeemedBy": "user-uuid",
        "redeemedAt": "2024-01-20T14:30:00Z",
        "batchId": "EBOOK-2024-JAN",
        "createdAt": "2024-01-15T10:00:00Z"
      },
      ...
    ],
    "count": 50
  }
}
```

## Code Generation

### Programmatic Generation

```typescript
import { generateSeasonPassCodes } from './utils/codeGenerator';

// Generate 100 unique codes
const codes = generateSeasonPassCodes(100);

// Example output:
// [
//   "RG-A3B7K-M9P2Q",
//   "RG-X4Y8Z-N2R5T",
//   ...
// ]
```

### Via API (Admin)

```bash
curl -X POST https://api.reviewguro.com/api/season-pass-codes/generate \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "count": 500,
    "batchId": "EBOOK-BUNDLE-2024",
    "expiresAt": "2024-12-31T23:59:59Z",
    "notes": "New Year E-book Bundle"
  }'
```

### Bulk Generation for E-book Printing

1. Generate codes via admin API
2. Export to CSV/Excel for printing
3. Print codes on e-book materials or inserts
4. Track redemption via batch statistics

## Frontend Integration

### Redemption Flow (User)

```javascript
// 1. User enters code in redemption form
const code = "RG-ABC12-XYZ34";

// 2. Optional: Verify code first (show validation feedback)
const verification = await fetch('/api/season-pass-codes/verify', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ code }),
}).then(r => r.json());

if (!verification.data.valid) {
  showError(verification.data.message);
  return;
}

// 3. Redeem the code
try {
  const result = await fetch('/api/season-pass-codes/redeem', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code }),
  }).then(r => r.json());

  if (result.success) {
    // Show success message
    showSuccess(result.message);

    // Refresh user data to get updated premium status
    await refreshUserData();

    // Redirect to premium features
    router.push('/practice');
  }
} catch (error) {
  if (error.code === 'BAD_REQUEST') {
    showError(error.message);
  } else if (error.code === 'CONFLICT') {
    showInfo('You already have premium access!');
  }
}
```

### Admin Code Management

```javascript
// Generate codes for e-book bundle
async function generateEbookCodes() {
  const result = await fetch('/api/season-pass-codes/generate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      count: 1000,
      batchId: `EBOOK-${Date.now()}`,
      expiresAt: '2024-12-31T23:59:59Z',
      notes: 'CSE Reviewer E-book Bundle Q4 2024',
    }),
  }).then(r => r.json());

  // Download codes as CSV for printing
  downloadAsCSV(result.data.codes, 'season-pass-codes.csv');
}

// Monitor redemption rates
async function checkRedemptionStats(batchId) {
  const stats = await fetch(
    `/api/season-pass-codes/batch/${batchId}/stats`,
    {
      headers: { 'Authorization': `Bearer ${adminToken}` },
    }
  ).then(r => r.json());

  console.log(`
    Batch: ${stats.data.batchId}
    Total: ${stats.data.total}
    Redeemed: ${stats.data.redeemed} (${stats.data.redeemedPercentage}%)
    Remaining: ${stats.data.unredeemed}
  `);
}
```

## Use Cases

### 1. E-book Bundle Promotion
```
1. Print 500 e-books with Season Pass codes
2. Generate 500 codes: POST /api/season-pass-codes/generate
3. Print codes on book inserts or stickers
4. Users purchase book → get code → redeem for premium access
5. Track redemption rate via batch stats
```

### 2. Referral Program
```
1. Generate unique codes for top users
2. Users share codes with friends
3. Friends redeem codes → get premium access
4. Track which codes are most shared
```

### 3. Promotional Giveaways
```
1. Generate 100 codes for social media giveaway
2. Set expiration date (e.g., 30 days)
3. Give codes to contest winners
4. Monitor redemption before expiry
```

### 4. Corporate Training Packages
```
1. Generate bulk codes for company purchase
2. Set batchId for tracking
3. Company distributes to employees
4. Monitor adoption rate
```

## Security Considerations

### Code Validation
✅ Format validation (RG-XXXXX-XXXXX)
✅ Database lookup for existence
✅ Redemption status check
✅ Expiration date check
✅ One-time use only

### Fraud Prevention
- Codes are cryptographically random
- Each code can only be redeemed once
- Redemption tracked with user ID and timestamp
- Batch tracking for accountability
- Optional expiration dates

### Best Practices
1. **Don't expose unredeemed codes publicly**
2. **Set expiration dates for promotional codes**
3. **Use batch IDs for tracking and audit**
4. **Monitor redemption patterns for abuse**
5. **Regularly review redeemed vs unredeemed ratios**

## Testing

### Test Code Redemption Flow

```bash
# 1. Generate test codes (as admin)
curl -X POST http://localhost:3000/api/season-pass-codes/generate \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"count": 10, "batchId": "TEST-BATCH"}'

# 2. Verify a code (as user)
curl -X POST http://localhost:3000/api/season-pass-codes/verify \
  -H "Authorization: Bearer <user-token>" \
  -H "Content-Type: application/json" \
  -d '{"code": "RG-XXXXX-XXXXX"}'

# 3. Redeem the code (as user)
curl -X POST http://localhost:3000/api/season-pass-codes/redeem \
  -H "Authorization: Bearer <user-token>" \
  -H "Content-Type: application/json" \
  -d '{"code": "RG-XXXXX-XXXXX"}'

# 4. Try to redeem again (should fail)
curl -X POST http://localhost:3000/api/season-pass-codes/redeem \
  -H "Authorization: Bearer <user-token>" \
  -H "Content-Type: application/json" \
  -d '{"code": "RG-XXXXX-XXXXX"}'

# 5. Check batch stats (as admin)
curl http://localhost:3000/api/season-pass-codes/batch/TEST-BATCH/stats \
  -H "Authorization: Bearer <admin-token>"
```

### Test Checklist
- [ ] Can generate codes via API
- [ ] Codes follow correct format
- [ ] Can verify code before redemption
- [ ] Can redeem valid code
- [ ] Premium status is activated after redemption
- [ ] Cannot redeem already-redeemed code
- [ ] Cannot redeem invalid/non-existent code
- [ ] Cannot redeem expired code
- [ ] Batch statistics are accurate
- [ ] Can list unredeemed codes (admin)
- [ ] Can list redeemed codes with user info (admin)

## Monitoring & Analytics

### Key Metrics to Track

1. **Redemption Rate**: `(redeemed / total) * 100`
2. **Time to Redeem**: Average time from code generation to redemption
3. **Expiry Waste**: Percentage of codes that expired unredeemed
4. **Batch Performance**: Compare redemption rates across batches
5. **User Acquisition**: New premium users via codes vs payments

### Database Queries

```sql
-- Get redemption stats by batch
SELECT
  batch_id,
  COUNT(*) as total,
  SUM(CASE WHEN is_redeemed THEN 1 ELSE 0 END) as redeemed,
  ROUND(100.0 * SUM(CASE WHEN is_redeemed THEN 1 ELSE 0 END) / COUNT(*), 2) as redemption_rate
FROM season_pass_codes
GROUP BY batch_id
ORDER BY redemption_rate DESC;

-- Find expired unredeemed codes
SELECT code, batch_id, expires_at
FROM season_pass_codes
WHERE is_redeemed = false
  AND expires_at < NOW();

-- Recent redemptions
SELECT
  spc.code,
  spc.batch_id,
  spc.redeemed_at,
  u.email
FROM season_pass_codes spc
JOIN users u ON u.id = spc.redeemed_by
WHERE spc.is_redeemed = true
ORDER BY spc.redeemed_at DESC
LIMIT 100;
```

## Files Created/Modified

### New Files:
- `prisma/schema.prisma` - Added SeasonPassCode model
- `prisma/migrations/20260131135432_add_season_pass_codes/` - Database migration
- `src/repositories/seasonPassCode.repository.ts` - Data access layer
- `src/services/seasonPassCode.service.ts` - Business logic
- `src/controllers/seasonPassCode.controller.ts` - HTTP handlers
- `src/routes/seasonPassCode.routes.ts` - API routes
- `src/utils/codeGenerator.ts` - Code generation utilities
- `SEASON_PASS_CODE_GUIDE.md` - This documentation

### Modified Files:
- `src/routes/index.ts` - Registered season pass code routes
- `src/repositories/subscription.repository.ts` - Added support for code redemption fields

## Support & Troubleshooting

### Common Issues

**Q: Code not working / "Invalid code"**
- Check format (RG-XXXXX-XXXXX)
- Ensure code hasn't been redeemed
- Check if code has expired
- Verify code exists in database

**Q: User already has premium but wants to redeem code**
- This is prevented to avoid waste
- They should share code with someone else
- Or contact support for special handling

**Q: How to bulk export codes for printing?**
- Use the generate API endpoint
- Export the returned array to CSV
- Use batch ID for tracking

**Q: Can codes be deactivated or revoked?**
- Not currently supported
- Consider using expiration dates instead
- For revocation, manually update is_redeemed flag in database

## Future Enhancements

- [ ] Code deactivation/revocation feature
- [ ] Multi-use codes (redeem N times)
- [ ] Code usage analytics dashboard
- [ ] Auto-expire codes after X days unredeemed
- [ ] Email notification when code is generated
- [ ] QR code generation for easier redemption
- [ ] Partner/affiliate tracking
