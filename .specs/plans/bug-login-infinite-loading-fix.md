# Bug Fix Plan: Login Infinite Loading

**Status:** Planning  
**Priority:** ALTA (Blocker)  
**Severity:** Critical (UX)  
**Complexity:** Medium  
**Estimated Time:** 2-4 hours

---

## Problem Statement

Quando l'utente naviga alla pagina `/login` o `/register`, la schermata sembra "carichi indefinitamente". Lo spinner continua a girare anche dopo che:

- L'API ha già risposto
- L'user dovrebbe essere autenticato
- Il token JWT è stato salvato in localStorage

**Workaround attuale:** Se l'utente clicca su un bottone aggiuntivo (es. link "Torna alla landing page" → `/landing` → clicca "Accedi all'app"), allora il caricamento si sblocca e entra correttamente.

**Impatto:**

- Utenti non capiscono se il login è riuscito
- UX confusa: non sanno se riprovare
- Potenziale aumento degli abbandoni al sign-up

---

## Root Cause Analysis

Probabili cause (da verificare):

1. **State di loading non si riporta a `false`** — Il flag `isLoading` rimane `true` anche dopo ricevere la risposta API
   - Causa: `finally` block non eseguito, oppure race condition negli state updates
   - Locate: `frontend/src/app/login/page.tsx` e `frontend/src/app/register/page.tsx`

2. **Race condition tra autenticazione e redirect** — Il redirect a `/app` avviene prima che React finisca di aggiornare lo state
   - Locate: `AuthContext` + logic di autenticazione
   - Sintomo: loading spinner visibile fino al full page load

3. **Timeout non configurato** — Se l'API è lenta, il timeout scade ma non triggera error state
   - Locate: `frontend/src/app/lib/api.ts`

4. **useEffect dependency issue** — Effetto ricreato in loop, causando re-render infiniti
   - Locate: Hook dependencies in login/register components

5. **Token save in localStorage interrompe il flow** — localStorage.setItem() non triggera il completamento dello state
   - Locate: Token handling in `AuthContext` o API client

---

## Debugging Steps

Prima di implementare, eseguire:

1. **Apri DevTools (F12)**
   - Tab "Network": verifica che la richiesta `POST /auth/login` o `POST /auth/register` completa con 200/201
   - Tab "Application" → LocalStorage: controlla se il token JWT è salvato

2. **Console logs**
   - Aggiungi `console.log('setLoading(false)')` dopo ogni endpoint call
   - Verifica se questi log appaiono

3. **React DevTools Profiler**
   - Registra il render durante il login
   - Cerca re-render infiniti o state updates infiniti

4. **Trace dell'AuthContext**
   - Verifica che `setUser()` e `setIsLoading()` vengono chiamati nell'ordine giusto

---

## Solution Plan

### Frontend Changes

#### 1. Fix Login Component

**File:** `frontend/src/app/login/page.tsx`

```tsx
// Pseudocode — da adattare al codice esistente

const handleLogin = async () => {
  setLoading(true);
  setError(null);

  try {
    const response = await api.post("/auth/login", {
      email,
      password,
    });

    // Step 1: Save token FIRST
    localStorage.setItem("token", response.access_token);

    // Step 2: Update auth context immediately
    setUser(response.user);

    // Step 3: Only THEN redirect (after state is updated)
    setLoading(false); // <-- CRITICAL: must be before redirect

    // Small delay per garantire che React finisca render
    setTimeout(() => {
      window.location.href = "/app";
    }, 100);
  } catch (err) {
    console.error("Login error:", err);
    setError(err.message);
    setLoading(false); // <-- CRITICAL: also in catch
  }
};
```

**Key fixes:**

- Aggiungi `finally` block esplicito per garantire `setLoading(false)`
- Delay di 100ms prima del redirect per lasciare React finire update
- Fallback: se il redirect non funziona, almeno lo spinner si ferma

#### 2. Add Request Timeout

**File:** `frontend/src/app/lib/api.ts`

```typescript
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
};

export const api = {
  post: async (path: string, data?: any) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      const response = await fetch(`${BASE_URL}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return await handleResponse(response);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        throw new Error("Request timeout");
      }
      throw err;
    }
  },
};
```

#### 3. Add Loading Guard in Redirect Logic

**File:** `frontend/src/app/components/AuthContext.tsx` (o simile)

```tsx
// Quando token è salvato in localStorage, garantire che loading state rifletta correttamente
useEffect(() => {
  const token = localStorage.getItem("token");
  if (token && isLoading) {
    // Se abbiamo token ma loading=true, qualcosa è fallito
    // Reset loading state
    setIsLoading(false);
  }
}, [isLoading]);
```

#### 4. Update Register Component

**File:** `frontend/src/app/register/page.tsx`

Applicare le stesse fix del login component (`handleLogin` → `handleRegister`).

### Backend Checks (Sanity Check)

Verificare che:

- [ ] `POST /auth/login` ritorna sempre 200/201, mai rimane in pending
- [ ] Response body contiene `access_token` e `user` object
- [ ] No infinite loops in `AuthService.authenticate()`
- [ ] Database queries completano in <2s

---

## Testing

### Unit Tests

**File:** `frontend/src/app/login/__tests__/page.test.tsx` (da creare)

```typescript
describe("Login page", () => {
  it("should set loading to false after successful login", async () => {
    // Mock API response
    // Trigger login
    // Assert loading transitions to false
  });

  it("should set loading to false on API error", async () => {
    // Mock API error
    // Trigger login
    // Assert loading transitions to false and error message shown
  });

  it("should redirect to /app after successful login", async () => {
    // Mock API success
    // Trigger login
    // Assert window.location.href called with "/app"
  });

  it("should timeout after 15s if API doesn't respond", async () => {
    // Mock slow API (never responds)
    // Trigger login
    // Wait 15s
    // Assert error shown
  });
});
```

### Manual Testing

1. **Happy path:** Email + password corretti → deve entrare in `/app` senza hang
2. **Error path:** Password sbagliata → error message subito, loading=false
3. **Timeout path:** Simula API lenta (DevTools throttling) → vedi se timeout 15s scatta
4. **Network error:** Disattiva rete → error message subito

---

## Atomic Commits (AGENT_FLOW)

Se implementato, seguire questo ordine:

1. `feat(auth): add request timeout to API client`
2. `fix(login): reset loading state explicitly in finally block`
3. `fix(login): add delay before redirect to allow React render`
4. `fix(register): apply same loading state fix as login`
5. `feat(auth): add loading guard in AuthContext useEffect`
6. `test(login): add unit tests for loading state transitions`
7. `test(register): add unit tests for loading state transitions`

---

## Acceptance Criteria

- [ ] Login page non mostra infinite spinner dopo risposta API
- [ ] Register page non mostra infinite spinner dopo risposta API
- [ ] Se API lento (>15s), mostra error message e loading=false
- [ ] Se API fallisce, mostra error message e loading=false
- [ ] Se API succede, redirect a `/app` entro 500ms
- [ ] Tutti i test passano
- [ ] No console errors o warnings

---

## Related Issues

- Potrebbe essere correlato a: useEffect dependencies issues in AuthContext
- Simile a: #65 (dark mode toggle non responsive)

---

## Notes

- **Severity:** Critical — impatta first-time user experience
- **Should be fixed BEFORE going to production**
- **Workaround:** Utente può tornare a landing page e riprovare login
- **Data loss risk:** No — solo UX hang, non data corruption
