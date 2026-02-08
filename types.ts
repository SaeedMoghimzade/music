
export interface Song {
  id: string;
  name: string;
  fileName: string;
  path: string;
  artist: string;
  album: string;
  duration: number;
  handle?: FileSystemFileHandle; // Optional for modern API
  file?: File; // Optional for fallback API
  folderId: string;
  coverUrl?: string;
}

export interface FolderSource {
  id: string;
  name: string;
  handle?: FileSystemDirectoryHandle;
}

export interface Playlist {
  id: string;
  name: string;
  songIds: string[];
  createdAt: number;
}

export enum View {
  LIBRARY = 'LIBRARY',
  PLAYLISTS = 'PLAYLISTS',
  SETTINGS = 'SETTINGS',
  PLAYLIST_DETAIL = 'PLAYLIST_DETAIL'
}
