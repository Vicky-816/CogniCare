/*
 * Photos kept on this device (in IndexedDB, the browser's own file store), so
 * the games still show family photos with no internet. Everything here fails
 * quietly: a missing cache just means the photo is fetched again.
 */

const DB_NAME = "mindplay-life-story";
const STORE = "photos";

function open(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  return open().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) return resolve(null);
        try {
          const transaction = db.transaction(STORE, mode);
          const request = action(transaction.objectStore(STORE));
          let result: T | null = null;
          request.onsuccess = () => {
            result = request.result;
          };
          transaction.oncomplete = () => {
            db.close();
            resolve(result);
          };
          transaction.onabort = transaction.onerror = () => {
            db.close();
            resolve(null);
          };
        } catch {
          db.close();
          resolve(null);
        }
      }),
  );
}

export async function getPhoto(id: string): Promise<Blob | null> {
  const value = await run<unknown>("readonly", (store) => store.get(id));
  return value instanceof Blob ? value : null;
}

export async function putPhoto(id: string, blob: Blob): Promise<boolean> {
  return (await run("readwrite", (store) => store.put(blob, id))) !== null;
}

export async function deletePhoto(id: string): Promise<void> {
  await run("readwrite", (store) => store.delete(id));
}

/** Forget every photo on this device (used at sign-out). */
export async function clearPhotoCache(): Promise<void> {
  await run("readwrite", (store) => store.clear());
}
