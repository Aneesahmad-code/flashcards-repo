from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from ..deps import get_db
from ..models import Student, PasswordResetChallenge, PasswordResetToken
from ..security import (
    bearer_scheme,
    build_totp_uri,
    create_password_reset_challenge,
    hash_password,
    verify_password,
    create_access_token,
    create_password_reset_token,
    create_totp_secret,
    decode_access_token,
    get_bearer_token,
    hash_token,
    verify_totp_code,
)
from ..config import settings
from .schemas import (
    EnableTotpResponse,
    RegisterDto,
    LoginDto,
    StudentOut,
    LoginResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    VerifyForgotPasswordTotpRequest,
    VerifyForgotPasswordTotpResponse,
    VerifyTotpEnableRequest,
    VerifyTotpEnableResponse,
)

router = APIRouter()

def get_current_student(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Student:
    token = get_bearer_token(credentials)
    payload = decode_access_token(token)
    student_id = payload.get("sub")
    student = db.query(Student).filter(Student.id == int(student_id)).first() if student_id else None
    if not student:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Student not found")
    return student

@router.post("/register", response_model=StudentOut)
def register(payload: RegisterDto, db: Session = Depends(get_db)):
    exists = db.query(Student).filter(Student.email == payload.email).first()
    if exists:
        raise HTTPException(status_code=409, detail="Email already registered")

    student = Student(
        name=payload.name,
        email=payload.email,
        password=hash_password(payload.password),
    )
    db.add(student)
    db.commit()          # <<--- REQUIRED
    db.refresh(student)  # <<--- to return id
    return student

@router.post("/login", response_model=LoginResponse)
def login(payload: LoginDto, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.email == payload.email).first()
    if not student or not verify_password(payload.password, student.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(student.id)
    return LoginResponse(access_token=token, student=student)

@router.post("/totp/setup", response_model=EnableTotpResponse)
def setup_totp(current_student: Student = Depends(get_current_student), db: Session = Depends(get_db)):
    secret = create_totp_secret()
    current_student.totpSecret = secret
    current_student.totpEnabled = False
    db.commit()
    return EnableTotpResponse(
        secret=secret,
        otpauth_url=build_totp_uri(secret, current_student.email),
    )

@router.post("/totp/verify", response_model=VerifyTotpEnableResponse)
def verify_totp_enable(
    payload: VerifyTotpEnableRequest,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    if not current_student.totpSecret:
        raise HTTPException(status_code=400, detail="TOTP setup has not been started")
    if not verify_totp_code(current_student.totpSecret, payload.code):
        raise HTTPException(status_code=400, detail="Invalid TOTP code")

    current_student.totpEnabled = True
    db.commit()
    return VerifyTotpEnableResponse(message="TOTP enabled successfully.")

@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.email == payload.email).first()
    if not student or not student.totpEnabled or not student.totpSecret:
        return ForgotPasswordResponse(
            message="If that account is configured for recovery, continue with the next verification step.",
            totp_required=False,
        )

    challenge_token, challenge_hash = create_password_reset_challenge()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.TOTP_CHALLENGE_EXPIRE_MINUTES)
    challenge = PasswordResetChallenge(
        studentId=student.id,
        challengeHash=challenge_hash,
        expiresAt=expires_at,
    )
    db.add(challenge)
    db.commit()

    return ForgotPasswordResponse(
        message="Enter the code from your authenticator app to continue.",
        totp_required=True,
        challenge_token=challenge_token,
    )

@router.post("/forgot-password/verify-totp", response_model=VerifyForgotPasswordTotpResponse)
def verify_forgot_password_totp(payload: VerifyForgotPasswordTotpRequest, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.email == payload.email).first()
    if not student or not student.totpEnabled or not student.totpSecret:
        raise HTTPException(status_code=400, detail="TOTP recovery is not enabled for this account")

    challenge_hash = hash_token(payload.challenge_token)
    now = datetime.now(timezone.utc)
    challenge = (
        db.query(PasswordResetChallenge)
        .filter(
            PasswordResetChallenge.challengeHash == challenge_hash,
            PasswordResetChallenge.studentId == student.id,
            PasswordResetChallenge.usedAt.is_(None),
            PasswordResetChallenge.expiresAt > now,
        )
        .first()
    )

    if not challenge:
        raise HTTPException(status_code=400, detail="Invalid or expired reset challenge")
    if not verify_totp_code(student.totpSecret, payload.code):
        raise HTTPException(status_code=400, detail="Invalid TOTP code")

    reset_token, token_hash = create_password_reset_token()
    expires_at = now + timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES)
    db.add(
        PasswordResetToken(
            studentId=student.id,
            tokenHash=token_hash,
            expiresAt=expires_at,
        )
    )
    challenge.usedAt = now
    db.commit()

    return VerifyForgotPasswordTotpResponse(
        message="TOTP verified. You can now set a new password.",
        reset_token=reset_token,
    )

@router.post("/reset-password", response_model=ResetPasswordResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    token_hash = hash_token(payload.token)
    now = datetime.now(timezone.utc)

    reset_token = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.tokenHash == token_hash,
            PasswordResetToken.usedAt.is_(None),
            PasswordResetToken.expiresAt > now,
        )
        .first()
    )

    if not reset_token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    student = db.query(Student).filter(Student.id == reset_token.studentId).first()
    if not student:
        raise HTTPException(status_code=400, detail="Invalid reset token")

    student.password = hash_password(payload.new_password)
    reset_token.usedAt = now
    db.commit()

    return ResetPasswordResponse(message="Password updated successfully.")
