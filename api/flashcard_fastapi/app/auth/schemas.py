from pydantic import BaseModel, EmailStr

class RegisterDto(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginDto(BaseModel):
    email: EmailStr
    password: str

class StudentOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    totpEnabled: bool = False

    class Config:
        from_attributes = True

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    student: StudentOut

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ForgotPasswordResponse(BaseModel):
    message: str
    totp_required: bool = False
    challenge_token: str | None = None

class EnableTotpResponse(BaseModel):
    secret: str
    otpauth_url: str

class VerifyTotpEnableRequest(BaseModel):
    code: str

class VerifyTotpEnableResponse(BaseModel):
    message: str

class VerifyForgotPasswordTotpRequest(BaseModel):
    email: EmailStr
    challenge_token: str
    code: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ResetPasswordResponse(BaseModel):
    message: str

class VerifyForgotPasswordTotpResponse(BaseModel):
    message: str
    reset_token: str
