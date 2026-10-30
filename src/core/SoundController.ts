import { Howl, Howler } from "howler";
import { assetUrl } from "../utils/assetUrl";
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
    private _unlockArmed = false;
    private _unlockKick: (() => void) | undefined;
    /** Config id of the looping track that currently owns the music slot. */
    private _musicId: string | undefined;
    /** Game pause: keep the slot, but do not start or resume it. */
    private _musicPaused = false;
    /**
     * A looping play() was sent to Howler and has not become audible yet.
     * A second play() in this window stacks another AudioBufferSourceNode,
     * and stop() cannot see the leaked one.
     */
    private _musicStarting = false;

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
        this._musicId = undefined;
        this._musicPaused = false;
        this._musicStarting = false;
        this._disarmMusicUnlock();

        this._muted = this._readMuted();
        Howler.autoUnlock = true;
        Howler.mute(this._muted);

        await Promise.all(Object.entries(config).map(([id, def]) => this._register(id, def)));
        this._bindUnlock();
    }

    /**
     * Play a sound. Looping tracks share one music slot (one track, one instance);
     * SFX spawn a new one. Variant groups pick a random clip and skip the last.
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
        const stopsSlot = this._ownsMusicSlot(id);

        for (const howlId of this._howlIds(id)) {
            this._silence(howlId);
        }

        if (stopsSlot) {
            this._musicId = undefined;
            this._musicPaused = false;
            this._musicStarting = false;
        }
    }

    /**
     * Pause a looping track (or every instance if no playback id is stored).
     * @param id key from sfx.json
     */
    public pause(id: string): void {
        if (this._ownsMusicSlot(id)) {
            this._musicPaused = true;
            this._musicStarting = false;
            if (!this._audioReady()) {
                return;
            }
        }

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
        if (this._ownsMusicSlot(id)) {
            this._musicPaused = false;
            this._flushMusic();
            return;
        }

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
     * Start (or keep) a looping track. Stops any other music first.
     * @param id looping sound id, defaults to bg
     */
    public startMusic(id = SOUND.BG): void {
        this.play(id);
    }

    /**
     * Stop every registered Howl.
     */
    public stopAll(): void {
        for (const id of this._howls.keys()) {
            this._silence(id);
        }
        this._musicId = undefined;
        this._musicPaused = false;
        this._musicStarting = false;
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
        const rawSrc = def.src === undefined ? [] : Array.isArray(def.src) ? def.src : [def.src];
        const src = rawSrc.map(assetUrl);

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
            return this._playLoop(id);
        }

        return sprite !== undefined ? howl.play(sprite) : howl.play();
    }

    /**
     * Switch the music slot to this looping track. Other loops stop.
     * A track that is already starting or audible is left alone so play() cannot stack.
     * @param id howl id
     */
    private _playLoop(id: string): number | undefined {
        this._stopOtherMusic(id);

        const already = this._musicId === id && (this._musicStarting || this._isHowlPlaying(id));
        this._musicId = id;
        this._musicPaused = false;

        if (!already) {
            this._musicStarting = false;
            this._flushMusic();
        }

        return this._playIds.get(id);
    }

    /**
     * Start the current music slot once, after the AudioContext is actually running.
     * Howler queues play() while the context is locked and a second play() there
     * leaks a buffer source that stop() never reaches.
     */
    private _flushMusic(): void {
        const id = this._musicId;
        if (!id || this._musicPaused || this._musicStarting) {
            return;
        }

        if (!this._audioReady()) {
            this._armMusicUnlock();
            return;
        }

        const howl = this._howls.get(id);
        if (!howl || this._isHowlPlaying(id)) {
            return;
        }

        this._musicStarting = true;
        const playId = this._playIds.get(id);
        const started = playId !== undefined ? howl.play(playId) : howl.play();

        if (typeof started === "number") {
            this._playIds.set(id, started);
        } else if (playId !== undefined) {
            this._playIds.delete(id);
            const fresh = howl.play();
            if (typeof fresh === "number") {
                this._playIds.set(id, fresh);
            }
        }

        if (this._isHowlPlaying(id)) {
            this._musicStarting = false;
            return;
        }

        const token = id;
        const done = (): void => {
            if (this._musicId === token) {
                this._musicStarting = false;
            }
        };
        howl.once("play", done);
        howl.once("playerror", done);
    }

    /**
     * True when Howler will run play()/stop() now, instead of queueing them behind the unlock.
     */
    private _audioReady(): boolean {
        return Howler.state === "running" && Howler.ctx?.state === "running";
    }

    /**
     * Whether any instance of this Howl is audible. Used to refuse a second music start.
     * @param id howl id
     */
    private _isHowlPlaying(id: string): boolean {
        return this._howls.get(id)?.playing() ?? false;
    }

    /**
     * True when this config id is the looping track in the music slot.
     * @param id key from sfx.json
     */
    private _ownsMusicSlot(id: string): boolean {
        return this._musicId !== undefined && (this._musicId === id || this._howlIds(id).includes(this._musicId));
    }

    /**
     * Stop one Howl and forget its playback id.
     * Skipped until the context is running so a queued stop cannot fire after the next play().
     * @param id howl id
     */
    private _silence(id: string): void {
        const howl = this._howls.get(id);
        this._playIds.delete(id);

        if (!howl || !this._audioReady()) {
            return;
        }

        try {
            howl.stop();
        } catch {
            // A buffer that already ended throws on stop(); the slot is still free.
        }
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
     * Browsers block audio until a gesture. The first input flushes the music slot once.
     */
    private _bindUnlock(): void {
        if (this._unlockBound) {
            return;
        }

        this._unlockBound = true;
        this._armMusicUnlock();
    }

    /**
     * After the next gesture, start the music slot once the AudioContext is running.
     */
    private _armMusicUnlock(): void {
        if (this._unlockArmed) {
            return;
        }

        this._unlockArmed = true;

        const kick = (): void => {
            let frames = 0;

            const poll = (): void => {
                if (!this._unlockArmed) {
                    return;
                }

                if (this._audioReady()) {
                    this._disarmMusicUnlock();
                    this._flushMusic();
                    return;
                }

                frames += 1;
                if (frames < 180) {
                    requestAnimationFrame(poll);
                }
            };

            requestAnimationFrame(poll);
        };

        this._unlockKick = kick;
        window.addEventListener("pointerdown", kick);
        window.addEventListener("keydown", kick);
        window.addEventListener("click", kick);
    }

    /**
     * Drop the gesture listeners. Safe to call before they exist.
     */
    private _disarmMusicUnlock(): void {
        const kick = this._unlockKick;
        if (kick) {
            window.removeEventListener("pointerdown", kick);
            window.removeEventListener("keydown", kick);
            window.removeEventListener("click", kick);
        }

        this._unlockKick = undefined;
        this._unlockArmed = false;
    }

    /**
     * Stop every looping track except the one that should keep playing.
     * @param keepId looping sound that stays in the music slot
     */
    private _stopOtherMusic(keepId: string): void {
        for (const id of this._howls.keys()) {
            if (id === keepId || !this._isLoop(id)) {
                continue;
            }

            this._silence(id);
        }
    }

    private _baseVolume(id: string): number {
        return this._defs.get(id)?.volume ?? 1;
    }

    private _isLoop(id: string): boolean {
        if (this._defs.get(id)?.loop === true) {
            return true;
        }

        return this._howls.get(id)?.loop() === true;
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
