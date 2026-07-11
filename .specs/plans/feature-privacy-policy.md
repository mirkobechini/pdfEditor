# Feature Plan: Privacy Policy Page

**Status:** Planning
**Priority:** BASSA (Legal/Compliance)
**Complexity:** Low
**Estimated Time:** 2-3 hours

---

## Obiettivo

Creare una pagina Privacy Policy per il sito PdfEditor, accessibile dal footer della landing page.

## Contesto

- Il progetto è open source
- Raccoglie dati utente (email, nome) per autenticazione
- Usa Google OAuth (dati profilo Google)
- Invia email di reset password (tramite SendGrid)
- I PDF caricati sono privati e associati all'utente
- In futuro: AI editing (invio PDF a provider esterni)

## Contenuti della Privacy Policy

### Sezioni minime

1. **Titolare del trattamento** — Nome, contatti
2. **Dati raccolti** — Email, nome, PDF caricati, dati di utilizzo
3. **Finalità del trattamento** — Autenticazione, erogazione servizio, supporto
4. **Base giuridica** — Consenso, esecuzione del contratto
5. **Condivisione dei dati** — Google OAuth, SendGrid, provider AI (BYOK)
6. **Conservazione dei dati** — Finché l'account è attivo + 30gg
7. **Diritti dell'utente** — Accesso, rettifica, cancellazione, portabilità
8. **Cookie** — CSRF token, access_token (httpOnly)
9. **Modifiche** — La policy può essere aggiornata
10. **Contatti** — Email per richieste privacy

## Implementazione

### Frontend

#### 1. Pagina Privacy Policy

```tsx
// frontend/src/app/privacy/page.tsx
export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">1. Data Controller</h2>
        <p>PdfEditor is developed and maintained by Mirko Bechini.</p>
        <p>Contact: [email da definire]</p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-bold mb-4">2. Data We Collect</h2>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Account data:</strong> email address, full name
          </li>
          <li>
            <strong>PDF files:</strong> documents you upload for editing
          </li>
          <li>
            <strong>Usage data:</strong> features used, pages viewed
          </li>
          <li>
            <strong>Google profile data:</strong> if you use Google SSO
          </li>
        </ul>
      </section>

      {/* ... altre sezioni ... */}
    </div>
  );
}
```

#### 2. Footer Link

```tsx
// In LandingFooter.tsx
<Link href="/privacy" className="text-sm text-gray-400 hover:text-gray-300">
  Privacy Policy
</Link>
```

### Traduzioni

```json
// frontend/messages/en.json
"privacy": {
  "title": "Privacy Policy",
  "lastUpdated": "Last updated: July 11, 2026",
  "sections": {
    "controller": { "title": "Data Controller", "body": "..." },
    "dataCollected": { "title": "Data We Collect", "body": "..." },
    "purpose": { "title": "Purpose of Processing", "body": "..." },
    "sharing": { "title": "Data Sharing", "body": "..." },
    "retention": { "title": "Data Retention", "body": "..." },
    "rights": { "title": "Your Rights", "body": "..." },
    "cookies": { "title": "Cookies", "body": "..." },
    "contact": { "title": "Contact", "body": "..." }
  }
}
```

## Files da creare

- `frontend/src/app/privacy/page.tsx` — Pagina privacy policy

## Files da modificare

- `frontend/src/app/components/landing/LandingFooter.tsx` — Aggiungere link
- `frontend/messages/en.json` — Chiavi i18n
- `frontend/messages/it.json` — Chiavi i18n

## Note legali

- **Non sono un avvocato.** Questa è una bozza generica. Per un'app in produzione, consultare un legale.
- GDPR compliance richiesta se utenti EU.
- La policy deve essere aggiornata quando vengono introdotte nuove funzionalità (es. AI editing).
