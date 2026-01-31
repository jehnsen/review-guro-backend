# Streak Repair & Taste Test Feature Guide

## Overview
This document describes the implementation of:
1. **Streak Tracking** - Daily activity tracking with repair feature
2. **Taste Test** - Limited free access to mock exam explanations

---

## 1. Streak Tracking System

### Features
- Automatically tracks daily activity streaks when users answer practice questions
- Detects broken streaks (missed days)
- Offers "Streak Repair" for 1 missed day
- Tracks current and longest streaks

### Database Schema

#### Table: `user_streaks`
```sql
CREATE TABLE "user_streaks" (
    "id" UUID PRIMARY KEY,
    "user_id" UUID UNIQUE NOT NULL,
    "current_streak" INTEGER DEFAULT 0,
    "longest_streak" INTEGER DEFAULT 0,
    "last_activity_date" DATE,
    "streak_repaired_at" TIMESTAMP,
    "created_at" TIMESTAMP DEFAULT now(),
    "updated_at" TIMESTAMP
);
```

### How Streaks Work

#### Automatic Tracking
Streaks are automatically updated when users submit practice answers:

```typescript
// Triggered on POST /api/practice/submit
await streakService.updateStreak(userId);
```

#### Streak Logic

**Scenario 1: First Activity**
```
No previous activity → Set streak to 1
```

**Scenario 2: Same Day**
```
Last activity: Today
Action: No change (don't increment multiple times per day)
```

**Scenario 3: Consecutive Day**
```
Last activity: Yesterday
Action: Increment streak by 1
        Update longest streak if new record
```

**Scenario 4: Missed Days**
```
Last activity: 2+ days ago
Action: Reset streak to 1
        Keep longest streak unchanged
```

### Streak Repair Feature

#### Eligibility
Can repair if:
- ✅ Missed exactly 1 day
- ✅ Currently on day 2 without activity
- ✅ Haven't already repaired today

Cannot repair if:
- ❌ Missed 2+ days
- ❌ Already repaired today
- ❌ Streak not broken (0 missed days)

#### Example Timeline
```
Day 1: Answer questions ✅ (Streak: 1)
Day 2: Answer questions ✅ (Streak: 2)
Day 3: Answer questions ✅ (Streak: 3)
Day 4: No activity ❌ (Missed 1 day)
Day 5: Get streak repair prompt
       - canRepair: true
       - missedDays: 1
       - repairCost: 50 points

User repairs → Streak continues at 3
Day 5: Answer questions ✅ (Streak: 4)
```

---

## 2. API Endpoints

### GET /api/analytics/streak

Get streak status with repair information.

**Request:**
```http
GET /api/analytics/streak
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "currentStreak": 5,
    "longestStreak": 12,
    "lastActivityDate": "2024-01-30",
    "canRepair": false,
    "missedDays": 0,
    "repairCost": 0
  },
  "message": "Streak status retrieved successfully"
}
```

**When Repair Available:**
```json
{
  "success": true,
  "data": {
    "currentStreak": 5,
    "longestStreak": 12,
    "lastActivityDate": "2024-01-29",
    "canRepair": true,
    "missedDays": 1,
    "repairCost": 50
  }
}
```

### POST /api/analytics/streak/repair

Repair a broken streak.

**Request:**
```http
POST /api/analytics/streak/repair
Authorization: Bearer <token>
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Streak repaired successfully! Your streak continues.",
    "currentStreak": 5,
    "repairCost": 50
  },
  "message": "Streak repaired successfully! Your streak continues."
}
```

**Error Responses:**

Streak not broken:
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Your streak is not broken. Keep it up!"
  }
}
```

Too many missed days:
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "You missed 3 days. Streak repair is only available for 1 missed day."
  }
}
```

Already repaired today:
```json
{
  "success": false,
  "error": {
    "code": "BAD_REQUEST",
    "message": "Streak repair not available"
  }
}
```

---

## 3. Taste Test Feature (Explanation Limits)

### Features
- Free users can view **3 explanations per day** in mock exam reviews
- After 3 views, explanations are blurred with lock overlay
- Premium users have unlimited access

### Database Schema

#### Table: `daily_explanation_views`
```sql
CREATE TABLE "daily_explanation_views" (
    "id" UUID PRIMARY KEY,
    "user_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "view_count" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP DEFAULT now(),
    "updated_at" TIMESTAMP,
    UNIQUE(user_id, date)
);
```

### API Endpoints

#### GET /api/analytics/explanation-limits

Get current explanation view limits.

**Request:**
```http
GET /api/analytics/explanation-limits
Authorization: Bearer <token>
```

**Free User Response:**
```json
{
  "success": true,
  "data": {
    "isPremium": false,
    "dailyLimit": 3,
    "viewedToday": 1,
    "remainingToday": 2
  },
  "message": "Explanation limits retrieved successfully"
}
```

**Premium User Response:**
```json
{
  "success": true,
  "data": {
    "isPremium": true,
    "dailyLimit": -1,
    "viewedToday": 0,
    "remainingToday": -1
  }
}
```

**Note**: `-1` indicates unlimited access

#### POST /api/analytics/explanation-view

Record an explanation view (increments counter).

**Request:**
```http
POST /api/analytics/explanation-view
Authorization: Bearer <token>
```

**Success Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "viewedToday": 2,
    "remainingToday": 1,
    "limitReached": false
  },
  "message": "Explanation view recorded"
}
```

**Limit Reached Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "viewedToday": 3,
    "remainingToday": 0,
    "limitReached": true
  }
}
```

**Error When Limit Exceeded:**
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Daily explanation limit reached. Free users can view up to 3 explanations per day in mock exam reviews. Upgrade to Season Pass for unlimited access."
  }
}
```

---

## 4. Frontend Integration

### Streak Repair Flow

```javascript
// 1. Check streak status on dashboard load
async function loadStreakStatus() {
  const response = await fetch('/api/analytics/streak', {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const { data } = await response.json();

  // Show repair prompt if available
  if (data.canRepair) {
    showStreakRepairModal({
      missedDays: data.missedDays,
      currentStreak: data.currentStreak,
      repairCost: data.repairCost
    });
  }

  // Display streak badge
  updateStreakBadge({
    current: data.currentStreak,
    longest: data.longestStreak
  });
}

// 2. Repair streak when user clicks "Repair"
async function repairStreak() {
  try {
    const response = await fetch('/api/analytics/streak/repair', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const result = await response.json();

    if (result.success) {
      showSuccess(result.data.message);
      // Refresh streak display
      await loadStreakStatus();
    }
  } catch (error) {
    showError(error.message);
  }
}
```

### Taste Test (Explanation Limits) Flow

```javascript
// 1. Check limits when showing mock exam review
async function loadMockExamReview(examId) {
  // Get exam results
  const exam = await fetchExamResults(examId);

  // Get explanation limits
  const limits = await fetch('/api/analytics/explanation-limits', {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(r => r.json());

  // Render questions with conditional explanation access
  exam.questions.forEach((question, index) => {
    renderQuestion(question, {
      canViewExplanation: limits.data.isPremium ||
                         index < limits.data.remainingToday,
      viewsRemaining: limits.data.remainingToday,
      isPremium: limits.data.isPremium
    });
  });
}

// 2. When user clicks "Show Explanation"
async function showExplanation(questionIndex) {
  // Check if can view
  const limits = await fetch('/api/analytics/explanation-limits', {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(r => r.json());

  if (!limits.data.isPremium && limits.data.remainingToday === 0) {
    // Show upgrade modal
    showUpgradeModal({
      title: 'Explanation Limit Reached',
      message: `You've viewed ${limits.data.dailyLimit} explanations today.`,
      upgradeText: 'Upgrade to Season Pass for unlimited explanations'
    });
    return;
  }

  // Record the view
  try {
    await fetch('/api/analytics/explanation-view', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    // Show the explanation
    revealExplanation(questionIndex);

    // Update remaining count display
    await loadExplanationLimits();

  } catch (error) {
    if (error.code === 'FORBIDDEN') {
      showUpgradeModal();
    }
  }
}

// 3. Display explanation with blur/lock for locked ones
function renderQuestion(question, options) {
  const explanationEl = document.querySelector(`#explanation-${question.id}`);

  if (options.canViewExplanation) {
    // Show unlocked explanation
    explanationEl.classList.remove('locked');
    explanationEl.innerHTML = question.explanation;
  } else {
    // Show blurred/locked explanation
    explanationEl.classList.add('locked');
    explanationEl.innerHTML = `
      <div class="blur-overlay">
        <div class="lock-icon">🔒</div>
        <p>Unlock explanations with Season Pass</p>
        <p class="small">${options.viewsRemaining} free views remaining today</p>
        <button onclick="showUpgradeModal()">Upgrade Now</button>
      </div>
    `;
  }
}
```

### Example UI Components

**Streak Repair Modal:**
```jsx
function StreakRepairModal({ missedDays, currentStreak, repairCost }) {
  return (
    <Modal>
      <div className="streak-repair-modal">
        <h2>🔥 Oops! Your streak is broken</h2>
        <p>You missed {missedDays} day and your {currentStreak}-day streak ended.</p>

        <div className="repair-offer">
          <p className="highlight">Good news! You can repair it!</p>
          <p>Cost: {repairCost} points</p>
        </div>

        <button onClick={repairStreak}>Repair My Streak</button>
        <button onClick={closeModal}>No Thanks</button>
      </div>
    </Modal>
  );
}
```

**Locked Explanation:**
```jsx
function LockedExplanation({ viewsRemaining }) {
  return (
    <div className="explanation locked">
      <div className="blur-content">
        This is the explanation text but it's blurred...
      </div>
      <div className="lock-overlay">
        <div className="lock-icon">🔒</div>
        <h3>Unlock Unlimited Explanations</h3>
        <p>Free: {viewsRemaining} explanations remaining today</p>
        <p>Premium: Unlimited explanations</p>
        <button>Upgrade to Season Pass</button>
      </div>
    </div>
  );
}
```

---

## 5. Testing

### Test Streak Tracking

```bash
# 1. Submit answers to start streak
curl -X POST http://localhost:3000/api/practice/submit \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"questionId": "...", "selectedOptionId": "a"}'

# 2. Check streak
curl http://localhost:3000/api/analytics/streak \
  -H "Authorization: Bearer $TOKEN"

# Expected: currentStreak: 1
```

### Test Streak Repair

```sql
-- Manually set last activity to 2 days ago
UPDATE user_streaks
SET last_activity_date = CURRENT_DATE - INTERVAL '2 days',
    current_streak = 5
WHERE user_id = 'YOUR_USER_ID';
```

```bash
# Check streak status (should show canRepair: true)
curl http://localhost:3000/api/analytics/streak \
  -H "Authorization: Bearer $TOKEN"

# Expected:
# canRepair: true
# missedDays: 1
# repairCost: 50

# Repair the streak
curl -X POST http://localhost:3000/api/analytics/streak/repair \
  -H "Authorization: Bearer $TOKEN"

# Expected: success: true
```

### Test Explanation Limits

```bash
# 1. Check limits (free user)
curl http://localhost:3000/api/analytics/explanation-limits \
  -H "Authorization: Bearer $TOKEN"

# Expected:
# isPremium: false
# dailyLimit: 3
# viewedToday: 0
# remainingToday: 3

# 2. Record first view
curl -X POST http://localhost:3000/api/analytics/explanation-view \
  -H "Authorization: Bearer $TOKEN"

# Expected: viewedToday: 1, remainingToday: 2

# 3. Record second view
curl -X POST http://localhost:3000/api/analytics/explanation-view \
  -H "Authorization: Bearer $TOKEN"

# Expected: viewedToday: 2, remainingToday: 1

# 4. Record third view
curl -X POST http://localhost:3000/api/analytics/explanation-view \
  -H "Authorization: Bearer $TOKEN"

# Expected: viewedToday: 3, remainingToday: 0, limitReached: true

# 5. Try fourth view (should fail)
curl -X POST http://localhost:3000/api/analytics/explanation-view \
  -H "Authorization: Bearer $TOKEN"

# Expected: 403 Forbidden
```

---

## 6. Configuration

### Streak Repair Cost
Located in `src/services/streak.service.ts`:
```typescript
const STREAK_REPAIR_COST = 50; // points or currency
const MAX_REPAIRABLE_DAYS = 1; // Can only repair up to 1 missed day
```

### Explanation Limit
Located in `src/services/explanationAccess.service.ts`:
```typescript
const FREE_EXPLANATION_LIMIT = 3; // Free users can view 3 explanations per day
```

---

## 7. Database Queries

### Check User Streaks
```sql
SELECT
  u.email,
  us.current_streak,
  us.longest_streak,
  us.last_activity_date,
  us.streak_repaired_at
FROM user_streaks us
JOIN users u ON u.id = us.user_id
ORDER BY us.current_streak DESC
LIMIT 20;
```

### Check Explanation Views Today
```sql
SELECT
  u.email,
  dev.date,
  dev.view_count
FROM daily_explanation_views dev
JOIN users u ON u.id = dev.user_id
WHERE dev.date = CURRENT_DATE
ORDER BY dev.view_count DESC;
```

### Find Broken Streaks (Repair Opportunities)
```sql
SELECT
  u.email,
  us.current_streak,
  us.last_activity_date,
  CURRENT_DATE - us.last_activity_date::date as days_since_activity
FROM user_streaks us
JOIN users u ON u.id = us.user_id
WHERE us.last_activity_date IS NOT NULL
  AND CURRENT_DATE - us.last_activity_date::date = 2
  AND (us.streak_repaired_at IS NULL
       OR us.streak_repaired_at::date < CURRENT_DATE)
ORDER BY us.current_streak DESC;
```

---

## 8. Files Created/Modified

### New Files:
- `prisma/migrations/20260131152749_add_streak_and_explanation_tracking/` - Database migration
- `src/repositories/streak.repository.ts` - Streak data access
- `src/repositories/explanationView.repository.ts` - Explanation view tracking
- `src/services/streak.service.ts` - Streak business logic
- `src/services/explanationAccess.service.ts` - Taste test logic
- `STREAK_AND_TASTE_TEST_GUIDE.md` - This documentation

### Modified Files:
- `prisma/schema.prisma` - Added UserStreak and DailyExplanationView models
- `src/controllers/analytics.controller.ts` - Added new endpoints
- `src/routes/analytics.routes.ts` - Added new routes
- `src/services/practice.service.ts` - Auto-update streak on answer submission

---

## 9. Premium vs Free Comparison

| Feature | Free User | Premium User |
|---------|-----------|--------------|
| Streak Tracking | ✅ Yes | ✅ Yes |
| Streak Repair | ⚡ 50 points/cost | ⚡ 50 points/cost |
| Explanation Views/Day | 📊 3 per day | ♾️ Unlimited |
| Mock Exams/Month | 📊 3 per month | ♾️ Unlimited |
| Mock Exam Questions | 📊 20 max | 📊 170 max |
| Practice Questions/Day | 📊 15 per day | ♾️ Unlimited |

---

## 10. Future Enhancements

- [ ] Points/currency system for streak repairs
- [ ] Streak freeze feature (preserve streak for 1 day)
- [ ] Streak leaderboard
- [ ] Achievement badges for milestones
- [ ] Weekly/monthly streak reports
- [ ] Social sharing of streak achievements
- [ ] Explanation preview (first 2 lines visible before lock)
- [ ] Analytics on explanation engagement
