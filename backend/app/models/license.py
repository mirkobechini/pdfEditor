import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, String

from app.core.database import Base


class LicenseFeature(Base):
    """Defines which features are enabled for each license tier."""

    __tablename__ = "license_features"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    tier = Column(String(20), nullable=False, index=True)  # free, pro, enterprise
    feature_key = Column(String(100), nullable=False)
    enabled = Column(Boolean, default=True, nullable=False)
    created_at = Column(
        DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    def __repr__(self) -> str:
        return f"<LicenseFeature(tier={self.tier}, key={self.feature_key})>"