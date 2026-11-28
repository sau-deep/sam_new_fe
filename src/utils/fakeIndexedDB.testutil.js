// Minimal in-memory IndexedDB for unit tests (jsdom has none). Implements only
// what utils/indexDB.js uses: open/upgrade, one-store transactions with
// add/put/get/getAll/delete, commit via oncomplete, and failures via onabort.
//
// failures: { open: true } makes open() fail; { hangOpen: true } makes open()
// never answer (seen in some Android WebViews); { hangTx: true } makes
// transactions never complete; { write: 'QuotaExceededError' } aborts every
// readwrite transaction with that error name.

const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

export function installFakeIndexedDB(failures = {}) {
  const state = { stores: {}, failures, keyPaths: {}, autoIds: {} };

  const db = {
    objectStoreNames: { contains: (name) => name in state.stores },
    createObjectStore(name, { keyPath, autoIncrement } = {}) {
      state.stores[name] = new Map();
      state.keyPaths[name] = keyPath;
      state.autoIds[name] = autoIncrement ? 1 : null;
    },
    transaction(name, mode) {
      if (!(name in state.stores)) throw new Error(`NotFoundError: ${name}`);
      const tx = { error: null, oncomplete: null, onabort: null, onerror: null };
      const ops = [];
      const store = {};
      const request = (apply) => {
        const req = { result: undefined, error: null, onsuccess: null };
        ops.push({ req, apply });
        return req;
      };
      const map = state.stores[name];
      const keyPath = state.keyPaths[name];
      store.add = (value) => request(() => {
        const v = clone(value);
        if (v[keyPath] == null && state.autoIds[name] != null) v[keyPath] = state.autoIds[name]++;
        if (map.has(v[keyPath])) throw Object.assign(new Error('ConstraintError'), { name: 'ConstraintError' });
        map.set(v[keyPath], v);
        return v[keyPath];
      });
      store.put = (value) => request(() => {
        const v = clone(value);
        if (v[keyPath] == null && state.autoIds[name] != null) v[keyPath] = state.autoIds[name]++;
        map.set(v[keyPath], v);
        return v[keyPath];
      });
      store.get = (key) => request(() => clone(map.get(key)));
      store.getAll = () => request(() => [...map.values()].map(clone));
      store.delete = (key) => request(() => { map.delete(key); return undefined; });
      tx.objectStore = () => store;
      tx.abort = () => { tx.aborted = true; };

      setTimeout(() => {
        if (state.failures.hangTx && !tx.aborted) return; // never completes
        if (tx.aborted) { tx.onabort && tx.onabort(); return; }
        if (mode === 'readwrite' && state.failures.write) {
          tx.error = Object.assign(new Error(state.failures.write), { name: state.failures.write });
          tx.onabort && tx.onabort();
          return;
        }
        const snapshot = new Map(map);
        try {
          for (const op of ops) {
            op.req.result = op.apply();
            op.req.onsuccess && op.req.onsuccess();
          }
        } catch (e) {
          state.stores[name] = snapshot;
          tx.error = e;
          tx.onerror && tx.onerror();
          tx.onabort && tx.onabort();
          return;
        }
        tx.oncomplete && tx.oncomplete();
      }, 0);
      return tx;
    },
    close() {},
  };

  let upgraded = false;
  window.indexedDB = {
    open() {
      const req = { onsuccess: null, onerror: null, onupgradeneeded: null, onblocked: null };
      state.openCalls = (state.openCalls || 0) + 1;
      if (state.failures.hangOpen) return req; // no event ever fires
      setTimeout(() => {
        if (state.failures.open) {
          req.onerror && req.onerror({ target: { error: new Error('open failed') } });
          return;
        }
        if (!upgraded) {
          upgraded = true;
          req.onupgradeneeded && req.onupgradeneeded({ target: { result: db } });
        }
        req.onsuccess && req.onsuccess({ target: { result: db } });
      }, 0);
      return req;
    },
  };
  return state;
}

export function removeFakeIndexedDB() {
  delete window.indexedDB;
}
