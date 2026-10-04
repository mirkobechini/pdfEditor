"""Tests for the anti-production guard on test-account registration (issue #921).

Guardia: con ENVIRONMENT == production la registrazione di account con
pattern-test (email/full_name) viene rifiutata 400 e NON crea righe in
users. In development il comportamento resta invariato. L'allowlist
E2E_ALLOW_TEST_REGISTRATION=True disabilita il blocco (e2e mirati).
La creazione guest legittima (/auth/guest) non passa dalla guardia e
resta permessa anche in produzione; il login di utenti esistenti non è
impatttato.
"""

import pytest
from fastapi import status

from app.models.user import User


@pytest.fixture()
def production_env(monkeypatch):
    """Force ENVIRONMENT=production with the guard active (default allowlist off)."""
    monkeypatch.setattr("app.core.config.settings.ENVIRONMENT", "production")
    monkeypatch.setattr("app.core.config.settings.E2E_ALLOW_TEST_REGISTRATION", False)


@pytest.fixture()
def production_env_allowlist(monkeypatch):
    """Force ENVIRONMENT=production with E2E_ALLOW_TEST_REGISTRATION=True."""
    monkeypatch.setattr("app.core.config.settings.ENVIRONMENT", "production")
    monkeypatch.setattr("app.core.config.settings.E2E_ALLOW_TEST_REGISTRATION", True)


@pytest.mark.parametrize(
    "email,full_name",
    [
        # Sottostringhe di dominio tipiche dei test
        ("qualcosa@test.com", "Utente Normale"),
        ("user@example.com", "Utente Normale"),
        ("ignoto@pdfeditor.local", "Utente Normale"),
        # Prefissi local-part tipici dei test
        ("e2e_user@prova.it", "Utente Normale"),
        ("test_runner@prova.it", "Utente Normale"),
        ("desk_1@prova.it", "Utente Normale"),
        ("reg_prova@prova.it", "Utente Normale"),
        ("login_prova@prova.it", "Utente Normale"),
        ("merge_prova@prova.it", "Utente Normale"),
        ("pdf_prova@prova.it", "Utente Normale"),
        ("csrf_prova@prova.it", "Utente Normale"),
        ("wrong_prova@prova.it", "Utente Normale"),
        # Full name osservati nel DB di produzione
        ("utente.normale@example.org", "E2E User"),
        ("utente.normale@example.org", "Test"),
        ("utente.normale@example.org", "Test2"),
        ("utente.normale@example.org", "Desk User"),
        ("utente.normale@example.org", "Debug"),
        # Case-insensitive su entrambi
        ("E2E_USER@prova.it", "Utente Normale"),
        ("utente.normale@example.org", "e2e user"),
    ],
)
class TestRegisterGuardProduction:
    URL = "/auth/register"

    def test_pattern_rejected_no_row(self, client, db_session, production_env, email, full_name):
        """Con ENVIRONMENT=production i pattern-test → 400 e nessuna riga in users."""
        response = client.post(
            self.URL,
            json={"email": email, "password": "Password123", "full_name": full_name},
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "test" in response.json()["detail"].lower()
        assert db_session.query(User).count() == 0


class TestRegisterGuardAllowed:
    URL = "/auth/register"

    def test_development_invariant(self, client):
        """Con ENVIRONMENT=development (valore di default) l'email pattern-test passa."""
        # Nessun fixture production_env: ENVIRONMENT resta "development"
        response = client.post(
            self.URL,
            json={"email": "qualcosa@test.com", "password": "Password123", "full_name": "Utente Normale"},
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert "access_token" in response.json()

    def test_production_allowlist_allows(self, client, db_session, production_env_allowlist):
        """Con l'allowlist attiva anche in produzione il pattern-test passa."""
        response = client.post(
            self.URL,
            json={"email": "qualcosa@test.com", "password": "Password123", "full_name": "Utente Normale"},
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert db_session.query(User).count() == 1

    def test_production_legit_account_ok_and_login_works(self, client, db_session, production_env):
        """Account normale in produzione: registrazione 201 e login invariato."""
        response = client.post(
            self.URL,
            json={"email": "mirko@mirkobechini.com", "password": "Password123", "full_name": "Mirko Bechini"},
        )
        assert response.status_code == status.HTTP_201_CREATED
        assert db_session.query(User).count() == 1

        login = client.post(
            "/auth/login",
            json={"email": "mirko@mirkobechini.com", "password": "Password123"},
        )
        assert login.status_code == status.HTTP_200_OK
        assert "access_token" in login.json()


class TestGuestFlowGuard:
    """I guest legittimi restano permessi in produzione; la conversione con
    email pattern-test è bloccata (è una registrazione a pieno titolo)."""

    def test_guest_creation_still_works_in_production(self, client, db_session, production_env):
        """/auth/guest non passa dalla guardia: crea il guest anche in produzione."""
        response = client.post("/auth/guest")
        assert response.status_code == status.HTTP_201_CREATED
        assert response.json()["user"]["is_guest"] is True
        assert db_session.query(User).count() == 1

    def test_guest_convert_with_test_email_blocked(self, client, db_session, production_env):
        """Conversione guest → account pieno con email pattern-test: 400."""
        guest = client.post("/auth/guest")
        assert guest.status_code == status.HTTP_201_CREATED

        convert = client.post(
            "/auth/guest/convert",
            json={"email": "qualcosa@test.com", "password": "Password123", "full_name": "Utente Normale"},
        )
        assert convert.status_code == status.HTTP_400_BAD_REQUEST
        assert "test" in convert.json()["detail"].lower()
        # Il guest esiste ancora, nessun nuovo account creato
        assert db_session.query(User).count() == 1
        assert db_session.query(User).first().is_guest is True