import 'react-native-get-random-values';

type CryptoLike = { getRandomValues<T extends ArrayBufferView>(array: T): T };

function getCrypto(): CryptoLike {
  const c = (globalThis as { crypto?: CryptoLike }).crypto;
  if (!c?.getRandomValues) {
    throw new Error('crypto.getRandomValues is unavailable (missing polyfill?)');
  }
  return c;
}

/**
 * RFC 4122 v4 UUID using the native CSPRNG (polyfilled by
 * react-native-get-random-values). Used to generate row ids client-side so
 * optimistic offline rows have an id before Supabase ever responds.
 */
export function uuidv4(): string {
  const bytes = new Uint8Array(16);
  getCrypto().getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10xx

  const hex: string[] = [];
  for (let i = 0; i < 16; i++) hex.push(bytes[i].toString(16).padStart(2, '0'));

  return (
    hex.slice(0, 4).join('') +
    '-' +
    hex.slice(4, 6).join('') +
    '-' +
    hex.slice(6, 8).join('') +
    '-' +
    hex.slice(8, 10).join('') +
    '-' +
    hex.slice(10, 16).join('')
  );
}
