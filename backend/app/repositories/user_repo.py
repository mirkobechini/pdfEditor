from sqlalchemy.orm import Session

from app.models.license import LicenseFeature
from app.models.user import User


class UserRepository:
    """Repository for User database operations."""

    def __init__(self, db: Session):
        self.db = db

    def create(self, user: User) -> User:
        self.db.add(user)
        self.db.flush()
        self.db.refresh(user)
        return user

    def get_by_email(self, email: str) -> User | None:
        return self.db.query(User).filter(User.email == email).first()

    def get_by_id(self, user_id: str) -> User | None:
        return self.db.query(User).filter(User.id == user_id).first()

    def get_all_users(self, skip: int = 0, limit: int = 100) -> list[User]:
        return self.db.query(User).offset(skip).limit(limit).all()

    def update_license_tier(self, user_id: str, tier: str) -> User | None:
        user = self.get_by_id(user_id)
        if not user:
            return None
        user.license_tier = tier
        self.db.flush()
        self.db.refresh(user)
        return user

    def get_features_for_tier(self, tier: str) -> list[LicenseFeature]:
        return (
            self.db.query(LicenseFeature)
            .filter(LicenseFeature.tier == tier)
            .all()
        )