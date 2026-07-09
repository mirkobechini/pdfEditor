# Feature Plan: Admin Send Reset Password Email

**Status:** Planning  
**Priority:** Medium  
**Complexity:** Medium  
**Estimated Time:** 1 day

---

## Objective

Permettere agli admin di inviare manualmente un link reset password a un utente dalla dashboard admin, senza che l'utente debba cliccare "Forgot Password".

**Caso d'uso**: Admin vuole aiutare un utente che ha dimenticato la password senza aspettare che lui faccia richiesta manualmente.

---

## Backend Changes

### 1. New Endpoint: `POST /admin/users/{user_id}/send-reset-email`

```python
# backend/app/api/v1/admin.py

@router.post("/users/{user_id}/send-reset-email", status_code=status.HTTP_202_ACCEPTED)
def send_reset_password_email(
    user_id: str,
    current_user: User = Depends(verify_admin),
    db: Session = Depends(get_db),
):
    """Admin endpoint: Generate reset token and send email to user."""
    user_repo = UserRepository(db)
    target_user = user_repo.get_by_id(user_id)

    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Generate reset token
    import secrets
    from datetime import datetime, timedelta, timezone

    token = secrets.token_urlsafe(48)
    target_user.reset_token = token
    target_user.reset_token_expires = datetime.now(timezone.utc) + timedelta(
        minutes=settings.RESET_TOKEN_EXPIRE_MINUTES
    )
    user_repo.update(target_user)

    # Send email
    from app.services.email_service import EmailService
    EmailService.send_password_reset_email(target_user.email, token)

    return {
        "message": f"Reset password email sent to {target_user.email}",
        "user_id": user_id,
    }
```

### 2. Validation & Authorization

Ensure endpoint:

- ✅ Requires admin role (`verify_admin` dependency)
- ✅ Can't send reset for super admin (if policy)
- ✅ Returns 404 if user not found
- ✅ Returns 202 (accepted) not 200

---

## Frontend Changes

### 1. Update Admin Users Table

In `frontend/src/app/admin/page.tsx`, aggiungi pulsante "Send Reset Email" per ogni utente:

```tsx
// In users table actions column
<button
  onClick={() => handleSendResetEmail(user.id)}
  className="text-sm text-blue-500 hover:underline ml-2"
  disabled={user.is_admin} // Impedisci per admin (optional)
>
  📧 {t("admin.sendResetEmail")}
</button>
```

### 2. API Client Method

```typescript
// frontend/src/app/lib/api.ts
export const api = {
  // ... existing methods

  admin: {
    sendResetPasswordEmail: async (userId: string) => {
      const response = await fetch(
        `${BASE_URL}/admin/users/${userId}/send-reset-email`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${await getToken()}` },
        },
      );
      return handleResponse(response);
    },
  },
};
```

### 3. Handler Function

```tsx
const handleSendResetEmail = async (userId: string) => {
  if (
    !confirm(
      t("admin.confirmSendResetEmail") ||
        "Send reset password email to this user?",
    )
  ) {
    return;
  }

  try {
    await api.admin.sendResetPasswordEmail(userId);
    alert(t("admin.resetEmailSent") || "Email sent!");
  } catch (err) {
    alert(t("admin.resetEmailFailed") || "Failed to send email");
  }
};
```

### 4. Translation Keys

```json
// frontend/messages/en.json
{
  "admin": {
    "sendResetEmail": "Send Reset Email",
    "confirmSendResetEmail": "Send password reset email to this user?",
    "resetEmailSent": "Reset password email sent successfully!",
    "resetEmailFailed": "Failed to send reset password email"
  }
}

// frontend/messages/it.json
{
  "admin": {
    "sendResetEmail": "Invia Email Reset",
    "confirmSendResetEmail": "Inviare email reset password a questo utente?",
    "resetEmailSent": "Email reset password inviata con successo!",
    "resetEmailFailed": "Errore nell'invio dell'email reset"
  }
}
```

---

## Testing

### Backend Tests

```python
# backend/tests/test_admin.py

def test_admin_send_reset_email_success(db, admin_user, regular_user):
    """Admin can send reset email to regular user."""
    response = client.post(
        f"/admin/users/{regular_user.id}/send-reset-email",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 202

    # Verify token was generated
    db.refresh(regular_user)
    assert regular_user.reset_token is not None
    assert regular_user.reset_token_expires is not None

def test_non_admin_cannot_send_reset_email(db, regular_user):
    """Non-admin user cannot send reset emails."""
    response = client.post(
        f"/admin/users/{regular_user.id}/send-reset-email",
        headers={"Authorization": f"Bearer {regular_token}"},
    )

    assert response.status_code in [401, 403]

def test_send_reset_email_user_not_found(db, admin_user):
    """Sending email to non-existent user returns 404."""
    response = client.post(
        "/admin/users/nonexistent-id/send-reset-email",
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    assert response.status_code == 404
```

### Frontend Tests

```tsx
// frontend/src/app/admin/__tests__/send-reset-email.test.tsx

it("opens confirmation dialog before sending email", async () => {
  const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);

  render(<AdminUsersTable users={[mockUser]} />);
  fireEvent.click(screen.getByText(/send reset email/i));

  expect(confirmSpy).toHaveBeenCalled();
});

it("sends email after confirmation", async () => {
  jest.spyOn(window, "confirm").mockReturnValue(true);

  render(<AdminUsersTable users={[mockUser]} />);
  fireEvent.click(screen.getByText(/send reset email/i));

  await waitFor(() => {
    expect(screen.getByText(/email sent/i)).toBeInTheDocument();
  });
});
```

---

## Implementation Steps

### Phase 1: Backend (0.5 day)

- [ ] Create endpoint `POST /admin/users/{user_id}/send-reset-email`
- [ ] Verify admin authorization
- [ ] Generate reset token + expiry
- [ ] Call EmailService
- [ ] Write backend tests

### Phase 2: Frontend (0.5 day)

- [ ] Add button to admin users table
- [ ] Implement confirmation dialog
- [ ] Add API client method
- [ ] Add translation keys
- [ ] Write frontend tests

### Phase 3: QA (optional)

- [ ] E2E test: admin sends email → user receives link → can reset password
- [ ] Test with SendGrid (once sender identity verified)

---

## Security Considerations

1. **Admin-only**: Only users with `is_admin=True` can access
2. **Rate limiting**: Limit requests per admin to prevent spam
3. **Audit logging**: (Future) Log who sent which emails
4. **Token expiry**: Same expiry as user-initiated forgot-password (default 30 min)

---

## Rollback

Simple: Remove the endpoint and button. No DB changes needed.

---

## Future Enhancements

- [ ] Batch send reset emails to multiple users
- [ ] Schedule email sending (send later)
- [ ] Email template customization
- [ ] Audit log viewing
