from sqlalchemy.orm import Session

from app.core.security import create_access_token, decode_access_token, get_password_hash, verify_password
from app.models.user import User
from app.repositories.user_repo import UserRepository
from app.schemas.auth import UserResponse


class AuthService:
    """Business logic for authentication."""

    def __init__(self, db: Session):
        self.repo = UserRepository(db)

    def register(self, email: str, password: str, full_name: str) -> User:
        """Register a new user."""
        # Check duplicate email
        existing = self.repo.get_by_email(email)
        if existing:
            raise ValueError("Email already registered")

        hashed = get_password_hash(password)
        user = User(
            email=email,
            hashed_password=hashed,
            full_name=full_name,
        )
        return self.repo.create(user)

    def login(self, email: str, password: str) -> str:
        """Authenticate a user and return a JWT token."""
        user = self.repo.get_by_email(email)
        if not user:
            raise ValueError("Invalid email or password")

        if not verify_password(password, user.hashed_password):
            raise ValueError("Invalid email or password")

        if not user.is_active:
            raise ValueError("Account is inactive")

        return create_access_token(data={"sub": user.id})

    def get_current_user(self, token: str) -> User:
        """Validate a JWT token and return the user."""
        payload = decode_access_token(token)
        if payload is None:
            raise ValueError("Invalid or expired token")

        user_id = payload.get("sub")
        if not user_id:
            raise ValueError("Invalid token payload")

        user = self.repo.get_by_id(user_id)
        if not user:
            raise ValueError("User not found")

        if not user.is_active:
            raise ValueError("Account is inactive")

        return user