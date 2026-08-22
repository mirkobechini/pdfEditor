"""HTML templates for Google OAuth desktop flow pages."""

GOOGLE_OAUTH_SUCCESS = """<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PdfEditor — Accesso completato</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #17120f 0%, #201a15 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #f4f1ee;
  }
  .card {
    background: #221b16;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 22px;
    padding: 48px;
    max-width: 420px;
    width: 90%;
    text-align: center;
  }
  .logo {
    width: 64px;
    height: 64px;
    background: #f7871f;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 24px;
    box-shadow: 0 8px 20px rgba(247,135,31,0.35);
  }
  .logo-inner {
    width: 28px;
    height: 36px;
    background: #fff8f2;
    border-radius: 8px;
  }
  h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
  p { font-size: 14px; color: #9d9184; line-height: 1.5; }
  .check { font-size: 48px; margin-bottom: 16px; }
</style>
</head>
<body>
  <div class="card">
    <div class="check">✅</div>
    <div class="logo"><div class="logo-inner"></div></div>
    <h1>Accesso completato!</h1>
    <p>Hai effettuato l'accesso con Google.<br>Puoi chiudere questa finestra e tornare all'app.</p>
  </div>
  <script>window.close();</script>
</body>
</html>"""

GOOGLE_OAUTH_ERROR = """<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PdfEditor — Accesso non riuscito</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #17120f 0%, #201a15 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #f4f1ee;
  }
  .card {
    background: #221b16;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 22px;
    padding: 48px;
    max-width: 420px;
    width: 90%;
    text-align: center;
  }
  .logo {
    width: 64px;
    height: 64px;
    background: #f7871f;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 24px;
    box-shadow: 0 8px 20px rgba(247,135,31,0.35);
  }
  .logo-inner {
    width: 28px;
    height: 36px;
    background: #fff8f2;
    border-radius: 8px;
  }
  h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
  p { font-size: 14px; color: #9d9184; line-height: 1.5; }
  .error-icon { font-size: 48px; margin-bottom: 16px; }
</style>
</head>
<body>
  <div class="card">
    <div class="error-icon">❌</div>
    <div class="logo"><div class="logo-inner"></div></div>
    <h1>Accesso non riuscito</h1>
    <p>{error_msg}<br>Chiudi questa finestra e riprova dall'app.</p>
  </div>
</body>
</html>"""
