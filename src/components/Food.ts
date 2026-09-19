import { ColorMatrixFilter, Container, Graphics, SCALE_MODES, Sprite, Texture } from "pixi.js";
import { sliceFrames, type SpriteSheetLayout } from "../utils/animations";

/** Sprite sheet layout for food.png (8×8 grid of 16×16 icons) */
const SHEET_LAYOUT: SpriteSheetLayout = {
    cols: 8,
    frameWidth: 16,
    frameHeight: 16,
};
const FRAME_COUNT = 64;

const DISPLAY_SCALE = 2.5;
const FALL_SPEED = 1.6;
const PULSE_SPEED = 0.1;
const PULSE_AMOUNT = 0.07;

const HIT_FLASH_DURATION = 4;
const HIT_FADE_DURATION = 18;
const MISS_FLASH_DURATION = 4;
const MISS_FADE_DURATION = 18;
const MISS_SHAKE_MAGNITUDE = 2;
const MISS_TINT = 0xff2a2a;
const PARTICLE_COUNT = 14;
const PARTICLE_SIZE = 3;
const PARTICLE_GRAVITY = 0.12;
const PARTICLE_COLOR = 0xffffff;

type PixelParticle = {
    graphic: Graphics;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
};

/**
 * Single falling food item from the food spritesheet.
 * Idle: gentle scale pulse.
 * Hit: brief white flash.
 * Miss: brief red tint + local shake.
 */
export class Food extends Container {
    private static _frames: Texture[] | null = null;

    private readonly _sprite: Sprite;
    private readonly _whiteFilter: ColorMatrixFilter;
    private readonly _particles: PixelParticle[] = [];
    private readonly _fallSpeed: number;
    private readonly _baseScale: number;

    private _pulseTime = Math.random() * Math.PI * 2;
    private _isHit = false;
    private _isMissed = false;
    private _hitElapsed = 0;
    private _missElapsed = 0;
    private _done = false;

    constructor(sheet: Texture, fallSpeed = FALL_SPEED) {
        super();

        const frames = Food._getFrames(sheet);
        const texture = frames[Math.floor(Math.random() * frames.length)];

        texture.baseTexture.scaleMode = SCALE_MODES.NEAREST;
        this._sprite = new Sprite(texture);
        this._sprite.anchor.set(0.5);
        this._sprite.roundPixels = true;
        this._baseScale = DISPLAY_SCALE;
        this._sprite.scale.set(this._baseScale);
        this.addChild(this._sprite);

        this._fallSpeed = fallSpeed;

        this._whiteFilter = new ColorMatrixFilter();
        this._whiteFilter.padding = 0;
        // Force opaque pixels to pure white (alpha unchanged)
        this._whiteFilter.matrix = [
            0, 0, 0, 0, 1,
            0, 0, 0, 0, 1,
            0, 0, 0, 0, 1,
            0, 0, 0, 1, 0,
        ];
    }

    /**
     * Trigger hit reaction: brief white flash + pixel particles, then darken.
     */
    public hit(): void {
        if (this._isHit || this._isMissed || this._done) {
            return;
        }

        this._isHit = true;
        this._hitElapsed = 0;
        this._sprite.scale.set(this._baseScale);
        this._sprite.position.set(0, 0);
        this._sprite.tint = 0xffffff;
        this._sprite.alpha = 1;
        this._sprite.filters = [this._whiteFilter];
        this._spawnParticles();
    }

    /**
     * Trigger miss reaction: brief red tint + local shake, then darken.
     */
    public miss(): void {
        if (this._isHit || this._isMissed || this._done) {
            return;
        }

        this._isMissed = true;
        this._missElapsed = 0;
        this._sprite.scale.set(this._baseScale);
        this._sprite.filters = null;
        this._sprite.tint = MISS_TINT;
        this._sprite.alpha = 1;
    }

    /**
     * Advance fall / idle pulse / hit particles.
     * @param delta ticker delta time
     */
    public update(delta: number): void {
        if (this._done) {
            return;
        }

        if (this._isHit) {
            this._updateHit(delta);
            return;
        }

        if (this._isMissed) {
            this._updateMiss(delta);
            return;
        }

        this.y += this._fallSpeed * delta;
        this._pulseTime += PULSE_SPEED * delta;
        const pulse = 1 + Math.sin(this._pulseTime) * PULSE_AMOUNT;
        this._sprite.scale.set(this._baseScale * pulse);
    }

    /**
     * Update the hit animation.
     * @param delta 
     */
    private _updateHit(delta: number): void {
        this._hitElapsed += delta;

        if (this._hitElapsed < HIT_FLASH_DURATION) {
            this._sprite.filters = [this._whiteFilter];
            this._sprite.tint = 0xffffff;
            this._sprite.alpha = 1;
        } else {
            this._sprite.filters = null;
            const t = Math.min(1, (this._hitElapsed - HIT_FLASH_DURATION) / HIT_FADE_DURATION);
            const shade = Math.round(255 * (1 - t * 0.8));
            this._sprite.tint = (shade << 16) | (shade << 8) | shade;
            this._sprite.alpha = 1 - t;
        }

        for (let i = this._particles.length - 1; i >= 0; i--) {
            const p = this._particles[i];
            p.life -= delta;
            p.vy += PARTICLE_GRAVITY * delta;
            p.graphic.x += p.vx * delta;
            p.graphic.y += p.vy * delta;
            p.graphic.alpha = Math.max(0, p.life / p.maxLife);

            if (p.life <= 0) {
                this.removeChild(p.graphic);
                p.graphic.destroy();
                this._particles.splice(i, 1);
            }
        }

        const fadeDone = this._hitElapsed >= HIT_FLASH_DURATION + HIT_FADE_DURATION;
        if (fadeDone && this._particles.length === 0) {
            this._done = true;
        }
    }

    /**
     * Update the miss animation.
     * @param delta 
     */
    private _updateMiss(delta: number): void {
        this._missElapsed += delta;

        if (this._missElapsed < MISS_FLASH_DURATION) {
            this._sprite.tint = MISS_TINT;
            this._sprite.alpha = 1;
        } else {
            const t = Math.min(1, (this._missElapsed - MISS_FLASH_DURATION) / MISS_FADE_DURATION);
            const shade = Math.round(255 * (1 - t * 0.8));
            this._sprite.tint = (shade << 16) | (shade << 8) | shade;
            this._sprite.alpha = 1 - t;
        }

        const shakeT = Math.max(
            0,
            1 - this._missElapsed / (MISS_FLASH_DURATION + MISS_FADE_DURATION),
        );
        const mag = MISS_SHAKE_MAGNITUDE * shakeT;
        this._sprite.x = Math.round((Math.random() * 2 - 1) * mag);
        this._sprite.y = Math.round((Math.random() * 2 - 1) * mag);

        if (this._missElapsed >= MISS_FLASH_DURATION + MISS_FADE_DURATION) {
            this._sprite.position.set(0, 0);
            this._done = true;
        }
    }

    /**
     * Spawn the hit particles.
     */
    private _spawnParticles(): void {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const graphic = new Graphics();
            graphic.beginFill(PARTICLE_COLOR);
            graphic.drawRect(-PARTICLE_SIZE / 2, -PARTICLE_SIZE / 2, PARTICLE_SIZE, PARTICLE_SIZE);
            graphic.endFill();

            const angle = Math.random() * Math.PI * 2;
            const speed = 1.2 + Math.random() * 2.4;
            const life = 10 + Math.random() * 12;

            this.addChild(graphic);
            this._particles.push({
                graphic,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1.5,
                life,
                maxLife: life,
            });
        }
    }

    /**
     * Get the frames for the food sprite sheet.
     * @param sheet the sprite sheet
     * @returns the frames
     */
    private static _getFrames(sheet: Texture): Texture[] {
        if (!Food._frames) {
            Food._frames = sliceFrames(sheet, 0, FRAME_COUNT - 1, SHEET_LAYOUT);
        }
        return Food._frames;
    }

    /** Whether the hit animation is currently playing. */
    public get isHit(): boolean {
        return this._isHit;
    }

    /** Whether the miss animation is currently playing. */
    public get isMissed(): boolean {
        return this._isMissed;
    }

    /** Whether the hit / miss animation finished — safe to remove from stage. */
    public get isDone(): boolean {
        return this._done;
    }
}
