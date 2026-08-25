/**
 * Offline Exam Storage Engine (IndexedDB + LocalStorage Fallback)
 * Sistem Ujian Online CBT
 *
 * Menyimpan seluruh data soal, status navigasi, dan antrean jawaban siswa
 * secara lokal di browser agar siswa tetap dapat mengerjakan ujian tanpa
 * takut kehilangan data saat koneksi internet Wi-Fi lab / paket data terputus.
 */

const DB_NAME = 'cbt_offline_exam_db';
const DB_VERSION = 1;
const STORE_ANSWERS = 'exam_answers';
const STORE_SESSIONS = 'exam_sessions';

export interface OfflineAnswerRecord {
  id: string; // `${attemptId}_${questionId}`
  attemptId: string | number;
  questionId: number;
  answer_content: any;
  is_flagged: boolean;
  updatedAt: number;
  syncStatus: 'pending' | 'synced';
}

export interface OfflineExamSessionRecord {
  attemptId: string | number;
  questions: any[];
  timeRemainingSeconds: number;
  cachedAt: number;
}

// Open / initialize IndexedDB instance
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported in this browser environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_ANSWERS)) {
        const answerStore = db.createObjectStore(STORE_ANSWERS, { keyPath: 'id' });
        answerStore.createIndex('attemptId', 'attemptId', { unique: false });
        answerStore.createIndex('syncStatus', 'syncStatus', { unique: false });
        answerStore.createIndex('attempt_sync', ['attemptId', 'syncStatus'], { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_SESSIONS)) {
        db.createObjectStore(STORE_SESSIONS, { keyPath: 'attemptId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * 1. Simpan Jawaban Siswa ke IndexedDB
 */
export async function saveAnswerOffline(
  attemptId: string | number,
  questionId: number,
  answerContent: any,
  isFlagged: boolean,
  syncStatus: 'pending' | 'synced' = 'pending'
): Promise<void> {
  const record: OfflineAnswerRecord = {
    id: `${attemptId}_${questionId}`,
    attemptId: String(attemptId),
    questionId,
    answer_content: answerContent,
    is_flagged: isFlagged,
    updatedAt: Date.now(),
    syncStatus
  };

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_ANSWERS, 'readwrite');
      const store = tx.objectStore(STORE_ANSWERS);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    // Fallback to localStorage if IndexedDB fails
    try {
      const key = `cbt_answer_${attemptId}_${questionId}`;
      localStorage.setItem(key, JSON.stringify(record));
    } catch (e) {
      console.warn('Offline storage fallback error:', e);
    }
  }
}

/**
 * 2. Ambil Semua Jawaban Tersimpan untuk Sesi Ujian Ini
 */
export async function getOfflineAnswers(attemptId: string | number): Promise<OfflineAnswerRecord[]> {
  try {
    const db = await openDB();
    return new Promise<OfflineAnswerRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_ANSWERS, 'readonly');
      const store = tx.objectStore(STORE_ANSWERS);
      const index = store.index('attemptId');
      const req = index.getAll(String(attemptId));
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    // Fallback from localStorage
    const results: OfflineAnswerRecord[] = [];
    const prefix = `cbt_answer_${attemptId}_`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        try {
          const item = JSON.parse(localStorage.getItem(key) || '{}');
          results.push(item);
        } catch (e) {}
      }
    }
    return results;
  }
}

/**
 * 3. Ambil Antrean Jawaban yang Belum Tersinkronisasi (Pending Sync)
 */
export async function getPendingOfflineAnswers(attemptId: string | number): Promise<OfflineAnswerRecord[]> {
  const allAnswers = await getOfflineAnswers(attemptId);
  return allAnswers.filter(a => a.syncStatus === 'pending');
}

/**
 * 4. Tandai Jawaban Sebagai 'synced' Setelah Sukses Dikirim ke Server
 */
export async function markAnswerAsSynced(attemptId: string | number, questionId: number): Promise<void> {
  const recordId = `${attemptId}_${questionId}`;
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_ANSWERS, 'readwrite');
      const store = tx.objectStore(STORE_ANSWERS);
      const getReq = store.get(recordId);
      getReq.onsuccess = () => {
        const record = getReq.result as OfflineAnswerRecord | undefined;
        if (record) {
          record.syncStatus = 'synced';
          store.put(record);
        }
        resolve();
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch (err) {
    try {
      const key = `cbt_answer_${attemptId}_${questionId}`;
      const raw = localStorage.getItem(key);
      if (raw) {
        const item = JSON.parse(raw);
        item.syncStatus = 'synced';
        localStorage.setItem(key, JSON.stringify(item));
      }
    } catch (e) {}
  }
}

/**
 * 5. Cache Seluruh Paket Soal & Sesi Ujian Offline
 * Jika browser siswa di-refresh saat offline, halaman tetap dapat me-render soal lengkap!
 */
export async function saveExamSessionOffline(
  attemptId: string | number,
  questions: any[],
  timeRemainingSeconds: number
): Promise<void> {
  const record: OfflineExamSessionRecord = {
    attemptId: String(attemptId),
    questions,
    timeRemainingSeconds,
    cachedAt: Date.now()
  };

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_SESSIONS, 'readwrite');
      const store = tx.objectStore(STORE_SESSIONS);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    try {
      localStorage.setItem(`cbt_session_${attemptId}`, JSON.stringify(record));
    } catch (e) {}
  }
}

/**
 * 6. Ambil Cache Sesi Ujian Offline
 */
export async function getExamSessionOffline(attemptId: string | number): Promise<OfflineExamSessionRecord | null> {
  try {
    const db = await openDB();
    return new Promise<OfflineExamSessionRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE_SESSIONS, 'readonly');
      const store = tx.objectStore(STORE_SESSIONS);
      const req = store.get(String(attemptId));
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    try {
      const raw = localStorage.getItem(`cbt_session_${attemptId}`);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
}

/**
 * 7. Bersihkan Cache Sesi Ujian Setelah Pengumpulan Akhir Berhasil
 */
export async function clearOfflineExamData(attemptId: string | number): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_ANSWERS, STORE_SESSIONS], 'readwrite');
    
    // Delete session
    tx.objectStore(STORE_SESSIONS).delete(String(attemptId));
    
    // Delete answers for this attempt
    const answerStore = tx.objectStore(STORE_ANSWERS);
    const index = answerStore.index('attemptId');
    const req = index.openCursor(IDBKeyRange.only(String(attemptId)));
    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest).result as IDBCursorWithValue | null;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  } catch (err) {
    // Clear localStorage
    const prefix = `cbt_answer_${attemptId}_`;
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith(prefix) || key === `cbt_session_${attemptId}`)) {
        localStorage.removeItem(key);
      }
    }
  }
}
