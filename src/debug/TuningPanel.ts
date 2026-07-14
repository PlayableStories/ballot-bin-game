import { WORLD, BIN, THROW, GESTURE, WIND, SESSION, CAMERA, DEFAULTS, DEBUG } from '../config';
import { angleWindow, powerWindow } from '../systems/Solver';

/**
 * Stage 3 — tune the game in the hand that is complaining about it.
 *
 * Plain DOM over the canvas, not a Phaser UI, so it works with real fingers on a
 * real phone. Every constant is live: the objects in config.ts are mutable and
 * every system reads through those references, so a change lands on the very next
 * throw with no reload and no plumbing.
 *
 * The readout at the top is the point. It reports the ANGULAR SLACK the player
 * currently has — the number that decides whether the game is humane — and it
 * updates as you drag. You are not tuning numbers; you are tuning how much room
 * a thumb has to be wrong.
 *
 * Enabled with ?debug=1, or automatically on localhost. Never ships to players.
 */

interface Knob {
  label: string;
  /** Where this lives in DEFAULTS, so "changed from default" is exact, not guessed. */
  path: string[];
  get(): number;
  set(v: number): void;
  min: number;
  max: number;
  step: number;
  /** Shown instead of the raw value (e.g. radians → degrees). */
  fmt?: (v: number) => string;
}

const DEG = 180 / Math.PI;

export function shouldShowPanel(): boolean {
  // ?debug=1 forces it on anywhere; ?debug=0 forces it off. Explicit wins.
  const q = new URLSearchParams(location.search);
  if (q.has('debug')) return q.get('debug') !== '0';
  return isDevHost(location.hostname);
}

/**
 * Dev machine, or a phone on the same LAN reaching the dev server by IP.
 *
 * The first cut only matched localhost — which meant the panel was invisible on
 * the exact device Stage 3 exists to serve, a phone hitting 172.20.x.x. The
 * headless tests never caught it because they hit localhost. Private-range IPs
 * (RFC 1918 + link-local) are always a dev server; the public GitHub Pages host
 * is not, so this stays off in production.
 */
export function isDevHost(host: string): boolean {
  if (host === 'localhost' || host === '127.0.0.1') return true;
  if (host.endsWith('.local')) return true; // bonjour, e.g. williams-mac.local
  return (
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) // 172.16.0.0 – 172.31.255.255
  );
}

export class TuningPanel {
  private root!: HTMLDivElement;
  private readout!: HTMLPreElement;
  private open = false;

  /** Throws this session, so the panel can show a real hit rate next to the theory. */
  private thrown = 0;
  private landed = 0;

  private knobs: Knob[] = [
    {
      label: 'LATERAL_GAIN — how far a degree of swipe moves the ball',
      path: ['THROW', 'LATERAL_GAIN'],
      get: () => THROW.LATERAL_GAIN,
      set: (v) => (THROW.LATERAL_GAIN = v),
      min: 0.2,
      max: 1.2,
      step: 0.05,
    },
    {
      label: 'WIND.MAX — strongest wind the room can reach',
      path: ['WIND', 'MAX'],
      get: () => WIND.MAX,
      set: (v) => (WIND.MAX = v),
      min: 0.5,
      max: 8,
      step: 0.1,
    },
    {
      label: 'MAX_ANGLE — furthest a swipe may lean',
      path: ['THROW', 'MAX_ANGLE'],
      get: () => THROW.MAX_ANGLE,
      set: (v) => (THROW.MAX_ANGLE = v),
      min: 10 / DEG,
      max: 70 / DEG,
      step: 1 / DEG,
      fmt: (v) => `${(v * DEG).toFixed(0)}°`,
    },
    {
      label: 'CATCH lateral — how far sideways still counts',
      path: ['BIN', 'CATCH', 'lateral'],
      get: () => BIN.CATCH.lateral,
      set: (v) => (BIN.CATCH.lateral = v),
      min: 0.15,
      max: 0.9,
      step: 0.01,
      fmt: (v) => `${v.toFixed(2)}m`,
    },
    {
      label: 'CATCH depth — how far short/long still counts',
      path: ['BIN', 'CATCH', 'depth'],
      get: () => BIN.CATCH.depth,
      set: (v) => (BIN.CATCH.depth = v),
      min: 0.2,
      max: 1.2,
      step: 0.01,
      fmt: (v) => `${v.toFixed(2)}m`,
    },
    {
      label: 'POWER_EASE — how much swipe strength matters',
      path: ['THROW', 'POWER_EASE'],
      get: () => THROW.POWER_EASE,
      set: (v) => (THROW.POWER_EASE = v),
      min: 0,
      max: 1,
      step: 0.01,
    },
    {
      label: 'BIN.z — how far away the bin sits',
      path: ['BIN', 'z'],
      get: () => BIN.z,
      set: (v) => (BIN.z = v),
      min: 3,
      max: 10,
      step: 0.25,
      fmt: (v) => `${v.toFixed(2)}m`,
    },
    {
      label: 'V_FWD — throw speed down the room',
      path: ['THROW', 'V_FWD'],
      get: () => THROW.V_FWD,
      set: (v) => (THROW.V_FWD = v),
      min: 3,
      max: 9,
      step: 0.05,
    },
    {
      label: 'V_UP — throw loft',
      path: ['THROW', 'V_UP'],
      get: () => THROW.V_UP,
      set: (v) => (THROW.V_UP = v),
      min: 2,
      max: 9,
      step: 0.05,
    },
    {
      label: 'NOISE angle — random slop per throw',
      path: ['THROW', 'NOISE_ANGLE'],
      get: () => THROW.NOISE_ANGLE,
      set: (v) => (THROW.NOISE_ANGLE = v),
      min: 0,
      max: 3 / DEG,
      step: 0.1 / DEG,
      fmt: (v) => `${(v * DEG).toFixed(1)}°`,
    },
    {
      label: '⟶ DEBUG WIND — hold a constant gale, until Stage 2 blows it',
      path: ['DEBUG', 'wind'],
      get: () => DEBUG.wind,
      set: (v) => (DEBUG.wind = v),
      min: -8,
      max: 8,
      step: 0.1,
    },
  ];

  mount(): void {
    this.load();

    this.root = document.createElement('div');
    this.root.style.cssText = `
      position:fixed; inset:auto 0 0 0; z-index:9999;
      font:12px ui-monospace,monospace; color:#f2efe6;
      background:rgba(20,20,24,.94); border-top:2px solid #d98b2b;
      max-height:62vh; overflow:auto; padding:10px 12px 20px;
      display:none; -webkit-overflow-scrolling:touch;
    `;

    const toggle = document.createElement('button');
    toggle.textContent = 'TUNE';
    toggle.style.cssText = `
      position:fixed; right:8px; bottom:8px; z-index:10000;
      font:bold 12px ui-monospace,monospace; color:#1a1a1f; background:#d98b2b;
      border:0; border-radius:4px; padding:8px 12px; touch-action:manipulation;
    `;
    toggle.onclick = () => {
      this.open = !this.open;
      this.root.style.display = this.open ? 'block' : 'none';
      toggle.textContent = this.open ? 'HIDE' : 'TUNE';
      if (this.open) this.refresh();
    };

    this.readout = document.createElement('pre');
    this.readout.style.cssText =
      'margin:0 0 10px; padding:8px; background:#000; border-radius:4px; line-height:1.5; white-space:pre-wrap;';
    this.root.appendChild(this.readout);

    for (const k of this.knobs) this.root.appendChild(this.buildKnob(k));
    this.root.appendChild(this.buildButtons());

    document.body.append(toggle, this.root);
  }

  private buildKnob(k: Knob): HTMLElement {
    const wrap = document.createElement('label');
    wrap.style.cssText = 'display:block; margin:0 0 12px;';

    const name = document.createElement('div');
    name.style.cssText = 'display:flex; justify-content:space-between; gap:8px; margin-bottom:2px;';

    const text = document.createElement('span');
    text.textContent = k.label;
    text.style.opacity = '.75';

    const value = document.createElement('b');
    value.style.color = '#2b8f8f';

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(k.min);
    input.max = String(k.max);
    input.step = String(k.step);
    input.value = String(k.get());
    // Big enough to hit with a thumb, which is the entire lesson of this stage.
    input.style.cssText = 'width:100%; height:28px; accent-color:#d98b2b;';

    const show = () => {
      const v = k.get();
      value.textContent = k.fmt ? k.fmt(v) : v.toFixed(3);
      const def = this.defaultOf(k);
      value.style.color = Math.abs(v - def) > 1e-9 ? '#d98b2b' : '#2b8f8f';
    };

    input.oninput = () => {
      k.set(parseFloat(input.value));
      show();
      this.refresh();
      this.save();
    };

    show();
    name.append(text, value);
    wrap.append(name, input);
    return wrap;
  }

  private buildButtons(): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex; gap:8px; margin-top:6px;';

    const mk = (label: string, fn: () => void) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.style.cssText =
        'flex:1; font:bold 12px ui-monospace,monospace; padding:10px; border:1px solid #555; border-radius:4px; background:#2a2a32; color:#f2efe6;';
      b.onclick = fn;
      return b;
    };

    row.append(
      mk('RESET', () => {
        this.reset();
        this.remount();
      }),
      mk('COPY CONFIG', () => this.copyConfig()),
    );
    return row;
  }

  /** The whole reason the panel exists: what the player's thumb is actually up against. */
  private refresh(): void {
    if (!this.open) return;

    const calm = angleWindow(0, 1.0, 0.1);
    const gale = angleWindow(WIND.MAX, 1.0, 0.1);
    const pw = powerWindow();

    const slack = calm.width / 2;
    const verdict =
      calm.width < 6
        ? '🔴 BRUTAL — finer than a thumb can hold'
        : calm.width < 8
          ? '🟠 TIGHT — the hand will feel this'
          : '🟢 HUMANE';

    const hit = this.thrown ? `${this.landed}/${this.thrown}` : '—';

    this.readout.textContent = [
      `CALM AIR   swipe within ±${slack.toFixed(1)}°   ${verdict}`,
      `MAX WIND   swipe ${gale.reachable ? `${gale.lo.toFixed(0)}°..${gale.hi.toFixed(0)}°` : 'UNBEATABLE 🔴'}   (${gale.width.toFixed(1)}° of slack)`,
      `POWER      ${((pw.lo - 1) * 100).toFixed(0)}% .. +${((pw.hi - 1) * 100).toFixed(0)}%`,
      ``,
      `this session   ${hit} landed`,
    ].join('\n');
  }

  /** Call from Play on every landing, so felt difficulty sits beside predicted difficulty. */
  recordThrow(landedIn: boolean): void {
    this.thrown++;
    if (landedIn) this.landed++;
    this.refresh();
  }

  private defaultOf(k: Knob): number {
    let node: unknown = DEFAULTS;
    for (const seg of k.path) {
      if (!node || typeof node !== 'object') return NaN;
      node = (node as Record<string, unknown>)[seg];
    }
    return typeof node === 'number' ? node : NaN;
  }

  // ---- persistence -------------------------------------------------------

  private static KEY = 'ballot-waste.tuning';

  private save(): void {
    localStorage.setItem(
      TuningPanel.KEY,
      JSON.stringify({ WORLD, BIN, THROW, GESTURE, WIND, SESSION, CAMERA, DEBUG }),
    );
  }

  private load(): void {
    const raw = localStorage.getItem(TuningPanel.KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      deepAssign({ WORLD, BIN, THROW, GESTURE, WIND, SESSION, CAMERA, DEBUG }, saved);
    } catch {
      localStorage.removeItem(TuningPanel.KEY);
    }
  }

  private reset(): void {
    deepAssign({ WORLD, BIN, THROW, GESTURE, WIND, SESSION, CAMERA }, DEFAULTS);
    DEBUG.wind = 0;
    localStorage.removeItem(TuningPanel.KEY);
  }

  private remount(): void {
    this.root.remove();
    document.querySelectorAll('button').forEach((b) => {
      if (b.textContent === 'TUNE' || b.textContent === 'HIDE') b.remove();
    });
    this.open = false;
    this.mount();
  }

  /**
   * Emit the changed values as a paste-ready diff for config.ts.
   *
   * Tuning on a phone is worthless if the numbers die with the browser tab. This
   * is how a session in the hand becomes a commit.
   */
  private copyConfig(): void {
    const d = DEFAULTS as unknown as Record<string, Record<string, unknown>>;
    const lines: string[] = ['// Tuned on device. Paste into src/config.ts.'];

    for (const [group, obj] of Object.entries({ WORLD, BIN, THROW, GESTURE, WIND, SESSION, CAMERA })) {
      for (const [key, live] of Object.entries(obj as unknown as Record<string, unknown>)) {
        const def = d[group]?.[key];
        if (typeof live === 'number' && typeof def === 'number' && Math.abs(live - def) > 1e-9) {
          const deg = key.includes('ANGLE') ? `  // ${(live * DEG).toFixed(1)}°` : '';
          lines.push(`${group}.${key} = ${live};${deg}   // was ${def}`);
        }
      }
    }

    if (lines.length === 1) lines.push('// nothing changed from defaults.');

    const text = lines.join('\n');
    navigator.clipboard?.writeText(text).catch(() => undefined);
    this.readout.textContent = `${text}\n\n(copied to clipboard)`;
  }
}

/** Overwrite live values in place, so every module holding a reference sees them. */
function deepAssign(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(source)) {
    const t = target[k];
    if (v && typeof v === 'object' && t && typeof t === 'object') {
      deepAssign(t as Record<string, unknown>, v as Record<string, unknown>);
    } else if (typeof v === 'number' && typeof t === 'number') {
      target[k] = v;
    }
  }
}

/**
 * One panel for the app. Play calls `panel.recordThrow(...)` unconditionally; if
 * the panel was never mounted, `refresh()` returns early and it costs nothing.
 */
export const panel = new TuningPanel();
