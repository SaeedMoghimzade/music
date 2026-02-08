
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  ListMusic, 
  Settings, 
  Library, 
  Plus, 
  FolderPlus,
  Trash2,
  Heart,
  Search,
  Volume2,
  Shuffle,
  Repeat,
  MoreVertical,
  Music,
  X,
  Check
} from 'lucide-react';
import { Song, Playlist, FolderSource, View } from './types';
import { dbService } from './db';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.LIBRARY);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [folders, setFolders] = useState<FolderSource[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingToPlaylist, setIsAddingToPlaylist] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  
  // Playlist Creation State
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  // Audio state
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Derived state
  const filteredSongs = songs.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displaySongs = currentView === View.PLAYLIST_DETAIL && selectedPlaylistId
    ? songs.filter(s => playlists.find(p => p.id === selectedPlaylistId)?.songIds.includes(s.id))
    : filteredSongs;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const loadedSongs = await dbService.getAllSongs();
    const loadedPlaylists = await dbService.getPlaylists();
    const loadedFolders = await dbService.getFolders();
    setSongs(loadedSongs);
    setPlaylists(loadedPlaylists);
    setFolders(loadedFolders);
  };

  const handleAddFolder = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsScanning(true);
    const folderId = crypto.randomUUID();
    const folderName = files[0].webkitRelativePath.split('/')[0] || "Local Library";
    
    const newFolder: FolderSource = {
      id: folderId,
      name: folderName
    };
    await dbService.saveFolder(newFolder);

    const newSongs: Song[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('audio/') || file.name.match(/\.(mp3|wav|ogg|m4a|flac)$/i)) {
        newSongs.push({
          id: crypto.randomUUID(),
          name: file.name.replace(/\.[^/.]+$/, ""),
          fileName: file.name,
          path: file.webkitRelativePath,
          artist: 'Unknown Artist',
          album: 'Local Album',
          duration: 0,
          file: file,
          folderId: folderId
        });
      }
    }

    await dbService.saveSongs(newSongs);
    await loadData();
    setIsScanning(false);
    e.target.value = '';
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    
    const newPlaylist: Playlist = {
      id: crypto.randomUUID(),
      name: newPlaylistName.trim(),
      songIds: [],
      createdAt: Date.now()
    };
    
    await dbService.savePlaylist(newPlaylist);
    await loadData();
    setNewPlaylistName('');
    setIsCreatingPlaylist(false);
  };

  const togglePlay = () => {
    if (!audioRef.current || !currentSong) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const playSong = async (song: Song) => {
    try {
      if (!song.file) throw new Error("File missing");
      const url = URL.createObjectURL(song.file);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        setCurrentSong(song);
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Playback error", err);
    }
  };

  const playNext = useCallback(() => {
    const list = displaySongs;
    if (list.length === 0) return;
    let nextIndex;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * list.length);
    } else {
      const currentIndex = list.findIndex(s => s.id === currentSong?.id);
      nextIndex = (currentIndex + 1) % list.length;
    }
    playSong(list[nextIndex]);
  }, [displaySongs, currentSong, isShuffle]);

  const playPrev = () => {
    const list = displaySongs;
    if (list.length === 0) return;
    const currentIndex = list.findIndex(s => s.id === currentSong?.id);
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) prevIndex = list.length - 1;
    playSong(list[prevIndex]);
  };

  const addToPlaylist = async (songId: string, playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId);
    if (playlist && !playlist.songIds.includes(songId)) {
      playlist.songIds.push(songId);
      await dbService.savePlaylist(playlist);
      await loadData();
      setIsAddingToPlaylist(null);
    }
  };

  const removeSongFromLibrary = async (id: string) => {
    if (confirm('Remove this song from your local library?')) {
      await dbService.deleteSong(id);
      loadData();
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-gradient-vibrant text-white overflow-hidden p-4 md:p-8">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileInputChange} 
        className="hidden" 
        multiple 
        // @ts-ignore
        webkitdirectory="true" 
        directory="true" 
      />

      <audio 
        ref={audioRef} 
        onTimeUpdate={() => setProgress(audioRef.current ? (audioRef.current.currentTime / audioRef.current.duration) * 100 : 0)}
        onEnded={isRepeat ? () => {if(audioRef.current) audioRef.current.currentTime = 0; audioRef.current?.play();} : playNext}
        onVolumeChange={() => setVolume(audioRef.current?.volume || 0.8)}
      />

      <div className="flex flex-col flex-1 w-full max-w-7xl mx-auto glass rounded-[2.5rem] overflow-hidden shadow-2xl relative border border-white/20">
        
        {/* Top Section */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-20 md:w-72 glass-dark border-r border-white/10 flex flex-col p-6 z-10">
            <div className="flex items-center gap-4 px-2 mb-10">
              <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Music size={28} className="text-white" />
              </div>
              <div className="hidden md:block">
                <h1 className="font-bold text-xl tracking-tight leading-none text-white">Lumina</h1>
                <p className="text-[10px] text-white/40 uppercase tracking-widest mt-1">Music Player</p>
              </div>
            </div>

            <nav className="space-y-3 flex-1">
              <button 
                onClick={() => { setCurrentView(View.LIBRARY); setSelectedPlaylistId(null); }}
                className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 ${currentView === View.LIBRARY ? 'bg-white/15 text-white shadow-inner' : 'hover:bg-white/5 text-white/50'}`}
              >
                <Library size={22} />
                <span className="hidden md:block font-semibold">Library</span>
              </button>
              <button 
                onClick={() => { setCurrentView(View.PLAYLISTS); setSelectedPlaylistId(null); }}
                className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 ${currentView === View.PLAYLISTS ? 'bg-white/15 text-white shadow-inner' : 'hover:bg-white/5 text-white/50'}`}
              >
                <ListMusic size={22} />
                <span className="hidden md:block font-semibold">Playlists</span>
              </button>
              <button 
                onClick={() => { setCurrentView(View.SETTINGS); setSelectedPlaylistId(null); }}
                className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 ${currentView === View.SETTINGS ? 'bg-white/15 text-white shadow-inner' : 'hover:bg-white/5 text-white/50'}`}
              >
                <Settings size={22} />
                <span className="hidden md:block font-semibold">Folders</span>
              </button>
            </nav>

            <div className="mt-auto">
              <button 
                onClick={handleAddFolder}
                disabled={isScanning}
                className={`w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 p-4 rounded-2xl transition-all duration-300 font-bold shadow-lg shadow-blue-600/20 ${isScanning ? 'animate-pulse' : ''}`}
              >
                {isScanning ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <FolderPlus size={22} />}
                <span className="hidden md:block">{isScanning ? 'Indexing...' : 'Index Music'}</span>
              </button>
            </div>
          </aside>

          {/* Main Area */}
          <main className="flex-1 flex flex-col overflow-hidden bg-black/5">
            <header className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-4xl font-extrabold tracking-tight">
                  {currentView === View.LIBRARY && 'My Library'}
                  {currentView === View.PLAYLISTS && 'My Playlists'}
                  {currentView === View.SETTINGS && 'Local Folders'}
                  {currentView === View.PLAYLIST_DETAIL && playlists.find(p => p.id === selectedPlaylistId)?.name}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                   <p className="text-white/40 text-sm font-medium">{songs.length} Tracks Offline</p>
                </div>
              </div>
              
              {(currentView === View.LIBRARY || currentView === View.PLAYLIST_DETAIL) && (
                <div className="relative group min-w-[300px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={20} />
                  <input 
                    type="text"
                    placeholder="Search library..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white/5 outline-none rounded-2xl py-3.5 pl-12 pr-6 w-full border border-white/10 transition-all backdrop-blur-md"
                  />
                </div>
              )}
            </header>

            <div className="flex-1 overflow-y-auto px-8 pb-10">
              {currentView === View.LIBRARY || currentView === View.PLAYLIST_DETAIL ? (
                <div className="space-y-2">
                  {displaySongs.map((song) => (
                    <div 
                      key={song.id} 
                      onClick={() => playSong(song)}
                      className={`group flex items-center gap-5 p-4 rounded-3xl cursor-pointer transition-all ${currentSong?.id === song.id ? 'bg-white/20' : 'hover:bg-white/5'}`}
                    >
                      <div className="w-14 h-14 glass-dark rounded-2xl flex items-center justify-center flex-shrink-0">
                        {currentSong?.id === song.id && isPlaying ? (
                          <div className="flex items-end gap-1 h-5"><div className="w-1 bg-blue-400 animate-[bounce_0.8s_infinite] h-full"></div></div>
                        ) : <Music size={24} className="text-white/20" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold truncate text-lg">{song.name}</h4>
                        <p className="text-sm text-white/40 truncate">{song.path.split('/').slice(0,-1).join(' / ') || 'Root'}</p>
                      </div>
                      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={(e) => { e.stopPropagation(); setIsAddingToPlaylist(song.id); }} className="p-3 bg-white/5 hover:bg-blue-500/20 rounded-2xl"><Plus size={20} /></button>
                        <button onClick={(e) => { e.stopPropagation(); removeSongFromLibrary(song.id); }} className="p-3 bg-white/5 hover:bg-red-500/20 rounded-2xl"><Trash2 size={20} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : currentView === View.PLAYLISTS ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                  {isCreatingPlaylist ? (
                    <div className="aspect-[4/5] glass rounded-[2.5rem] p-8 flex flex-col justify-center border-2 border-blue-500/30">
                      <input autoFocus type="text" placeholder="Name..." value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()} className="bg-white/10 outline-none rounded-xl p-3 mb-4 border border-white/10" />
                      <div className="flex gap-2">
                        <button onClick={handleCreatePlaylist} className="flex-1 bg-blue-600 p-3 rounded-xl font-bold">Save</button>
                        <button onClick={() => setIsCreatingPlaylist(false)} className="bg-white/10 p-3 rounded-xl"><X size={18} /></button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setIsCreatingPlaylist(true)} className="aspect-[4/5] glass-dark rounded-[2.5rem] flex flex-col items-center justify-center gap-4 hover:bg-white/10 transition-all border-2 border-dashed border-white/10 group">
                      <Plus size={40} className="text-white/20 group-hover:scale-110 transition-transform" />
                      <span className="font-bold text-lg text-white/50">Create Playlist</span>
                    </button>
                  )}
                  {playlists.map(playlist => (
                    <div key={playlist.id} onClick={() => { setSelectedPlaylistId(playlist.id); setCurrentView(View.PLAYLIST_DETAIL); }} className="aspect-[4/5] glass-dark rounded-[2.5rem] p-8 group cursor-pointer hover:bg-white/10 transition-all relative overflow-hidden">
                      <div className="absolute inset-0 p-8 flex flex-col justify-end bg-gradient-to-t from-black/60 to-transparent">
                        <h3 className="font-extrabold text-2xl truncate mb-1">{playlist.name}</h3>
                        <p className="text-sm font-bold text-blue-400 uppercase tracking-widest">{playlist.songIds.length} tracks</p>
                      </div>
                      <button onClick={async (e) => { e.stopPropagation(); if(confirm('Delete playlist?')) { await dbService.deletePlaylist(playlist.id); loadData(); } }} className="absolute top-6 right-6 p-3 bg-black/20 hover:bg-red-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={18} /></button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="max-w-3xl space-y-6">
                  {folders.map(folder => (
                    <div key={folder.id} className="bg-white/5 p-5 rounded-3xl flex items-center justify-between border border-white/5 group">
                      <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-400"><FolderPlus size={28} /></div>
                        <div><h4 className="font-bold text-lg leading-none">{folder.name}</h4><p className="text-sm text-white/30 mt-2 font-medium">Local Path Indexed</p></div>
                      </div>
                      <button onClick={async () => { if(confirm('Unindex this folder?')) { await dbService.deleteFolder(folder.id); const songsToRemove = songs.filter(s => s.folderId === folder.id); for (const s of songsToRemove) await dbService.deleteSong(s.id); loadData(); } }} className="p-4 hover:bg-red-500/20 text-white/20 hover:text-red-400 rounded-2xl transition-all"><Trash2 size={24} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>

        {/* Player Bar */}
        <footer className="h-28 glass-dark border-t border-white/10 flex items-center px-8 md:px-12 z-20 backdrop-blur-3xl shrink-0">
          <div className="w-full max-w-7xl mx-auto flex items-center justify-between gap-10">
            <div className="flex items-center gap-6 w-1/3 min-w-0">
              <div className="w-16 h-16 glass rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0 relative border border-white/10 shadow-2xl">
                <Music size={28} className="text-white" />
              </div>
              <div className="min-w-0">
                <h4 className="font-extrabold truncate text-lg leading-tight">{currentSong?.name || 'Lumina Music'}</h4>
                <p className="text-sm text-white/40 truncate mt-1">{currentSong?.artist || 'Ready to play'}</p>
              </div>
            </div>

            <div className="flex flex-col items-center flex-1 max-w-xl">
              <div className="flex items-center gap-8 mb-3">
                <button onClick={() => setIsShuffle(!isShuffle)} className={`transition-all ${isShuffle ? 'text-blue-400' : 'text-white/20 hover:text-white'}`}><Shuffle size={20} /></button>
                <button onClick={playPrev} className="text-white/60 hover:text-white"><SkipBack size={32} fill="currentColor" /></button>
                <button onClick={togglePlay} className="w-16 h-16 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                  {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                </button>
                <button onClick={playNext} className="text-white/60 hover:text-white"><SkipForward size={32} fill="currentColor" /></button>
                <button onClick={() => setIsRepeat(!isRepeat)} className={`transition-all ${isRepeat ? 'text-blue-400' : 'text-white/20 hover:text-white'}`}><Repeat size={20} /></button>
              </div>
              <div className="w-full flex items-center gap-5">
                <span className="text-[11px] font-bold text-white/30 w-12 text-right">{audioRef.current ? new Date(audioRef.current.currentTime * 1000).toISOString().substring(14, 19) : '0:00'}</span>
                <div className="flex-1 h-2 bg-white/10 rounded-full cursor-pointer relative" onClick={(e) => { if (audioRef.current) { const rect = e.currentTarget.getBoundingClientRect(); const pos = (e.clientX - rect.left) / rect.width; audioRef.current.currentTime = pos * audioRef.current.duration; } }}>
                  <div className="absolute h-full bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.6)]" style={{ width: `${progress}%` }}></div>
                </div>
                <span className="text-[11px] font-bold text-white/30 w-12">{audioRef.current && audioRef.current.duration ? new Date(audioRef.current.duration * 1000).toISOString().substring(14, 19) : '0:00'}</span>
              </div>
            </div>

            <div className="flex items-center gap-5 w-1/3 justify-end hidden md:flex">
              <Volume2 size={22} className="text-white/20" />
              <input type="range" min="0" max="1" step="0.01" value={volume} onChange={(e) => { const v = parseFloat(e.target.value); setVolume(v); if (audioRef.current) audioRef.current.volume = v; }} className="w-32 accent-white bg-white/10 h-1.5 rounded-full appearance-none cursor-pointer" />
            </div>
          </div>
        </footer>
      </div>

      {/* MODAL: ADD TO PLAYLIST */}
      {isAddingToPlaylist && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-3xl bg-black/40 animate-in fade-in duration-300">
          <div className="glass-dark w-full max-w-md rounded-[2.5rem] p-0 overflow-hidden border border-white/20 shadow-2xl animate-in zoom-in duration-300">
            {/* Modal Header */}
            <div className="p-8 pb-4 flex items-center justify-between">
              <h3 className="text-2xl font-extrabold tracking-tight">Add to Playlist</h3>
              <button onClick={() => { setIsAddingToPlaylist(null); setIsCreatingPlaylist(false); }} className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            
            {/* Playlist List */}
            <div className="px-6 pb-6 max-h-[50vh] overflow-y-auto space-y-2 scrollbar-thin">
              {playlists.length === 0 && !isCreatingPlaylist && (
                <div className="py-12 text-center text-white/20 italic">No playlists created yet</div>
              )}
              {playlists.map(p => (
                <button 
                  key={p.id}
                  onClick={() => addToPlaylist(isAddingToPlaylist, p.id)}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-blue-600/30 border border-transparent hover:border-blue-500/30 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-blue-500/20">
                      <ListMusic size={18} className="text-white/40 group-hover:text-white" />
                    </div>
                    <span className="font-bold text-lg text-white/80 group-hover:text-white">{p.name}</span>
                  </div>
                  <span className="text-[10px] font-bold text-white/20 group-hover:text-blue-300 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-lg">
                    {p.songIds.length} tracks
                  </span>
                </button>
              ))}

              {isCreatingPlaylist && (
                <div className="bg-blue-600/10 p-5 rounded-3xl border border-blue-500/40 animate-in slide-in-from-top-4 duration-300">
                  <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3">Create New</p>
                  <input 
                    autoFocus
                    type="text"
                    placeholder="Playlist name..."
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                    className="w-full bg-black/40 outline-none rounded-xl p-4 mb-4 border border-white/10 focus:border-blue-400 transition-all"
                  />
                  <div className="flex gap-2">
                    <button 
                      onClick={handleCreatePlaylist}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 p-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-600/20"
                    >
                      <Check size={18} /> Save Playlist
                    </button>
                    <button onClick={() => setIsCreatingPlaylist(false)} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all">
                      <X size={18} />
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Modal Footer / Action Button */}
            {!isCreatingPlaylist && (
              <div className="p-6 pt-0">
                <button 
                  onClick={() => setIsCreatingPlaylist(true)}
                  className="w-full p-5 rounded-[1.5rem] border-2 border-dashed border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all font-bold flex items-center justify-center gap-2 text-white/40 hover:text-white group"
                >
                  <Plus size={20} className="group-hover:rotate-90 transition-transform duration-500" />
                  <span>Create New Playlist</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Background decoration */}
      <div className="absolute top-[-10%] right-[-10%] w-[50rem] h-[50rem] bg-purple-600/20 blur-[180px] rounded-full -z-10 animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-blue-600/10 blur-[150px] rounded-full -z-10 animate-pulse" style={{animationDelay: '2s'}}></div>
    </div>
  );
};

export default App;
