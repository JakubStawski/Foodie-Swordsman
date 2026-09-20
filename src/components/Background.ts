import { Container, Sprite, Texture } from "pixi.js";
import { DESIGN_WIDTH, DESIGN_HEIGHT } from "../core/App";

/** Parallax strength from farthest (bg_01) to nearest (bg_04). Keep small for a subtle shift. */
const PARALLAX_FACTORS = [0.04, 0.08, 0.16, 0.24];

/** Virtual camera speed for menu idle pan, in px per ticker tick. */
const IDLE_PAN_SPEED = 3.2;

/** Vegetation layer (bg_03). Food masks that match its silhouette must track this index. */
export const VEGETATION_LAYER = 2;

type LayerFollower = {
    sprite: Sprite;
    layerIndex: number;
};

/**
 * Layered parallax background shared by the whole app.
 * Idle pan, countdown settle, and in-game follow all drive the same camera focus.
 */
export class Background extends Container {
    private readonly _layers: Sprite[] = [];
    private readonly _baseX: number[] = [];
    private readonly _followers: LayerFollower[] = [];
    private readonly _idleRange: number;
    private _idleFocus = DESIGN_WIDTH / 2;
    private _idleDir = 1;
    private _panFrom = 0;
    private _panTo = 0;
    private _panStartedAt = 0;
    private _panDuration = 0;
    private _panning = false;

    constructor(textures: Texture[]) {
        super();
        this.name = "Background";

        for (const texture of textures) {
            const sprite = new Sprite(texture);

            const coverScale = Math.max(
                DESIGN_WIDTH / texture.width,
                DESIGN_HEIGHT / texture.height,
            );
            sprite.scale.set(Math.ceil(coverScale));

            // Pin to the bottom so the ground layer stays under the character.
            sprite.y = DESIGN_HEIGHT - sprite.height;
            const baseX = (DESIGN_WIDTH - sprite.width) / 2;
            sprite.x = baseX;

            this._baseX.push(baseX);
            this._layers.push(sprite);
            this.addChild(sprite);
        }

        this._idleRange = this._maxIdleOffset();
    }

    /**
     * Sprite laid out like a parallax layer so it stays locked 1:1 with that layer.
     * Parent it anywhere in the same world; update() copies the tracked layer transform.
     * @param texture image matching the layer size
     * @param layerIndex parallax layer to follow (0 = farthest)
     */
    public createTrackingSprite(texture: Texture, layerIndex: number): Sprite {
        const layer = this._layers[layerIndex];
        const sprite = new Sprite(texture);
        sprite.roundPixels = true;
        sprite.scale.copyFrom(layer.scale);
        sprite.position.copyFrom(layer.position);
        this._followers.push({ sprite, layerIndex });
        return sprite;
    }

    /**
     * Slow ping-pong pan for menus: left until the near layer hits its edge, then back.
     * @param delta ticker delta time
     */
    public updateIdle(delta: number): void {
        this._panning = false;
        if (this._idleRange <= 0) {
            return;
        }

        this._idleFocus += this._idleDir * IDLE_PAN_SPEED * delta;
        const min = DESIGN_WIDTH / 2 - this._idleRange;
        const max = DESIGN_WIDTH / 2 + this._idleRange;

        if (this._idleFocus >= max) {
            this._idleFocus = max;
            this._idleDir = -1;
        } else if (this._idleFocus <= min) {
            this._idleFocus = min;
            this._idleDir = 1;
        }

        this.update(this._idleFocus);
    }

    /**
     * Ease the camera from the current focus to a target over a wall-clock duration.
     * @param targetFocus world x to settle on
     * @param durationMs how long the move lasts
     */
    public startPanTo(targetFocus: number, durationMs: number): void {
        this._panFrom = this._idleFocus;
        this._panTo = targetFocus;
        this._panStartedAt = performance.now();
        this._panDuration = Math.max(durationMs, 0);
        this._panning = true;

        if (this._panDuration === 0) {
            this.update(targetFocus);
            this._panning = false;
        }
    }

    /**
     * Advance the countdown settle. No-op when no pan is active.
     */
    public updatePan(): void {
        if (!this._panning) {
            return;
        }

        const t = Math.min(1, (performance.now() - this._panStartedAt) / this._panDuration);
        const eased = t * t * (3 - 2 * t);
        this.update(this._panFrom + (this._panTo - this._panFrom) * eased);

        if (t >= 1) {
            this._panning = false;
        }
    }

    /**
     * Shift layers based on the focus point (here: the character x).
     * Far layers move less than near ones. Offset is clamped so empty edges never show.
     * Stores the focus so idle / pan can resume from the same camera.
     * @param focusX world x to follow
     */
    public update(focusX: number): void {
        this._idleFocus = focusX;
        const offset = focusX - DESIGN_WIDTH / 2;

        for (let i = 0; i < this._layers.length; i++) {
            const layer = this._layers[i];
            const extra = (layer.width - DESIGN_WIDTH) / 2;
            const shift = Math.max(-extra, Math.min(extra, offset * PARALLAX_FACTORS[i]));
            layer.x = Math.round(this._baseX[i] - shift);
        }

        for (const follower of this._followers) {
            const layer = this._layers[follower.layerIndex];
            follower.sprite.scale.copyFrom(layer.scale);
            follower.sprite.position.copyFrom(layer.position);
        }
    }

    /**
     * Largest camera offset before any layer would show empty edges.
     */
    private _maxIdleOffset(): number {
        let range = Infinity;

        for (let i = 0; i < this._layers.length; i++) {
            const extra = (this._layers[i].width - DESIGN_WIDTH) / 2;
            const factor = PARALLAX_FACTORS[i];
            if (factor > 0) {
                range = Math.min(range, extra / factor);
            }
        }

        return Number.isFinite(range) ? range : 0;
    }
}
