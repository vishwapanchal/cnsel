import hmac
import hashlib

def test_watermark():
    text = "This is a confidential document."
    recipient = "John Doe"
    secret = b"shared_secret_key"
    
    # Embed watermark
    token = hmac.new(secret, recipient.encode(), hashlib.sha256).digest()[:8]
    bits = ''.join(format(byte, '08b') for byte in token)
    
    ZERO = '\u200B'
    ONE = '\u200C'
    watermark = ''.join(ZERO if bit == '0' else ONE for bit in bits)
    
    watermarked = text + watermark
    
    # Extract watermark
    extracted_chars = [c for c in watermarked if c in [ZERO, ONE]]
    extracted_bits = ''.join('0' if c == ZERO else '1' for c in extracted_chars)
    extracted_token = bytes(int(extracted_bits[i:i+8], 2) for i in range(0, 64, 8))
    
    assert extracted_token == token
    print("[OK] Watermark test passed!")

if __name__ == "__main__":
    test_watermark()
