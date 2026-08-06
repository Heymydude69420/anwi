/**
 * Storage for the photos she uploads herself.
 *
 * These can't live in localStorage — it caps out around 5MB and only holds
 * strings, while a single phone photo is several megabytes of binary. IndexedDB
 * stores Blobs directly and comfortably handles hundreds of megabytes.
 *
 * Uploads are downscaled before they're stored, so a 24MP camera shot doesn't
 * consume her whole quota.
 */

const DB_NAME = "anwi.photos";
const DB_VERSION = 1;
const STORE = "uploads";

export interface UploadedPhoto {
  id: string;
  blob: Blob;
  caption: string;
  addedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = run(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

/**
 * Shrink an image to fit `maxEdge` and re-encode as JPEG.
 *
 * Phone cameras produce 4000px+ images; the gallery never displays above
 * ~1600px, so storing the original is pure waste.
 */
async function downscale(file: File, maxEdge = 1600, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file; // No canvas support: store as-is rather than lose the photo.
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );

  return blob ?? file;
}

export async function addPhotos(files: File[], caption = ""): Promise<UploadedPhoto[]> {
  const added: UploadedPhoto[] = [];

  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;

    // HEIC straight off an iPhone can't be decoded by createImageBitmap in
    // most browsers, so keep the original rather than dropping the upload.
    let blob: Blob;
    try {
      blob = await downscale(file);
    } catch {
      blob = file;
    }

    const photo: UploadedPhoto = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      blob,
      caption,
      addedAt: Date.now(),
    };

    await tx("readwrite", (store) => store.add(photo));
    added.push(photo);
  }

  return added;
}

export async function allPhotos(): Promise<UploadedPhoto[]> {
  try {
    const photos = await tx<UploadedPhoto[]>("readonly", (store) => store.getAll());
    return photos.sort((a, b) => a.addedAt - b.addedAt);
  } catch {
    return [];
  }
}

export async function removePhoto(id: string): Promise<void> {
  await tx("readwrite", (store) => store.delete(id));
}
