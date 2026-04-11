export class AudioEngine {
  ctx: AudioContext | null = null;

  init() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
  }

  playBeep(freq: number, duration: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.frequency.value = freq;
    gain.gain.value = 0.1;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
    osc.stop(this.ctx.currentTime + duration);
  }

  play(type: 'move' | 'interact' | 'dialogue' | 'success' | 'error') {
    switch (type) {
      case 'move': this.playBeep(200, 0.05); break;
      case 'interact': this.playBeep(400, 0.1); break;
      case 'dialogue': this.playBeep(600, 0.02); break;
      case 'success': this.playBeep(800, 0.3); break;
      case 'error': this.playBeep(150, 0.3); break;
    }
  }
}
