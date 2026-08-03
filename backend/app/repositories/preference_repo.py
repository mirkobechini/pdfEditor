from sqlalchemy.orm import Session

from app.models.preference import UserPreference


class PreferenceRepository:
    """Repository for UserPreference database operations."""

    def __init__(self, db: Session):
        self.db = db

    def get_by_user_id(self, user_id: str) -> UserPreference | None:
        return self.db.query(UserPreference).filter(UserPreference.user_id == user_id).first()

    def upsert(self, user_id: str, theme: str | None = None, language: str | None = None, default_zoom: int | None = None) -> UserPreference:
        pref = self.get_by_user_id(user_id)
        if pref:
            if theme is not None:
                pref.theme = theme
            if language is not None:
                pref.language = language
            if default_zoom is not None:
                pref.default_zoom = default_zoom
            self.db.flush()
            self.db.refresh(pref)
            return pref

        from datetime import datetime, timezone
        pref = UserPreference(
            user_id=user_id,
            theme=theme or "dark",
            language=language or "it",
            default_zoom=default_zoom or 100,
        )
        self.db.add(pref)
        self.db.flush()
        self.db.refresh(pref)
        return pref