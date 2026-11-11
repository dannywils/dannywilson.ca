export class Controller {
  constructor(config, random = Math.random) {
    this.config = config;
    this.random = random;
    this.phase = "human";
    this.elapsed = 0;
    this.duration = this.humanDuration();
  }
  humanDuration() {
    const t = this.config.timing;
    return t.humanMin + this.random() * (t.humanMax - t.humanMin);
  }
  ignite() {
    this.phase='interference';
    this.elapsed=0;
    this.duration=this.config.timing.interference;
  }
  update(delta) {
    this.elapsed += delta;
    if (this.elapsed < this.duration) return false;
    this.elapsed = 0;
    const t = this.config.timing;
    if (this.phase === "human") {
      this.phase = "interference";
      this.duration = t.interference;
    } else if (this.phase === "interference") {
      this.phase = "takeover";
      this.duration = t.takeover;
    } else if (this.phase === "takeover") {
      this.phase = "recovery";
      this.duration = t.recovery;
    } else {
      this.phase = "human";
      this.duration = this.humanDuration();
    }
    return true;
  }
  get ai() {
    return this.phase === "interference" || this.phase === "takeover";
  }
  get eye() {
    return this.ai;
  }
  get light() {
    if (this.phase === "interference") {
      const t = this.elapsed * 420 / this.config.timing.interference;
      if (t < 38) return 0.8;
      if (t < 110) return 0.08;
      if (t < 156) return 1;
      if (t < 238) return 0.18;
      if (t < 310) return 0.65;
      return 1;
    }
    if (this.phase === "takeover")
      return 1 - 0.24 * Math.exp(-(((this.elapsed - 740) / 38) ** 2));
    return 0;
  }
}
