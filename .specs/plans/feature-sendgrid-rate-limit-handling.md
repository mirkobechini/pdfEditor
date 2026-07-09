# Feature Plan: SendGrid Rate Limit Handling

**Status:** Planning  
**Priority:** Medium  
**Complexity:** Medium  
**Estimated Time:** 1 day

---

## Objective

Rilevare quando SendGrid ha raggiunto il limite mensile di email (es. 100 email/mese per free tier), disabilitare il bottone "Forgot Password" e mostrare all'utente un messaggio informativo con suggerimento di riprovare il mese successivo.

---

## Current Behavior

- Backend chiama `EmailService.send_password_reset_email()`
- Se SendGrid raggiunge limite → SMTP error
- Utente vede errore generico ("Failed")

---

## Desired Behavior

1. **Monitor email quota**: Tracciare email inviate durante il mese corrente
2. **Detect limit reached**: Rilevare quando SMTP respinge con "rate limit" error
3. **Disable UI**: Disabilitare "Send Reset Email" button con tooltip
4. **Show alert**: Mostrare toast/banner con messaggio friendly
5. **Graceful recovery**: Permettere reinvio il mese successivo

---

## Implementation

### Backend Strategy

#### Option A: Track Email Count (Simple)

```python
# backend/app/models/user.py (or new EmailQuota model)

class EmailQuota(Base):
    __tablename__ = "email_quotas"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("user.id"))
    month: Mapped[str] = mapped_column(String(7))  # "2024-12"
    emails_sent: Mapped[int] = mapped_column(default=0)
    limit: Mapped[int] = mapped_column(default=100)  # Or read from config
    created_at: Mapped[datetime]
    updated_at: Mapped[datetime]
```

#### Option B: Catch SendGrid Error (Immediate)

```python
# backend/app/services/email_service.py

class EmailService:
    SENDGRID_RATE_LIMIT_ERROR = 429  # Too Many Requests

    @staticmethod
    def send_password_reset_email(email: str, reset_token: str) -> dict:
        """
        Send password reset email.

        Returns: {"success": bool, "error": str | None}
        """
        try:
            # SMTP send logic
            server = smtplib.SMTP(settings.SMTP_SERVER, settings.SMTP_PORT)
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(message)
            server.quit()

            return {"success": True}

        except smtplib.SMTPException as e:
            error_msg = str(e)

            # Check for SendGrid rate limit (452: too many emails)
            if "452" in error_msg or "rate limit" in error_msg.lower():
                return {
                    "success": False,
                    "error": "rate_limit_exceeded",
                    "message": "Monthly email limit reached. Try again next month."
                }

            # Other SMTP errors
            return {
                "success": False,
                "error": "email_service_unavailable",
                "message": "Email service temporarily unavailable."
            }
```

#### Option C: Call SendGrid API Directly (Most Reliable)

```python
# backend/app/services/email_service.py

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

class EmailService:
    def __init__(self):
        self.sg = SendGridAPIClient(settings.SENDGRID_API_KEY)

    @staticmethod
    def send_password_reset_email(email: str, reset_token: str) -> dict:
        """Send via SendGrid API with error handling."""
        try:
            message = Mail(
                from_email=(settings.SMTP_FROM_EMAIL, "PdfEditor"),
                to_emails=email,
                subject="Reset Your Password",
                html_content=render_html_template(...),
                plain_text_content=render_text_template(...),
            )

            response = EmailService.sg.send(message)

            if response.status_code == 202:
                return {"success": True}
            else:
                return {
                    "success": False,
                    "error": "send_failed",
                    "message": f"Failed to send email (code {response.status_code})"
                }

        except Exception as e:
            if "429" in str(e) or "rate" in str(e).lower():
                return {
                    "success": False,
                    "error": "rate_limit_exceeded",
                    "message": "Monthly email limit reached."
                }

            return {
                "success": False,
                "error": "email_service_error",
                "message": "Email service error"
            }
```

### Endpoint Response

#### Update `POST /auth/forgot-password`

```python
# backend/app/api/v1/auth.py

@router.post("/auth/forgot-password", status_code=status.HTTP_202_ACCEPTED)
def forgot_password(
    req: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Request password reset email.

    Returns 202 Accepted with info about delivery attempt.
    Never reveals if user exists (security).
    """
    service = AuthService(db)

    # Silently ignore if user not found (anti-enumeration)
    user = service.repo.get_by_email(req.email)
    if not user:
        return {"message": "If user exists, email will be sent"}

    # Generate reset token
    from datetime import datetime, timedelta, timezone
    import secrets

    token = secrets.token_urlsafe(48)
    user.reset_token = token
    user.reset_token_expires = datetime.now(timezone.utc) + timedelta(
        minutes=settings.RESET_TOKEN_EXPIRE_MINUTES
    )
    service.repo.update(user)

    # Send email
    email_result = EmailService.send_password_reset_email(user.email, token)

    # Check if rate limit exceeded
    if not email_result["success"]:
        if email_result["error"] == "rate_limit_exceeded":
            # Return 429 with client info
            raise HTTPException(
                status_code=429,
                detail="Monthly email limit reached. Please try again next month.",
                headers={"X-RateLimit-Reason": "sendgrid_limit"},
            )
        else:
            # Log but still return 202 (email will be retried)
            logger.warning(f"Email send failed: {email_result['error']}")

    return {
        "message": "If user exists, password reset email will be sent",
        "email_status": email_result.get("success", False),
    }
```

### Frontend Strategy

#### 1. Detect Rate Limit Error

```tsx
// frontend/src/app/forgot-password/page.tsx

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  setError(null);

  try {
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (response.status === 429) {
      // Rate limit hit
      setError({
        type: "rate_limit",
        message: t("forgotPassword.rateLimitExceeded"),
      });
      return;
    }

    if (!response.ok) {
      throw new Error("Request failed");
    }

    setSentMessage(t("forgotPassword.resetSent"));
  } catch (err) {
    setError({
      type: "generic",
      message: t("forgotPassword.error"),
    });
  } finally {
    setLoading(false);
  }
};
```

#### 2. Disable Email Button During Rate Limit

```tsx
// frontend/src/app/forgot-password/page.tsx

<button
  type="submit"
  disabled={loading || error?.type === "rate_limit"}
  className={`
    px-4 py-2 rounded font-medium
    ${
      error?.type === "rate_limit"
        ? "bg-gray-400 cursor-not-allowed text-gray-600"
        : "bg-blue-500 hover:bg-blue-600 text-white"
    }
  `}
  title={
    error?.type === "rate_limit" ? t("forgotPassword.rateLimitTooltip") : ""
  }
>
  {loading ? t("forgotPassword.sending") : t("forgotPassword.sendButton")}
</button>
```

#### 3. Show Alert Component

```tsx
// frontend/src/app/components/RateLimitAlert.tsx

interface RateLimitAlertProps {
  error: string | null;
  onDismiss: () => void;
}

export function RateLimitAlert({ error, onDismiss }: RateLimitAlertProps) {
  if (!error) return null;

  return (
    <div className="bg-amber-100 border-l-4 border-amber-500 p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertTriangleIcon className="text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-amber-900">
            {t("forgotPassword.rateLimitTitle")}
          </h3>
          <p className="text-sm text-amber-800 mt-1">{error}</p>
          <p className="text-xs text-amber-700 mt-2">
            {t("forgotPassword.rateLimitHint")}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-amber-600 hover:text-amber-900"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
```

#### 4. Translation Keys

```json
// frontend/messages/en.json
{
  "forgotPassword": {
    "rateLimitExceeded": "Email limit reached this month",
    "rateLimitTitle": "Monthly Email Limit Reached",
    "rateLimitHint": "You've reached the maximum number of password reset emails this month. Please try again next month.",
    "rateLimitTooltip": "Monthly email limit reached. Please try again next month.",
    "sending": "Sending...",
    "sendButton": "Send Reset Link",
    "resetSent": "Reset link sent! Check your email.",
    "error": "Failed to send reset link"
  }
}

// frontend/messages/it.json
{
  "forgotPassword": {
    "rateLimitExceeded": "Limite email raggiunto questo mese",
    "rateLimitTitle": "Limite Email Mensile Raggiunto",
    "rateLimitHint": "Hai raggiunto il numero massimo di email di reset password questo mese. Riprova il mese prossimo.",
    "rateLimitTooltip": "Limite email mensile raggiunto. Riprova il mese prossimo.",
    "sending": "Invio in corso...",
    "sendButton": "Invia Link di Reset",
    "resetSent": "Link inviato! Controlla la tua email.",
    "error": "Errore nell'invio del link"
  }
}
```

---

## Alternative Approaches

### Approach 1: Proactive Quota Check

Store `emails_sent_this_month` in database and check before sending:

```python
def get_remaining_quota(user_id: str) -> int:
    current_month = datetime.now().strftime("%Y-%m")
    quota = db.query(EmailQuota).filter_by(
        user_id=user_id,
        month=current_month
    ).first()

    if not quota:
        # Create new quota for this month
        quota = EmailQuota(user_id=user_id, month=current_month, limit=100)
        db.add(quota)
        db.commit()

    return max(0, quota.limit - quota.emails_sent)

# In forgot-password endpoint:
remaining = get_remaining_quota(current_user.id)
if remaining <= 0:
    raise HTTPException(status_code=429, detail="Rate limit exceeded")
```

**Pros**: Fast, no SendGrid calls  
**Cons**: Requires DB maintenance, quota reset logic

### Approach 2: SendGrid Webhook

Setup webhook to receive rate limit notifications from SendGrid and update DB.

**Pros**: Real-time  
**Cons**: Complex setup, requires stable webhook endpoint

### Recommendation

**Hybrid approach (Recommended)**:

1. Use **Option C** (SendGrid API catch) for immediate feedback
2. Optionally add proactive quota check for better UX
3. Display clear message to users when limit is reached

---

## Testing

```python
# backend/tests/test_rate_limiting.py

@patch("app.services.email_service.EmailService.send_password_reset_email")
def test_rate_limit_error_returned(mock_send, db, user):
    """When email service hits rate limit, return 429."""
    mock_send.return_value = {
        "success": False,
        "error": "rate_limit_exceeded"
    }

    response = client.post(
        "/auth/forgot-password",
        json={"email": user.email}
    )

    assert response.status_code == 429
    assert "Monthly email limit" in response.json()["detail"]

def test_rate_limit_dialog_shown_frontend(db, user):
    """Rate limit alert appears in forgot-password page."""
    # Mock API response with 429
    server.setResponse("/auth/forgot-password", 429, {
        "detail": "Monthly email limit reached"
    })

    render(<ForgotPasswordPage />)
    fireEvent.change(screen.getByLabelText(/email/i), {
        target: { value: user.email }
    })
    fireEvent.click(screen.getByText(/send/i))

    await waitFor(() => {
        expect(screen.getByText(/monthly email limit/i)).toBeInTheDocument();
    });
```

---

## Monitoring & Analytics

Log rate limit events for monitoring:

```python
# In email_service.py
if result["error"] == "rate_limit_exceeded":
    logger.warning(
        "SendGrid rate limit exceeded",
        extra={
            "user_id": user_id,
            "month": datetime.now().strftime("%Y-%m"),
            "service": "sendgrid",
        }
    )
```

---

## Future Enhancements

- [ ] Daily/hourly email quota option
- [ ] Admin dashboard to view email quotas
- [ ] Email queue for retry after quota resets
- [ ] Upgrade path messaging ("Upgrade to remove limits")
- [ ] SendGrid subaccount for dedicated IPs/limits

---

## References

- SendGrid limits: https://docs.sendgrid.com/for-developers/sending-email/rate-limits
- SMTP error codes: https://www.ionos.com/en/hosting/smtp-error-codes
