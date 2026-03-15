from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, SessionLocal, engine
from app.models import PasswordResetChallenge, PasswordResetToken, Student
from app.security import generate_totp_code

client = TestClient(app)

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

def cleanup_user(email: str):
    db = SessionLocal()
    try:
        student = db.query(Student).filter(Student.email == email).first()
        if student:
            db.query(PasswordResetToken).filter(PasswordResetToken.studentId == student.id).delete()
            db.query(PasswordResetChallenge).filter(PasswordResetChallenge.studentId == student.id).delete()
            db.delete(student)
            db.commit()
    finally:
        db.close()

def test_totp_forgot_password_flow():
    email = "alice_totp@example.com"
    cleanup_user(email)

    r = client.post("/auth/register", json={"name": "Alice", "email": email, "password": "secret"})
    assert r.status_code == 200, r.text

    r = client.post("/auth/login", json={"email": email, "password": "secret"})
    assert r.status_code == 200, r.text
    login_data = r.json()
    assert "access_token" in login_data
    assert login_data["student"]["name"] == "Alice"

    auth_header = {"Authorization": f"Bearer {login_data['access_token']}"}

    r = client.post("/auth/totp/setup", headers=auth_header)
    assert r.status_code == 200, r.text
    setup_data = r.json()
    assert "secret" in setup_data and "otpauth_url" in setup_data

    totp_code = generate_totp_code(setup_data["secret"])
    r = client.post("/auth/totp/verify", json={"code": totp_code}, headers=auth_header)
    assert r.status_code == 200, r.text

    r = client.post("/auth/forgot-password", json={"email": email})
    assert r.status_code == 200, r.text
    forgot_data = r.json()
    assert forgot_data["totp_required"] is True
    assert forgot_data["challenge_token"]

    totp_code = generate_totp_code(setup_data["secret"])
    r = client.post(
        "/auth/forgot-password/verify-totp",
        json={
            "email": email,
            "challenge_token": forgot_data["challenge_token"],
            "code": totp_code,
        },
    )
    assert r.status_code == 200, r.text
    verify_data = r.json()
    assert verify_data["reset_token"]

    r = client.post(
        "/auth/reset-password",
        json={"token": verify_data["reset_token"], "new_password": "new-secret"},
    )
    assert r.status_code == 200, r.text

    r = client.post("/auth/login", json={"email": email, "password": "new-secret"})
    assert r.status_code == 200, r.text
    assert r.json()["student"]["totpEnabled"] is True

    cleanup_user(email)
