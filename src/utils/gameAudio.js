let sharedContext;
let podiumVolume = 0.55;
let podiumEnabled = true;

export function setGameAudioVolume(value) { podiumVolume = Math.max(0, Math.min(1, Number(value) || 0)); }
export function setGameAudioEnabled(value) { podiumEnabled = Boolean(value); }

function getContext() {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  sharedContext ||= new AudioContextClass();
  if (sharedContext.state === 'suspended') void sharedContext.resume().catch(() => {});
  return sharedContext;
}

function pluck(context, destination, frequency, start, duration, volume, type = 'triangle') {
  const oscillator = context.createOscillator(), envelope = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(Math.max(0.001, volume), start + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(envelope); envelope.connect(destination);
  oscillator.start(start); oscillator.stop(start + duration + 0.025);
}

export function startGameMusic(volume = podiumVolume) {
  const context = getContext();
  if (!context) return null;
  const master = context.createGain();
  master.gain.setValueAtTime(0.16 * Math.max(0, Math.min(1, volume)), context.currentTime);
  master.connect(context.destination);
  const melody = [523.25,659.25,783.99,659.25,587.33,523.25,392,523.25,659.25,783.99,1046.5,783.99,659.25,587.33,523.25,392];
  const bass = [130.81,196,164.81,220];
  const beat = 0.30, phraseLength = beat * melody.length;
  let nextPhrase = context.currentTime + 0.08;
  const playPhrase = () => {
    for (let i = 0; i < melody.length; i++) {
      const at = nextPhrase + i * beat;
      pluck(context, master, melody[i], at, 0.19, 0.11, 'square');
      if (i % 4 === 0) pluck(context, master, bass[i / 4], at, 0.48, 0.14, 'triangle');
    }
    nextPhrase += phraseLength;
  };
  playPhrase();
  const timer = window.setInterval(() => {
    if (context.state === 'closed') return;
    if (context.currentTime + 0.45 >= nextPhrase) playPhrase();
  }, 120);
  let stopped = false;
  return { setVolume(value) { const now = context.currentTime; master.gain.cancelScheduledValues(now); master.gain.setTargetAtTime(0.16 * Math.max(0, Math.min(1, value)), now, 0.04); }, stop() {
    if (stopped) return;
    stopped = true; window.clearInterval(timer);
    const now = context.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(0.0001, now, 0.08);
    window.setTimeout(() => { try { master.disconnect(); } catch {} }, 500);
  } };
}

export function playPodiumSting() {
  if (!podiumEnabled || podiumVolume === 0) return;
  const context = getContext();
  if (!context) return;
  const notes = [293.66, 392, 523.25, 587.33, 783.99];
  notes.forEach((frequency, index) => pluck(context, context.destination, frequency, context.currentTime + 0.06 + index * 0.15, 0.22, 0.075 * podiumVolume, 'triangle'));
}
