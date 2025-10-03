# Validation Schema Fixes - October 3, 2025

## Issues Identified and Fixed

### 1. **tenantId Validation Issue**
**Problem:** Create schemas were requiring `tenantId` in request payloads, but this should be automatically added by the API from the authenticated user's context.

**Affected Schemas:**
- ✅ `CreateAccountSchema`
- ✅ `CreateCategorySchema`
- ✅ `CreateTransactionSchema`
- ✅ `CreateBudgetSchema`
- ✅ `CreateBillReminderSchema`
- ✅ `CreateRecurringTransactionSchema`
- ✅ `CreateGoalSchema`

**Fix:** Updated all Create schemas to omit `tenantId`:
```typescript
export const CreateCategorySchema = CategorySchema.omit({
  id: true,
  tenantId: true,  // ← Added this
  createdAt: true,
  updatedAt: true,
});
```

### 2. **Date Validation Issue**
**Problem:** Schemas were using `z.date()` which expects Date objects, but frontend sends dates as strings or timestamps (JSON doesn't support Date objects).

**Affected Schemas:**
- ✅ `TransactionSchema` - `date` field
- ✅ `BudgetSchema` - `startDate`, `endDate` fields
- ✅ `BillReminderSchema` - `dueDate` field
- ✅ `RecurringTransactionSchema` - `startDate`, `nextDate`, `endDate` fields
- ✅ `GoalSchema` - `deadline` field
- ✅ `GoalContributionSchema` - `date` field

**Fix:** Updated all user-provided date fields to use `z.coerce.date()`:
```typescript
// Before
dueDate: z.date(),

// After
dueDate: z.coerce.date(),  // ← Automatically converts strings/numbers to Date
```

**Note:** `createdAt` and `updatedAt` fields remain as `z.date()` since they're generated server-side, not sent from frontend.

## Deployment

**API Version:** `ecf594d0-6a7f-4864-8593-a8eb4bfed8de`  
**Deployed:** October 3, 2025  
**URL:** https://finhome-api.samuel-1e5.workers.dev

## Testing Checklist

All endpoints should now accept dates as:
- ISO strings: `"2025-10-01T00:00:00.000Z"`
- Date strings: `"2025-10-01"`
- Unix timestamps: `1727740800000`

### Endpoints to Test:
- ✅ POST `/api/categories` - Create category
- ⏳ POST `/api/transactions` - Create transaction
- ⏳ POST `/api/budgets` - Create budget
- ⏳ POST `/api/bill-reminders` - Create bill reminder
- ⏳ POST `/api/recurring-transactions` - Create recurring transaction
- ⏳ POST `/api/goals` - Create goal
- ⏳ POST `/api/goals/:id/contributions` - Add goal contribution
- ⏳ POST `/api/accounts` - Create account

## Summary

**Total Schemas Fixed:** 13
- 7 Create schemas (tenantId issue)
- 6 Entity schemas (date validation issue)

**Impact:** All validation errors related to "Invalid request data" for these operations should now be resolved.
