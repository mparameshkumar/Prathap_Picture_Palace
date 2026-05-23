import psycopg2
import bcrypt
from app.core.config import settings

def generate_bcrypt_hash(password):
    """Generate bcrypt hash for a password"""
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def update_user_passwords():
    """Update all user passwords to use bcrypt"""
    
    # Define users and their passwords
    users_passwords = {
        'admin': 'admin123',
        'john': 'user123',
        'jane': 'user123',
        'mike': 'user123',
        'sarah': 'user123',
        'robert': 'user123',
        'john1': 'user123',
        'testuser': 'test123'
    }
    
    try:
        conn = psycopg2.connect(settings.DATABASE_URL)
        cursor = conn.cursor()
        
        print("Updating user passwords to bcrypt format...")
        
        for username, password in users_passwords.items():
            bcrypt_hash = generate_bcrypt_hash(password)
            
            cursor.execute(
                'UPDATE users SET password_hash = %s WHERE username = %s',
                (bcrypt_hash, username)
            )
            
            print(f"Updated {username}: {bcrypt_hash[:50]}...")
        
        conn.commit()
        
        # Verify updates
        cursor.execute('SELECT username, password_hash FROM users')
        users = cursor.fetchall()
        print('\nUpdated users:')
        for user in users:
            print(f'Username: {user[0]}, Hash: {user[1][:50]}...')
        
        cursor.close()
        conn.close()
        print('\nPassword hashes updated successfully!')
        
    except Exception as e:
        print(f'Error updating passwords: {e}')

if __name__ == "__main__":
    update_user_passwords()
