import secrets
import string

def generate_room_id(length: int = 12) -> str:
    """
    Generates a secure, random alphanumeric string for room identification.
    Uses secrets module for cryptographically secure random number generation.
    """
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))
