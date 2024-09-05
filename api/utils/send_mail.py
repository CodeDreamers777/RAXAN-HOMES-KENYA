import requests


MAILGUN_API_KEY = "7be282479e3bb247aec514dac1b20e6d-777a617d-41a51e2c"
MAILGUN_DOMAIN = "sandbox6147a85bac1841b59049338e923c9757.mailgun.org"


def send_email_via_mailgun(subject, text, to_email):
    return requests.post(
        f"https://api.mailgun.net/v3/{MAILGUN_DOMAIN}/messages",
        auth=("api", MAILGUN_API_KEY),
        data={
            "from": f"Mailgun Sandbox <postmaster@{MAILGUN_DOMAIN}>",
            "to": to_email,
            "subject": subject,
            "text": text,
        },
    )
