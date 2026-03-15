import smtplib
from email.message import EmailMessage
from ..config import settings

def send_password_reset_email(to_email: str, reset_url: str) -> None:
    if not settings.SMTP_HOST:
        return

    from_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
    if not from_email:
        raise RuntimeError("SMTP_FROM_EMAIL or SMTP_USER must be set to send email.")

    msg = EmailMessage()
    msg["Subject"] = "Reset your Flashcard Pro password"
    msg["From"] = from_email
    msg["To"] = to_email
    msg.set_content(
        "You requested a password reset.\n\n"
        f"Reset your password using this link:\n{reset_url}\n\n"
        "If you did not request this, you can ignore this email."
    )

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
        if settings.SMTP_USE_TLS:
            server.starttls()
        if settings.SMTP_USER:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)
