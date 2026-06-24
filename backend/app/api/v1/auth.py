from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.auth import GoogleLoginRequest, TokenResponse, UserLoginRequest, UserRegisterRequest, UserResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    return AuthService(db)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    req: UserRegisterRequest,
    service: AuthService = Depends(get_auth_service),
) -> UserResponse:
    """Register a new user."""
    try:
        user = service.register(
            email=req.email,
            password=req.password,
            full_name=req.full_name,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    return UserResponse.model_validate(user)


@router.post("/login", response_model=TokenResponse)
def login(
    req: UserLoginRequest,
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    """Login and get JWT token."""
    try:
        token = service.login(email=req.email, password=req.password)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )

    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse)
def get_me(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> UserResponse:
    """Get current user profile from JWT token."""
    service = AuthService(db)
    try:
        user = service.get_current_user(credentials.credentials)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )

    return UserResponse.model_validate(user)


@router.post("/google", response_model=TokenResponse)
def google_login(
    req: GoogleLoginRequest,
    service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    """Login with Google SSO using an id_token."""
    try:
        user, token = service.google_login(req.id_token)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )

    return TokenResponse(access_token=token)