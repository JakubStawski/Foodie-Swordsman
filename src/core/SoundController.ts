import { Howl, Howler } from "howler";
import { SoundDef, SfxConfig } from "./types";

/**
 * Sound ids used by the game. Add a matching entry in sfx.json when the file exists.
 * Missing ids are ignored by play() so SFX can be dropped in later.
 */
export const SOUND = {
    BG: "bg",
    CATCH: "catch",
    MISS: "miss",
    SLASH: "slash",
    CLICK: "click",
    COUNTDOWN: "countdown",
    LOSE_BG: "lose_bg",
} as const;

const MUTED_KEY = "foodie-swordsman.muted";

/**
 * Howler-backed audio: load from sfx.json, play one-shots, loop music, mute.
 */
export class SoundController {
    private readonly _howls = new Map<string, Howl>();
    private readonly _defs = new Map<string, SoundDef>();
    private readonly _playIds = new Map<string, number>();
    private readonly _variantIds = new Map<string, string[]>();
    private readonly _lastVariant = new Map<string, string>();
    private _muted = false;
    private _unlockBound = false;

    /**
     * Create Howls from config. Failed files are skipped so missing SFX do not block startup.
     * @param config sound id → Howl options
     */
    public async load(config: SfxConfig): Promise<void> {
        Howler.unload();
        this._howls.clear();
        this._defs.clear();
        this._playIds.clear();
        this._variantIds.clear();
        this._lastVariant.clear();

        this._muted = this._readMuted();
        Howler.autoUnlock = true;
        Howler.mute(this._muted);

        await Promise.all(Object.entries(config).map(([id, def]) => this._register(id, def)));
        this._bindUnlock();
    }

    /**
     * Play a sound. Looping tracks reuse a single instance; SFX spawn a new one.
     * Variant groups pick a random clip and skip the one that just played.
     * @param id key from sfx.json
     * @param sprite optional sprite name
     * @returns Howler playback id, or undefined when the sound is not loaded
     */
    public play(id: string, sprite?: string): number | undefined {
        return this._playHowl(this._pickVariant(id) ?? id, sprite);
    }

    /**
     * Stop a sound and drop its stored playback id.
     * @param id key from sfx.json
     */
    public stop(id: string): void {
        for (const howlId of this._howlIds(id)) {
            this._howls.get(howlId)?.stop();
            this._playIds.delete(howlId);
        }
    }

    /**
     * Pause a looping track (or every instance if no playback id is stored).
     * @param id key from sfx.json
     */
    public pause(id: string): void {
        for (const howlId of this._howlIds(id)) {
            const howl = this._howls.get(howlId);
            if (!howl) {
                continue;
            }

            const playId = this._playIds.get(howlId);
            if (playId !== undefined) {
                howl.pause(playId);
                continue;
            }

            howl.pause();
        }
    }

    /**
     * Resume a paused looping track, or start it if it never began.
     * @param id key from sfx.json
     */
    public resume(id: string): void {
        const ids = this._howlIds(id);
        let resumed = false;

        for (const howlId of ids) {
            const howl = this._howls.get(howlId);
            const playId = this._playIds.get(howlId);
            if (!howl || playId === undefined) {
                continue;
            }

            howl.play(playId);
            resumed = true;
        }

        if (!resumed) {
            this.play(id);
        }
    }

    /**
     * Fade a sound to a volume.
     * @param id key from sfx.json
     * @param to target volume 0–1
     * @param duration fade length in ms
     */
    public fadeTo(id: string, to: number, duration = 400): void {
        for (const howlId of this._howlIds(id)) {
            const howl = this._howls.get(howlId);
            if (!howl) {
                continue;
            }

            const from = Number(howl.volume());
            if (duration <= 0 || Number.isNaN(from) || !howl.playing()) {
                howl.volume(to);
                continue;
            }

            howl.fade(from, to, duration, this._playIds.get(howlId));
        }
    }

    /**
     * Quiet a track relative to its config volume.
     * @param id key from sfx.json
     * @param factor multiply by config volume, 0–1
     * @param duration fade length in ms
     */
    public duck(id: string, factor = 0.2, duration = 500): void {
        this.fadeTo(id, this._baseVolume(id) * factor, duration);
    }

    /**
     * Return a track to the volume from sfx.json.
     * @param id key from sfx.json
     * @param duration fade length in ms
     */
    public restoreVolume(id: string, duration = 500): void {
        this.fadeTo(id, this._baseVolume(id), duration);
    }

    /**
     * Set volume for one sound.
     * @param id key from sfx.json
     * @param volume 0–1
     */
    public setVolume(id: string, volume: number): void {
        for (const howlId of this._howlIds(id)) {
            this._howls.get(howlId)?.volume(volume);
        }
    }

    /**
     * Mute or unmute every Howl.
     * @param muted whether audio should be silent
     */
    public setMuted(muted: boolean): void {
        this._muted = muted;
        Howler.mute(muted);
        this._writeMuted(muted);
    }

    /**
     * Flip the global mute flag.
     * @returns the new muted state
     */
    public toggleMuted(): boolean {
        this.setMuted(!this._muted);
        return this._muted;
    }

    public get muted(): boolean {
        return this._muted;
    }

    /**
     * Whether this id currently has an active playback.
     * @param id key from sfx.json
     */
    public isPlaying(id: string): boolean {
        return this._howlIds(id).some((howlId) => {
            const howl = this._howls.get(howlId);
            if (!howl) {
                return false;
            }

            const playId = this._playIds.get(howlId);
            return playId !== undefined ? howl.playing(playId) : howl.playing();
        });
    }

    /**
     * Start (or keep) the looping background track.
     * @param id looping sound id, defaults to bg
     */
    public startMusic(id = SOUND.BG): void {
        this.play(id);
    }

    /**
     * Stop every registered Howl.
     */
    public stopAll(): void {
        for (const [id, howl] of this._howls) {
            howl.stop();
            this._playIds.delete(id);
        }
    }

    /**
     * Register one Howl, or a random-pick group when `variants` is set.
     * @param id sound id
     * @param def Howl options from sfx.json
     */
    private async _register(id: string, def: SoundDef): Promise<void> {
        this._defs.set(id, def);

        if (def.variants && def.variants.length > 0) {
            const variantIds = def.variants.map((_, index) => `${id}:${index}`);
            this._variantIds.set(id, variantIds);
            await Promise.all(
                def.variants.map((src, index) => this._registerHowl(variantIds[index], { ...def, src })),
            );
            return;
        }

        if (!def.src) {
            console.warn(`[sound] "${id}" has no src or variants`);
            return;
        }

        await this._registerHowl(id, def);
    }

    /**
     * Create a Howl and wait until it loads or fails.
     * @param id howl id
     * @param def Howl options
     */
    private _registerHowl(id: string, def: SoundDef): Promise<void> {
        const src = def.src === undefined ? [] : Array.isArray(def.src) ? def.src : [def.src];

        return new Promise((resolve) => {
            const howl = new Howl({
                src,
                loop: def.loop ?? false,
                volume: def.volume ?? 1,
                html5: def.html5 ?? false,
                sprite: def.sprite,
                rate: def.rate,
                autoplay: false,
                onload: () => resolve(),
                onloaderror: (_soundId, error) => {
                    console.warn(`[sound] failed to load "${id}"`, error);
                    this._howls.delete(id);
                    resolve();
                },
            });

            this._howls.set(id, howl);
        });
    }

    /**
     * Play a single Howl instance.
     * @param id howl id
     * @param sprite optional sprite name
     */
    private _playHowl(id: string, sprite?: string): number | undefined {
        const howl = this._howls.get(id);
        if (!howl) {
            return undefined;
        }

        if (this._isLoop(id)) {
            return this._playLoop(howl, id);
        }

        return sprite !== undefined ? howl.play(sprite) : howl.play();
    }

    /**
     * Start a looping track once. Later play/unlock/resume reuse the same Howl id
     * so a blocked autoplay does not spawn a second overlapping copy.
     * @param howl looping Howl
     * @param id howl id
     */
    private _playLoop(howl: Howl, id: string): number {
        const existing = this._playIds.get(id);
        if (existing !== undefined) {
            if (!howl.playing(existing)) {
                howl.play(existing);
            }
            return existing;
        }

        howl.stop();
        const playId = howl.play();
        this._playIds.set(id, playId);
        return playId;
    }

    /**
     * Pick a random loaded variant, skipping the clip that just played.
     * @param id group id from sfx.json
     */
    private _pickVariant(id: string): string | undefined {
        const loaded = this._variantIds.get(id)?.filter((variantId) => this._howls.has(variantId));
        if (!loaded || loaded.length === 0) {
            return undefined;
        }

        const last = this._lastVariant.get(id);
        const pool = loaded.length > 1 && last !== undefined ? loaded.filter((variantId) => variantId !== last) : loaded;
        const picked = pool[Math.floor(Math.random() * pool.length)];
        this._lastVariant.set(id, picked);
        return picked;
    }

    /**
     * Howl ids owned by this config key (itself, or every variant).
     * @param id key from sfx.json
     */
    private _howlIds(id: string): string[] {
        return this._variantIds.get(id) ?? [id];
    }

    /**
     * Browsers block audio until a gesture. Retry looping tracks on first input.
     */
    private _bindUnlock(): void {
        if (this._unlockBound) {
            return;
        }

        this._unlockBound = true;

        const unlock = (): void => {
            this._playLooping();
            window.removeEventListener("pointerdown", unlock);
            window.removeEventListener("keydown", unlock);
        };

        window.addEventListener("pointerdown", unlock);
        window.addEventListener("keydown", unlock);
    }

    /**
     * Start the main background track after the first gesture.
     */
    private _playLooping(): void {
        this.startMusic();
    }

    private _baseVolume(id: string): number {
        return this._defs.get(id)?.volume ?? 1;
    }

    private _isLoop(id: string): boolean {
        return this._defs.get(id)?.loop === true;
    }

    private _readMuted(): boolean {
        try {
            return localStorage.getItem(MUTED_KEY) === "1";
        } catch {
            return false;
        }
    }

    private _writeMuted(muted: boolean): void {
        try {
            localStorage.setItem(MUTED_KEY, muted ? "1" : "0");
        } catch {
            // Storage can be unavailable; keep the in-memory flag anyway.
        }
    }
}

export const soundController = new SoundController();
