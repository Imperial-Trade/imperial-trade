// Quick credential encryption script
// Uses same encryption method as frontend/VPS
import crypto from 'crypto';

const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || 'ImperialTrade_BrokerEncryption_2025_v1';
const USER_ID = '8a2ccfdc-1efb-4979-b6a0-4e7b4883db59';

function getEncryptionKey(userId) {
  const keyMaterial = `${userId}-${ENCRYPTION_SECRET}`;
  return crypto.createHash('sha256').update(keyMaterial).digest();
}

function encrypt(plaintext, userId) {
  try {
    const key = getEncryptionKey(userId);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();
    
    // Combine IV + encrypted data + auth tag
    const combined = Buffer.concat([iv, encrypted, authTag]);
    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw error;
  }
}

// Accounts to encrypt
const accounts = [
  {
    name: 'PU Prime',
    login: '18448879',
    password: 'wb6V8e^t',
    server: 'PUPrime-Live4'
  },
  {
    name: 'XS',
    login: '11321405',
    password: 'U!27bc5h',
    server: 'XSFintech-REAL-3'
  },
  {
    name: 'EC Markets Demo',
    login: '800107112',
    password: 'Demo@123',
    server: 'ECMarkets-MT5-Demo'
  }
];

console.log('Encrypting credentials...\n');
accounts.forEach(account => {
  const encrypted_login = encrypt(account.login, USER_ID);
  const encrypted_password = encrypt(account.password, USER_ID);
  const encrypted_server = encrypt(account.server, USER_ID);
  
  console.log(`-- ${account.name}`);
  console.log(`encrypted_login: '${encrypted_login}',`);
  console.log(`encrypted_password: '${encrypted_password}',`);
  console.log(`encrypted_server: '${account.server}',`); // Server can be plain
  console.log('');
});


