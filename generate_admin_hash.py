import bcrypt

def generate_bcrypt_hash(password):
    # Generate bcrypt hash with 12 rounds
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

if __name__ == "__main__":
    password = "admin123"
    hash_result = generate_bcrypt_hash(password)
    print(f"Password: {password}")
    print(f"BCrypt Hash: {hash_result}")
    print(f"SQL INSERT: ('admin', '{hash_result}', 'admin@theatre.com', '9876543210', 'Theatre Administrator', 'admin', TRUE, 2)")
