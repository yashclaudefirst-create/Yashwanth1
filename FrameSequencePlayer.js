export class FrameSequencePlayer {
  constructor({ canvas, framePaths, nativeWidth, nativeHeight, crossfade = true }) {
    this.canvas = canvas;
    this.ctx = canvas ? canvas.getContext('2d') : null;
    this.framePaths = framePaths;
    this.nativeWidth = nativeWidth;
    this.nativeHeight = nativeHeight;
    this.crossfade = crossfade;

    this.images = [];
    this.isLoaded = false;
    this.preloadPromise = null;
    this.currentFrameIndex = 0;
    this.rafId = 0;
    this.isPlaying = false;

    if (this.canvas) {
      this.initCanvas();
    }
  }

  initCanvas() {
    this.canvas.width = this.nativeWidth;
    this.canvas.height = this.nativeHeight;
  }

  preload() {
    if (this.preloadPromise) return this.preloadPromise;

    this.preloadPromise = Promise.all(
      this.framePaths.map((path) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error(`Failed to load frame: ${path}`));
          img.src = path;
        });
      })
    ).then((loadedImages) => {
      this.images = loadedImages;
      this.isLoaded = true;
      if (!this.isPlaying) {
        this.renderFrame(0, 0);
      }
      return loadedImages;
    }).catch((err) => {
      console.error('Error preloading frame sequence:', err);
      throw err;
    });

    return this.preloadPromise;
  }

  renderFrame(index1, blend = 0) {
    if (!this.isLoaded || !this.images.length || !this.ctx) return;

    const ctx = this.ctx;
    const w = this.nativeWidth;
    const h = this.nativeHeight;

    const img1 = this.images[index1];
    const index2 = Math.min(index1 + 1, this.images.length - 1);
    const img2 = this.images[index2];

    ctx.clearRect(0, 0, w, h);

    if (img1) {
      ctx.globalAlpha = 1;
      ctx.drawImage(img1, 0, 0, w, h);
    }

    if (this.crossfade && blend > 0 && img2 && index1 !== index2) {
      ctx.globalAlpha = blend;
      ctx.drawImage(img2, 0, 0, w, h);
    }

    ctx.globalAlpha = 1;
    this.currentFrameIndex = index1;
  }

  play(durationSeconds, onComplete) {
    this.stop();

    const start = () => {
      this.isPlaying = true;
      let startTime = null;

      const step = (now) => {
        if (!startTime) startTime = now;
        const elapsed = (now - startTime) / 1000;
        const progress = Math.min(1, elapsed / durationSeconds);

        const totalFrames = this.images.length;
        const rawIndex = progress * (totalFrames - 1);
        const frameIndex = Math.floor(rawIndex);
        const blend = rawIndex - frameIndex;

        this.renderFrame(frameIndex, blend);

        if (progress < 1) {
          this.rafId = requestAnimationFrame(step);
        } else {
          this.isPlaying = false;
          if (onComplete) onComplete();
        }
      };

      this.rafId = requestAnimationFrame(step);
    };

    if (this.isLoaded) {
      start();
    } else {
      this.preload().then(start);
    }
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.isPlaying = false;
  }

  reset() {
    this.stop();
    if (this.isLoaded) {
      this.renderFrame(0, 0);
    } else if (this.ctx) {
      this.ctx.clearRect(0, 0, this.nativeWidth, this.nativeHeight);
    }
  }
}
