import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from './crypto';

describe('AES-256-GCM Crypto Module', () => {
  it('should successfully encrypt and decrypt a password string', () => {
    const originalPassword = 'MySecretPassword123!';
    const encrypted = encrypt(originalPassword);
    
    expect(encrypted).toBeDefined();
    expect(encrypted).toContain(':');
    expect(encrypted).not.toBe(originalPassword);
    
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(originalPassword);
  });

  it('should generate different ciphertexts and IVs for the same input', () => {
    const text = 'SamePasswordDifferentIV';
    const encrypted1 = encrypt(text);
    const encrypted2 = encrypt(text);
    
    expect(encrypted1).not.toBe(encrypted2);
    expect(decrypt(encrypted1)).toBe(text);
    expect(decrypt(encrypted2)).toBe(text);
  });

  it('should throw an error if the encrypted payload has an invalid format', () => {
    expect(() => decrypt('invalid-format')).toThrow('Invalid encrypted text format');
  });

  it('should throw an error if the payload has been tampered with', () => {
    const originalPassword = 'SecurePassword';
    const encrypted = encrypt(originalPassword);
    
    // Tamper with the encrypted ciphertext
    const parts = encrypted.split(':');
    // Change a character in the hex ciphertext string
    const tamperedCipher = parts[2].substring(0, parts[2].length - 1) + (parts[2].endsWith('a') ? 'b' : 'a');
    const tamperedPayload = `${parts[0]}:${parts[1]}:${tamperedCipher}`;
    
    expect(() => decrypt(tamperedPayload)).toThrow(/Decryption failed/);
  });
});
