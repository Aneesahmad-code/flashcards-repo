import bcrypt
import base64
import hashlib
import hmac
import jwt
import secrets
import struct
import time
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from .config import settings

bearer_scheme = HTTPBearer()

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False

def create_access_token(sub: int | str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(sub),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)).timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token") from exc

def get_bearer_token(credentials: HTTPAuthorizationCredentials) -> str:
    if credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid authentication scheme")
    return credentials.credentials

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

def create_random_token() -> tuple[str, str]:
    token = secrets.token_urlsafe(32)
    token_hash = hash_token(token)
    return token, token_hash

def create_password_reset_token() -> tuple[str, str]:
    return create_random_token()

def create_password_reset_challenge() -> tuple[str, str]:
    return create_random_token()

def create_totp_secret() -> str:
    return base64.b32encode(secrets.token_bytes(20)).decode("ascii").rstrip("=")

def build_totp_uri(secret: str, email: str) -> str:
    issuer = settings.TOTP_ISSUER.replace(" ", "%20")
    account = email.replace(" ", "%20")
    return f"otpauth://totp/{issuer}:{account}?secret={secret}&issuer={issuer}"

def verify_totp_code(secret: str, code: str) -> bool:
    if not code.isdigit() or len(code) != 6:
        return False
    current_counter = int(time.time() // 30)
    for offset in (-1, 0, 1):
        if generate_totp_code(secret, current_counter + offset) == code:
            return True
    return False

def generate_totp_code(secret: str, counter: int | None = None) -> str:
    if counter is None:
        counter = int(time.time() // 30)
    padded_secret = secret + "=" * ((8 - len(secret) % 8) % 8)
    key = base64.b32decode(padded_secret, casefold=True)
    msg = struct.pack(">Q", counter)
    digest = hmac.new(key, msg, hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    binary = struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7FFFFFFF
    return f"{binary % 1_000_000:06d}"
