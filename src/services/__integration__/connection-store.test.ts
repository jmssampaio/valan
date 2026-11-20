// The code the connection functions run on the real tables, against the local stack. The
// functions' own rules are tested in Deno with a store in memory; this is what proves the
// real one reads and writes the columns it says, with the key the functions hold.
import {
  createConnectionStore,
  type PendingHandshake,
  type StoredConnection,
} from '../../../supabase/functions/_shared/connections/store';

import { createConfirmedUser, serverClient } from './local-stack';

const store = () => createConnectionStore(serverClient());

/** A hash no other attempt has: 64 hex digits, as SHA-256 gives. The store never checks what it is the hash of. */
const newHash = () => `${crypto.randomUUID()}${crypto.randomUUID()}`.replaceAll('-', '');
const inMinutes = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();

function attempt(userId: string, overrides: Partial<PendingHandshake> = {}): PendingHandshake {
  return {
    userId,
    marketplace: 'discogs',
    stateHash: newHash(),
    handshakeEncrypted: 'v1.iv.sealed-handshake',
    expiresAt: inMinutes(10),
    ...overrides,
  };
}

function connection(userId: string, overrides: Partial<StoredConnection> = {}): StoredConnection {
  return {
    userId,
    marketplace: 'discogs',
    accessTokenEncrypted: 'v1.iv.sealed-access',
    tokenSecretEncrypted: 'v1.iv.sealed-secret',
    refreshTokenEncrypted: null,
    expiresAt: null,
    accountName: 'ana-records',
    ...overrides,
  };
}

async function storedConnections(userId: string) {
  const { data, error } = await serverClient()
    .from('platform_connections')
    .select('marketplace, status, access_token_encrypted, token_secret_encrypted, refresh_token_encrypted, expires_at, external_username')
    .eq('user_id', userId)
    .order('marketplace');
  if (error) throw error;
  return data;
}

let alice: { id: string };
let bob: { id: string };

beforeEach(async () => {
  alice = await createConfirmedUser();
  bob = await createConfirmedUser();
});

describe('connection attempts', () => {
  it('gives back an attempt by the hash of its state', async () => {
    const kept = attempt(alice.id);
    await store().saveHandshake(kept);

    const taken = await store().takeHandshake(kept.stateHash);

    expect(taken).toMatchObject({
      userId: alice.id,
      marketplace: 'discogs',
      stateHash: kept.stateHash,
      handshakeEncrypted: 'v1.iv.sealed-handshake',
    });
    expect(new Date(taken?.expiresAt ?? '').toISOString()).toBe(kept.expiresAt);
  });

  it('gives an attempt only once', async () => {
    const kept = attempt(alice.id);
    await store().saveHandshake(kept);

    await store().takeHandshake(kept.stateHash);

    expect(await store().takeHandshake(kept.stateHash)).toBeNull();
  });

  it('gives an attempt to one of two callbacks that arrive together', async () => {
    const kept = attempt(alice.id);
    await store().saveHandshake(kept);

    const both = await Promise.all([store().takeHandshake(kept.stateHash), store().takeHandshake(kept.stateHash)]);

    expect(both.filter((taken) => taken !== null)).toHaveLength(1);
  });

  it('finds nothing for a state nobody was given', async () => {
    await store().saveHandshake(attempt(alice.id));

    expect(await store().takeHandshake(newHash())).toBeNull();
  });

  it('replaces the attempt a seller had pending with that marketplace', async () => {
    const first = attempt(alice.id);
    const second = attempt(alice.id, { handshakeEncrypted: 'v1.iv.second' });

    await store().saveHandshake(first);
    await store().saveHandshake(second);

    expect(await store().takeHandshake(first.stateHash)).toBeNull();
    expect(await store().takeHandshake(second.stateHash)).toMatchObject({ handshakeEncrypted: 'v1.iv.second' });
  });

  it('keeps the attempts of two sellers, and of two marketplaces, apart', async () => {
    const hers = attempt(alice.id);
    const hersOnEbay = attempt(alice.id, { marketplace: 'ebay' });
    const his = attempt(bob.id);

    await store().saveHandshake(hers);
    await store().saveHandshake(hersOnEbay);
    await store().saveHandshake(his);

    expect(await store().takeHandshake(his.stateHash)).toMatchObject({ userId: bob.id });
    expect(await store().takeHandshake(hers.stateHash)).toMatchObject({ userId: alice.id, marketplace: 'discogs' });
    expect(await store().takeHandshake(hersOnEbay.stateHash)).toMatchObject({ userId: alice.id, marketplace: 'ebay' });
  });

  it('clears the attempts that expired, and only those', async () => {
    const expired = attempt(alice.id, { expiresAt: inMinutes(-1) });
    const pending = attempt(bob.id);
    await store().saveHandshake(expired);
    await store().saveHandshake(pending);

    await store().deleteExpiredHandshakes(new Date());

    expect(await store().takeHandshake(expired.stateHash)).toBeNull();
    expect(await store().takeHandshake(pending.stateHash)).not.toBeNull();
  });

  it('refuses to keep a state instead of its hash', async () => {
    await expect(store().saveHandshake(attempt(alice.id, { stateHash: 'the-state-itself' }))).rejects.toThrow(
      /Could not keep the connection attempt/,
    );
  });

  it('says nothing of the row in the error it throws, which ends up in the server log', async () => {
    const refused = attempt(alice.id, { stateHash: 'the-state-itself', handshakeEncrypted: 'v1.iv.what-the-attempt-kept' });

    const error = await store()
      .saveHandshake(refused)
      .then(
        () => null,
        (thrown: unknown) => thrown,
      );

    expect(error).toBeInstanceOf(Error);
    const everythingItSays = `${(error as Error).message} ${JSON.stringify(error)} ${String((error as Error).cause ?? '')}`;
    // The database's own account of the failure quotes the whole row.
    for (const value of ['the-state-itself', 'what-the-attempt-kept', alice.id]) {
      expect(everythingItSays).not.toContain(value);
    }
  });
});

describe('connections', () => {
  it('stores a connection as connected, with every column it was given', async () => {
    await store().saveConnection(
      connection(alice.id, { refreshTokenEncrypted: 'v1.iv.sealed-refresh', expiresAt: '2027-01-01T00:00:00.000Z' }),
    );

    const [stored] = await storedConnections(alice.id);
    expect(stored).toMatchObject({
      marketplace: 'discogs',
      status: 'connected',
      access_token_encrypted: 'v1.iv.sealed-access',
      token_secret_encrypted: 'v1.iv.sealed-secret',
      refresh_token_encrypted: 'v1.iv.sealed-refresh',
      external_username: 'ana-records',
    });
    expect(new Date(stored.expires_at ?? '').toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });

  it('connecting again replaces the connection, and leaves nothing of the old one', async () => {
    await store().saveConnection(
      connection(alice.id, { refreshTokenEncrypted: 'v1.iv.old-refresh', expiresAt: '2027-01-01T00:00:00.000Z' }),
    );

    await store().saveConnection(
      connection(alice.id, { accessTokenEncrypted: 'v1.iv.new-access', accountName: 'ana-novo' }),
    );

    expect(await storedConnections(alice.id)).toEqual([
      {
        marketplace: 'discogs',
        status: 'connected',
        access_token_encrypted: 'v1.iv.new-access',
        token_secret_encrypted: 'v1.iv.sealed-secret',
        refresh_token_encrypted: null,
        expires_at: null,
        external_username: 'ana-novo',
      },
    ]);
  });

  it('marks a connection that had expired as connected again', async () => {
    await store().saveConnection(connection(alice.id));
    const { error } = await serverClient()
      .from('platform_connections')
      .update({ status: 'expired' })
      .eq('user_id', alice.id);
    expect(error).toBeNull();

    await store().saveConnection(connection(alice.id));

    expect((await storedConnections(alice.id))[0].status).toBe('connected');
  });

  it('deletes one connection of one seller, with its pending attempt, and no other', async () => {
    await store().saveConnection(connection(alice.id));
    await store().saveConnection(connection(alice.id, { marketplace: 'ebay' }));
    await store().saveConnection(connection(bob.id));
    const hers = attempt(alice.id);
    const his = attempt(bob.id);
    await store().saveHandshake(hers);
    await store().saveHandshake(his);

    await store().deleteConnection(alice.id, 'discogs');

    expect((await storedConnections(alice.id)).map(({ marketplace }) => marketplace)).toEqual(['ebay']);
    expect(await storedConnections(bob.id)).toHaveLength(1);
    expect(await store().takeHandshake(hers.stateHash)).toBeNull();
    expect(await store().takeHandshake(his.stateHash)).not.toBeNull();
  });

  it('deleting a connection that is not there succeeds', async () => {
    await expect(store().deleteConnection(alice.id, 'discogs')).resolves.toBeUndefined();
  });
});
