
import { openDB, IDBPDatabase } from 'idb';
import { Song, Playlist, FolderSource } from './types';

const DB_NAME = 'LuminaMusicDB';
const DB_VERSION = 1;

export class MusicDB {
  private db: Promise<IDBPDatabase>;

  constructor() {
    this.db = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('songs')) {
          db.createObjectStore('songs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('folders')) {
          db.createObjectStore('folders', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('playlists')) {
          db.createObjectStore('playlists', { keyPath: 'id' });
        }
      },
    });
  }

  async saveSongs(songs: Song[]) {
    const db = await this.db;
    const tx = db.transaction('songs', 'readwrite');
    for (const song of songs) {
      await tx.store.put(song);
    }
    await tx.done;
  }

  async getAllSongs(): Promise<Song[]> {
    const db = await this.db;
    return db.getAll('songs');
  }

  async deleteSong(id: string) {
    const db = await this.db;
    await db.delete('songs', id);
  }

  async saveFolder(folder: FolderSource) {
    const db = await this.db;
    await db.put('folders', folder);
  }

  async getFolders(): Promise<FolderSource[]> {
    const db = await this.db;
    return db.getAll('folders');
  }

  async deleteFolder(id: string) {
    const db = await this.db;
    await db.delete('folders', id);
  }

  async savePlaylist(playlist: Playlist) {
    const db = await this.db;
    await db.put('playlists', playlist);
  }

  async getPlaylists(): Promise<Playlist[]> {
    const db = await this.db;
    return db.getAll('playlists');
  }

  async deletePlaylist(id: string) {
    const db = await this.db;
    await db.delete('playlists', id);
  }
}

export const dbService = new MusicDB();
