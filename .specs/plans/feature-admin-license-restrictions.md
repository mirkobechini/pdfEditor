# Feature Plan: Admin License Assignment Restrictions

**Status:** ✅ Completata (2026-07-10, PR #196)  
**Priority:** HIGH (Security/Business Logic)  
**Severity:** Medium (Data integrity)  
**Complexity:** Low  
**Estimated Time:** 2-3 hours

---

## Problem Statement

Attualmente, il superadmin può modificare il `license_tier` di qualsiasi utente senza limitazioni. Questo crea un rischio:

1. **Utente paga per "pro" via Stripe** → Abbonamento attivo
2. **Superadmin modifica tier a "free"** per errore (o malinteso)
3. **Utente perde accesso a feature pagate** → Problema legale/ricorso

---

## Business Rule

**Il superadmin può:**

- Assegnare o rimuovere il tier **"lifetime"** (enterprise, concesso manualmente dal superadmin)
- Non può modificare tier "pro" o "premium" (pagati via Stripe)

**Logica:**

- `license_tier = "lifetime"` → Superadmin-only, sempre modificabile
- `license_tier = "pro"` o `"premium"` → Read-only per admin, modificabile solo via Stripe webhook
- `license_tier = "free"` → Superadmin può riportare a "free", ma solo se era "lifetime"

---

## Backend Changes

### 1. Add Payment Source Column to User Model

```python
# backend/app/models/user.py
class User(Base):
    __tablename__ = "users"

    # ... existing fields ...

    license_tier = Column(String(20), default="free", nullable=False)
    license_tier_source = Column(
        String(20),
        default="admin",
        nullable=False,
        comment="admin=assigned by superadmin, stripe=paid via Stripe, free=default"
    )
    # Values: "admin", "stripe", "free"
```

**Migration:**

```python
# backend/alembic/versions/xxx_add_license_tier_source.py
def upgrade():
    op.add_column('users', sa.Column('license_tier_source', sa.String(20), nullable=False, server_default='admin'))

def downgrade():
    op.drop_column('users', 'license_tier_source')
```

### 2. Update Admin License Endpoint

```python
# backend/app/api/v1/admin.py
@router.put("/users/{user_id}/license", response_model=UserResponse)
def update_user_license(
    user_id: str,
    req: UpdateUserLicenseRequest,  # { license_tier: "lifetime" | "free" }
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update user license tier. Restrictions:
    - Only superadmin can call this
    - Can only modify if license_tier_source == "admin"
    - Cannot modify Stripe-paid tiers ("pro", "premium")
    """

    # Check if current_user is superadmin
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only admins can modify licenses")

    # Fetch target user
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent modifying Stripe-paid tiers
    if target_user.license_tier_source == "stripe":
        raise HTTPException(
            status_code=403,
            detail=f"Cannot modify Stripe-paid license tier '{target_user.license_tier}'. "
                   "User must cancel Stripe subscription first."
        )

    # Allow only "lifetime" or "free" when source is "admin"
    if req.license_tier not in ["lifetime", "free"]:
        raise HTTPException(
            status_code=400,
            detail="Admin can only assign 'lifetime' or 'free' tiers"
        )

    # Update
    target_user.license_tier = req.license_tier
    target_user.license_tier_source = "admin"
    db.add(target_user)
    db.commit()
    db.refresh(target_user)

    return UserResponse.model_validate(target_user)
```

### 3. Stripe Webhook Handler

When Stripe webhook received (`charge.succeeded`, `customer.subscription.updated`):

```python
# backend/app/services/stripe_service.py (future)
def handle_stripe_subscription_update(event: dict, db: Session):
    """
    Update user license_tier when Stripe subscription changes.
    """
    customer_id = event['data']['object']['customer']
    subscription_status = event['data']['object']['status']

    # Map Stripe customer to User via Stripe customer ID
    user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
    if not user:
        return

    if subscription_status == "active":
        user.license_tier = "pro"  # or "premium" based on plan
        user.license_tier_source = "stripe"
    elif subscription_status == "canceled" or "past_due":
        user.license_tier = "free"
        user.license_tier_source = "free"

    db.add(user)
    db.commit()
```

### 4. Update UserResponse Schema

```python
# backend/app/schemas/auth.py
class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    license_tier: str
    license_tier_source: str  # NEW
    is_active: bool
    is_admin: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
```

### 5. Request Schema

```python
class UpdateUserLicenseRequest(BaseModel):
    license_tier: Literal["lifetime", "free"] = Field(
        ...,
        description="Only 'lifetime' (enterprise) or 'free' allowed for admin assignment"
    )
```

---

## Frontend Changes

### 1. Admin Dashboard License Editor

```tsx
// frontend/src/app/admin/users/UserLicenseEditor.tsx
export function UserLicenseEditor({ user }: { user: User }) {
  const [tier, setTier] = React.useState(user.license_tier);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isModifiable = user.license_tier_source === "admin";

  const handleSave = async () => {
    if (!isModifiable) {
      setError(`Cannot modify ${user.license_tier_source}-paid tier`);
      return;
    }

    setLoading(true);
    try {
      await api.put(`/admin/users/${user.id}/license`, { license_tier: tier });
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to update license");
      setTier(user.license_tier); // Revert
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">License Tier</label>

      {/* Show source badge */}
      <div className="text-xs text-gray-500">
        Source: <span className="font-bold">{user.license_tier_source}</span>
      </div>

      {/* Disable if Stripe-paid */}
      <select
        value={tier}
        onChange={(e) => setTier(e.target.value)}
        disabled={!isModifiable || loading}
        className={`w-full px-3 py-2 border rounded ${
          isModifiable
            ? "bg-white dark:bg-gray-700"
            : "bg-gray-100 dark:bg-gray-800 opacity-60 cursor-not-allowed"
        }`}
      >
        <option value="free">Free</option>
        <option value="lifetime">Lifetime (Enterprise)</option>
        {/* Pro/Premium disabled if source=stripe */}
      </select>

      {/* Show restriction message */}
      {!isModifiable && (
        <p className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
          ⚠️ Cannot modify Stripe-paid tier. User must cancel subscription
          first.
        </p>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}

      <button
        onClick={handleSave}
        disabled={!isModifiable || loading || tier === user.license_tier}
        className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save"}
      </button>
    </div>
  );
}
```

---

## Database Migration

```sql
-- Add column to track license source
ALTER TABLE users ADD COLUMN license_tier_source VARCHAR(20) DEFAULT 'admin' NOT NULL;

-- Backfill existing data (assume all current assignments are admin-driven)
UPDATE users SET license_tier_source = 'admin' WHERE license_tier_source IS NULL;

-- Index for faster queries
CREATE INDEX idx_users_license_tier_source ON users(license_tier_source);
```

---

## Test Plan

### Backend Tests

```python
# backend/tests/test_admin_license.py
def test_admin_cannot_modify_stripe_paid_tier(db, admin_user, regular_user):
    """Verify admin cannot modify Stripe-paid tier."""
    # Setup: user has Stripe subscription
    regular_user.license_tier = "pro"
    regular_user.license_tier_source = "stripe"
    db.add(regular_user)
    db.commit()

    # Try to change tier
    response = client.put(
        f"/admin/users/{regular_user.id}/license",
        json={"license_tier": "free"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    # Should fail
    assert response.status_code == 403
    assert "Cannot modify Stripe-paid" in response.json()["detail"]

def test_admin_can_modify_admin_tier(db, admin_user, regular_user):
    """Verify admin can modify admin-assigned tiers."""
    # Setup: user has admin-assigned tier
    regular_user.license_tier = "free"
    regular_user.license_tier_source = "admin"
    db.add(regular_user)
    db.commit()

    # Change to lifetime
    response = client.put(
        f"/admin/users/{regular_user.id}/license",
        json={"license_tier": "lifetime"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    # Should succeed
    assert response.status_code == 200
    assert response.json()["license_tier"] == "lifetime"

def test_admin_cannot_assign_pro_tier(db, admin_user, regular_user):
    """Verify admin can only assign lifetime/free, not pro."""
    response = client.put(
        f"/admin/users/{regular_user.id}/license",
        json={"license_tier": "pro"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )

    # Should fail
    assert response.status_code == 400
    assert "only 'lifetime' or 'free'" in response.json()["detail"]
```

### Frontend Tests

```typescript
// frontend/src/app/admin/users/UserLicenseEditor.test.tsx
test("should disable tier selector for Stripe-paid users", () => {
  const stripeUser = { ...mockUser, license_tier: "pro", license_tier_source: "stripe" };
  render(<UserLicenseEditor user={stripeUser} />);

  const select = screen.getByRole("combobox");
  expect(select).toBeDisabled();
  expect(screen.getByText(/Cannot modify Stripe-paid/i)).toBeInTheDocument();
});

test("should allow tier changes for admin-assigned users", async () => {
  const adminUser = { ...mockUser, license_tier_source: "admin" };
  render(<UserLicenseEditor user={adminUser} />);

  const select = screen.getByRole("combobox");
  expect(select).not.toBeDisabled();
});
```

---

## Acceptance Criteria

- [ ] User model has `license_tier_source` column
- [ ] Migration creates column and backfills data
- [ ] Admin cannot modify Stripe-paid tiers (returns 403)
- [ ] Admin can only assign "lifetime" or "free" to admin-source tiers
- [ ] Frontend disables license editor for Stripe-paid users
- [ ] All tests pass (backend + frontend)
- [ ] Stripe webhook updates `license_tier_source` to "stripe" when subscription active

---

## Files to Modify

**Backend:**

- `backend/app/models/user.py` — Add `license_tier_source` column
- `backend/alembic/versions/` — Create migration
- `backend/app/api/v1/admin.py` — Update PUT `/admin/users/{id}/license` endpoint
- `backend/app/schemas/auth.py` — Add `license_tier_source` to UserResponse
- `backend/tests/test_admin_license.py` — Create tests (NEW)

**Frontend:**

- `frontend/src/app/admin/users/UserLicenseEditor.tsx` — Add restrictions
- `frontend/src/app/admin/users/UserLicenseEditor.test.tsx` — Create tests (NEW)

---

## Definition of Done

- ✅ Column added + migration applied
- ✅ Backend endpoint returns 403 for Stripe-paid tiers
- ✅ Frontend shows "Cannot modify" message for Stripe-paid
- ✅ All tests pass
- ✅ PR reviewed and merged
- ✅ ADR and this plan updated with completion status
