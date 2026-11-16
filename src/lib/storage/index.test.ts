import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { LocalStorage } from './index';
it('stores private files, handles empty data and rejects traversal', async () => {
  const root = await mkdtemp(join(tmpdir(), 'jobpilot-storage-'));
  try {
    const store = new LocalStorage(root);
    const key = await store.put(Buffer.from('resume'));
    expect(await store.get(key)).toEqual(Buffer.from('resume'));
    const empty = await store.put(Buffer.alloc(0));
    expect(await store.get(empty)).toHaveLength(0);
    await expect(store.get('../secret')).rejects.toThrow('Invalid storage key');
    await store.remove(key);
    await store.remove(key);
    await expect(store.get(key)).rejects.toThrow();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
