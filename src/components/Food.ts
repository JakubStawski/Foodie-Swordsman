import { ColorMatrixFilter, Container, Graphics, Sprite, Texture } from "pixi.js";
import { sliceFrames, type SpriteSheetLayout } from "../utils/animations";
import { BaseTexture, SCALE_MODES } from 'pixi.js';


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

const HIT_FADE_DURATION = 18;
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
 * Idle: gentle scale pulse. Hit: flash white + pixel square particles.
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
    private _hitElapsed = 0;
    private _done = false;

    constructor(sheet: Texture, fallSpeed = FALL_SPEED) {
        super();

        const frames = Food._getFrames(sheet);
        const texture = frames[Math.floor(Math.random() * frames.length)];

        texture.baseTexture.scaleMode = SCALE_MODES.NEAREST;
        this._sprite = new Sprite(texture);
        this._sprite.anchor.set(0.5);
        this._baseScale = DISPLAY_SCALE;
        this._sprite.scale.set(this._baseScale);
        this.addChild(this._sprite);

        this._fallSpeed = fallSpeed;

        this._whiteFilter = new ColorMatrixFilter();
        // Force opaque pixels to pure white (alpha unchanged)
        this._whiteFilter.matrix = [
            0, 0, 0, 0, 1,
            0, 0, 0, 0, 1,
            0, 0, 0, 0, 1,
            0, 0, 0, 1, 0,
        ];
    }

    public get isHit(): boolean {
        return this._isHit;
    }

    /** True after the hit animation finished — safe to remove from stage. */
    public get isDone(): boolean {
        return this._done;
    }

    /**
     * Trigger hit reaction: white flash + pixel particles.
     */
    public hit(): void {
        if (this._isHit || this._done) {
            return;
        }

        this._isHit = true;
        this._hitElapsed = 0;
        this._sprite.scale.set(this._baseScale);
        this._sprite.filters = [this._whiteFilter];
        this._spawnParticles();
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

        this.y += this._fallSpeed * delta;
        this._pulseTime += PULSE_SPEED * delta;
        const pulse = 1 + Math.sin(this._pulseTime) * PULSE_AMOUNT;
        this._sprite.scale.set(this._baseScale * pulse);
    }

    private _updateHit(delta: number): void {
        this._hitElapsed += delta;

        const t = Math.min(1, this._hitElapsed / HIT_FADE_DURATION);
        this._sprite.alpha = 1 - t;

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

        if (t >= 1 && this._particles.length === 0) {
            this._done = true;
            this._sprite.filters = null;
        }
    }

    private _spawnParticles(): void {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const color = PARTICLE_COLOR;
            const graphic = new Graphics();
            graphic.beginFill(color);
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

    private static _getFrames(sheet: Texture): Texture[] {
        if (!Food._frames) {
            Food._frames = sliceFrames(sheet, 0, FRAME_COUNT - 1, SHEET_LAYOUT);
        }
        return Food._frames;
    }
}
