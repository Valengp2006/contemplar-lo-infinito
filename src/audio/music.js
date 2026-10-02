/**
 * Música de fondo. Solo se REPRODUCE con un <audio>: nunca se analiza
 * (sin Web Audio, sin volumen, sin espectro). La intérprete escucha y decide.
 *
 * Vite incluye el archivo en el build porque se importa aquí (la carpeta assets/
 * de la raíz no se publica sola).
 */
import musicUrl from '../../assets/Hans Zimmer - Interstellar Imperial Orchestra.mp3';

export function createMusic(config) {
  const audio = new Audio(musicUrl);
  audio.preload = 'auto';
  audio.loop = false;
  audio.volume = config.MUSIC_VOLUME;

  let available = true;
  audio.addEventListener('error', () => {
    available = false;
    console.warn('No se pudo cargar la música; la pieza sigue en silencio.');
  });

  return {
    audio,
    get available() { return available; },
    get playing() { return !audio.paused; },
    get time() { return audio.currentTime || 0; },
    get duration() { return Number.isFinite(audio.duration) ? audio.duration : 0; },

    async play() {
      if (!available) return;
      try { await audio.play(); }
      catch (err) { console.warn('El navegador no dejó iniciar la música:', err && err.message); }
    },
    pause() { audio.pause(); },
    toggle() { return audio.paused ? this.play() : this.pause(); },
    seek(t) { audio.currentTime = Math.max(0, Math.min(t, this.duration || t)); },
    setVolume(v) { audio.volume = Math.max(0, Math.min(1, v)); },
  };
}

export function formatTime(s) {
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${String(r).padStart(2, '0')}`;
}
