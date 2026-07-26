# Feature Plan: Password Visibility Toggle (Eye Icon)

**Status:** ✅ Completata (2026-07-26)

---

## Obiettivo

Aggiungere un'icona a forma di occhio nei campi password per mostrare/nascondere la password durante l'inserimento.

## Coinvolge

- `login/page.tsx` — campo password
- `register/page.tsx` — campo password + conferma password
- `reset-password/page.tsx` — campo password + conferma password
- `forgot-password/page.tsx` — nessun campo password

## Implementazione

Componente `PasswordInput` riutilizzabile con stato `showPassword` toggle.

```tsx
const [showPassword, setShowPassword] = useState(false);
// input type={showPassword ? "text" : "password"}
// button: 👁 / 🙈
```
