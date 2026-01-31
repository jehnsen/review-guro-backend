# Free Tier Access Control Implementation

## Overview
This document describes the free tier access control system implemented to limit access for non-premium users while providing unlimited access to Season Pass subscribers.

## Free Tier Limits

### Practice Questions
- **Free Users**: 15 questions per day
- **Premium Users**: Unlimited

### Mock Exams
- **Free Users**:
  - Maximum 20 questions per mock exam
  - Maximum 3 mock exams per month
- **Premium Users**:
  - Maximum 170 questions per mock exam
  - Unlimited mock exams

## Configuration

### Environment Variables
Add these to your `.env` file (see `.env.example`):

```env
# Free Tier Limits
FREE_TIER_PRACTICE_LIMIT_PER_DAY=15
FREE_TIER_MOCK_EXAM_QUESTIONS_LIMIT=20
FREE_TIER_MOCK_EXAMS_PER_MONTH=3
```

## Database Changes

### New Table: `daily_practice_usage`
Tracks daily practice question usage for free tier enforcement.

```sql
CREATE TABLE "daily_practice_usage" (
    "id" UUID PRIMARY KEY,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "questions_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    UNIQUE(user_id, date)
);
```

**Migration**: `20260131125021_add_daily_practice_usage`

## Implementation Details

### 1. Access Control Utilities (`src/utils/accessControl.ts`)

#### Functions:
- `isPremiumUser(user)`: Checks if user has active premium status
- `getUserAccessLimits(user)`: Returns access limits based on user tier
- `exceedsLimit(current, limit)`: Checks if a limit has been exceeded

### 2. Practice Service Updates (`src/services/practice.service.ts`)

#### Changes:
- ✅ Check daily practice limit before allowing answer submission
- ✅ Track daily usage for free tier users
- ✅ New method: `getDailyLimits(userId)` - Returns current usage and limits

#### Error Handling:
```javascript
throw new ForbiddenError(
  `Daily practice limit reached. Free users can answer up to 15 questions per day.
   Upgrade to Season Pass for unlimited access.`
);
```

### 3. Mock Exam Service Updates (`src/services/mockExam.service.ts`)

#### Changes:
- ✅ Validate max questions against user tier when creating exam
- ✅ Check monthly exam limit for free users
- ✅ New method: `getMockExamLimits(userId)` - Returns exam limits and usage

#### Error Handling:
```javascript
// For question limit
throw new ForbiddenError(
  `Free users can create mock exams with up to 20 questions.
   Upgrade to Season Pass for exams with up to 170 questions.`
);

// For monthly limit
throw new ForbiddenError(
  `Monthly mock exam limit reached. Free users can take up to 3 mock exams per month.
   Upgrade to Season Pass for unlimited mock exams.`
);
```

### 4. Daily Practice Usage Repository (`src/repositories/dailyPracticeUsage.repository.ts`)

#### Methods:
- `getTodayCount(userId)`: Get today's practice count
- `incrementTodayCount(userId)`: Increment today's count
- `getCountForDate(userId, date)`: Get count for specific date
- `getHistory(userId, days)`: Get practice history

## New API Endpoints

### Practice Limits
```
GET /api/practice/limits
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isPremium": false,
    "dailyLimit": 15,
    "usedToday": 5,
    "remainingToday": 10
  },
  "message": "Daily limits retrieved successfully"
}
```

**Premium User Response:**
```json
{
  "success": true,
  "data": {
    "isPremium": true,
    "dailyLimit": -1,
    "usedToday": 50,
    "remainingToday": -1
  }
}
```

### Mock Exam Limits
```
GET /api/mock-exams/limits
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isPremium": false,
    "maxQuestionsPerExam": 20,
    "maxExamsPerMonth": 3,
    "examsUsedThisMonth": 1,
    "remainingExamsThisMonth": 2
  },
  "message": "Mock exam limits retrieved successfully"
}
```

**Premium User Response:**
```json
{
  "success": true,
  "data": {
    "isPremium": true,
    "maxQuestionsPerExam": 170,
    "maxExamsPerMonth": -1,
    "examsUsedThisMonth": 10,
    "remainingExamsThisMonth": -1
  }
}
```

**Note**: `-1` indicates unlimited access

## Premium Activation Flow

When a user purchases a Season Pass (via PayMongo or manual verification):

1. Payment is processed/verified
2. `User.isPremium` is set to `true` in the database
3. All limits are automatically lifted:
   - Practice questions become unlimited
   - Mock exams become unlimited (up to 170 questions)
   - Monthly exam limit is removed

### Existing Implementation
The premium activation is already handled in:
- `src/services/subscription.service.ts` (lines 64, 88)
- PayMongo webhook/callback handling
- Manual payment verification by admin

## Error Responses

### 403 Forbidden - Daily Practice Limit Reached
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Daily practice limit reached. Free users can answer up to 15 questions per day. Upgrade to Season Pass for unlimited access."
  }
}
```

### 403 Forbidden - Mock Exam Question Limit
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Free users can create mock exams with up to 20 questions. Upgrade to Season Pass for exams with up to 170 questions."
  }
}
```

### 403 Forbidden - Monthly Mock Exam Limit
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Monthly mock exam limit reached. Free users can take up to 3 mock exams per month. Upgrade to Season Pass for unlimited mock exams."
  }
}
```

## Frontend Integration Guide

### 1. Fetch User Limits on App Load
```javascript
// Fetch practice limits
const practiceLimits = await fetch('/api/practice/limits', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

// Fetch mock exam limits
const mockLimits = await fetch('/api/mock-exams/limits', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());
```

### 2. Display Limits in UI
```javascript
if (!practiceLimits.data.isPremium) {
  // Show: "5 of 15 questions used today"
  // Show upgrade prompt when remainingToday is low
}

if (!mockLimits.data.isPremium) {
  // Show: "1 of 3 mock exams used this month"
  // Disable mock exam creation if remainingExamsThisMonth === 0
}
```

### 3. Handle Limit Errors
```javascript
try {
  await submitAnswer(questionId, answer);
} catch (error) {
  if (error.code === 'FORBIDDEN') {
    // Show upgrade modal/prompt
    showUpgradeModal(error.message);
  }
}
```

### 4. Real-time Limit Updates
After each practice question submission or mock exam creation, re-fetch limits:
```javascript
// After submitting an answer
await submitAnswer(...);
await fetchPracticeLimits(); // Update UI

// After creating a mock exam
await createMockExam(...);
await fetchMockExamLimits(); // Update UI
```

## Testing Checklist

### Free User Tests
- [ ] Cannot submit more than 15 practice questions in a day
- [ ] Cannot create mock exam with more than 20 questions
- [ ] Cannot create more than 3 mock exams in a month
- [ ] Proper error messages displayed
- [ ] Limits endpoint returns correct values

### Premium User Tests
- [ ] Can submit unlimited practice questions
- [ ] Can create mock exams with up to 170 questions
- [ ] Can create unlimited mock exams
- [ ] Limits endpoint returns -1 for unlimited features

### Premium Activation Tests
- [ ] After payment, user immediately gets unlimited access
- [ ] Previous daily practice count doesn't block premium users
- [ ] Previous monthly exam count doesn't block premium users

## Files Modified/Created

### Created Files:
- `src/utils/accessControl.ts` - Access control utilities
- `src/repositories/dailyPracticeUsage.repository.ts` - Daily usage tracking
- `prisma/migrations/20260131125021_add_daily_practice_usage/` - Database migration
- `FREE_TIER_IMPLEMENTATION.md` - This documentation

### Modified Files:
- `src/config/env.ts` - Added free tier configuration
- `src/services/practice.service.ts` - Added access control
- `src/services/mockExam.service.ts` - Added access control
- `src/controllers/practice.controller.ts` - Added limits endpoint
- `src/controllers/mockExam.controller.ts` - Added limits endpoint
- `src/routes/practice.routes.ts` - Added limits route
- `src/routes/mockExam.routes.ts` - Added limits route
- `prisma/schema.prisma` - Added DailyPracticeUsage model
- `.env.example` - Added free tier environment variables

## Maintenance Notes

### Adjusting Limits
To change free tier limits, update the environment variables:
```env
FREE_TIER_PRACTICE_LIMIT_PER_DAY=20  # Increase daily practice limit
FREE_TIER_MOCK_EXAM_QUESTIONS_LIMIT=30  # Increase mock exam questions
FREE_TIER_MOCK_EXAMS_PER_MONTH=5  # Increase monthly exams
```

No code changes required - restart the server to apply.

### Monitoring
Track daily practice usage:
```sql
SELECT user_id, date, questions_count
FROM daily_practice_usage
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC, questions_count DESC;
```

Track monthly mock exam usage:
```sql
SELECT user_id, COUNT(*) as exams_this_month
FROM mock_exams
WHERE status = 'COMPLETED'
  AND completed_at >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY user_id
HAVING COUNT(*) >= 3
ORDER BY COUNT(*) DESC;
```

## Support & Troubleshooting

### Issue: Free user can still access unlimited features
**Solution**: Check `User.isPremium` flag in database. Ensure it's `false` for free users.

### Issue: Premium user being limited
**Solution**: Verify `User.isPremium = true` and `User.premiumExpiry` is null or in the future.

### Issue: Daily limit not resetting
**Solution**: The system uses UTC dates. Daily limits reset at 00:00 UTC. Check timezone handling.

### Issue: Monthly exam count incorrect
**Solution**: System counts completed exams from the 1st of the current month. Verify `MockExam.completedAt` timestamps.
