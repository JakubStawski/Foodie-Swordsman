import { Container, Graphics, Rectangle, Sprite, Texture, Ticker } from "pixi.js";
import { DESIGN_HEIGHT, DESIGN_WIDTH } from "../core/App";
import { SOUND, soundController } from "../core/SoundController";

const FRAME = 32;
const DISPLAY_SCALE = 2;
const DISPLAY_SIZE = FRAME * DISPLAY_SCALE;
const MARGIN = 16;
const HOVER_SCALE = 1.08;
const PRESS_SCALE = 0.96;
const LERP = 0.18;
const MUTED_TINT = 0x888888;
const LIVE_TINT = 0xffffff;

/**
 * Persistent speaker toggle in the bottom-right corner. Mutes every Howl
 * and keeps the choice in localStorage through SoundController.
 */
export class MusicButton extends Container {
    private readonly _icon: Sprite;
    private readonly _slash: Graphics;
    private _hovered = false;
    private _pressed = false;
    private _scaleCurrent = 1;

    constructor(texture: Texture) {
        super();
        this.name = "MusicButton";

        this._icon = new Sprite(texture);
        this._icon.anchor.set(0.5);
        this._icon.roundPixels = true;
        this._icon.scale.set(DISPLAY_SCALE);

        this._slash = new Graphics();
        this._drawSlash();

        this.addChild(this._icon, this._slash);

        const half = DISPLAY_SIZE / 2;
        this.position.set(DESIGN_WIDTH - MARGIN - half, DESIGN_HEIGHT - MARGIN - half);
        this.eventMode = "static";
        this.cursor = "pointer";
        this.hitArea = new Rectangle(-half, -half, DISPLAY_SIZE, DISPLAY_SIZE);

        this.on("pointerover", this._onOver);
        this.on("pointerout", this._onOut);
        this.on("pointerdown", this._onDown);
        this.on("pointerup", this._onUp);
        this.on("pointerupoutside", this._onUpOutside);
        this.on("pointertap", this._onTap);

        this._syncVisual();
        Ticker.shared.add(this._tick);
    }

    public override destroy(options?: Parameters<Container["destroy"]>[0]): void {
        Ticker.shared.remove(this._tick);
        super.destroy(options);
    }

    /**
     * Pixel slash over the speaker while audio is off.
     */
    private _drawSlash(): void {
        const half = DISPLAY_SIZE / 2 - 8;

        this._slash.lineStyle({ width: 6, color: 0x0a1f14, cap: "square" });
        this._slash.moveTo(-half, half);
        this._slash.lineTo(half, -half);
        this._slash.lineStyle({ width: 3, color: 0xe23b3b, cap: "square" });
        this._slash.moveTo(-half, half);
        this._slash.lineTo(half, -half);
    }

    private readonly _onTap = (): void => {
        if (soundController.muted) {
            soundController.setMuted(false);
            soundController.play(SOUND.CLICK);
        } else {
            soundController.play(SOUND.CLICK);
            soundController.setMuted(true);
        }

        this._syncVisual();
    };

    private _syncVisual(): void {
        const muted = soundController.muted;
        this._slash.visible = muted;
        this._icon.tint = muted ? MUTED_TINT : LIVE_TINT;
    }

    private readonly _onOver = (): void => {
        this._hovered = true;
    };

    private readonly _onOut = (): void => {
        this._hovered = false;
        this._pressed = false;
    };

    private readonly _onDown = (): void => {
        this._pressed = true;
    };

    private readonly _onUp = (): void => {
        this._pressed = false;
    };

    private readonly _onUpOutside = (): void => {
        this._pressed = false;
        this._hovered = false;
    };

    private readonly _tick = (delta: number): void => {
        const targetScale = this._pressed ? PRESS_SCALE : this._hovered ? HOVER_SCALE : 1;

        if (!this._hovered && !this._pressed && this._scaleCurrent === 1) {
            return;
        }

        const t = Math.min(1, LERP * delta);
        this._scaleCurrent += (targetScale - this._scaleCurrent) * t;

        if (Math.abs(this._scaleCurrent - targetScale) < 0.001) {
            this._scaleCurrent = targetScale;
        }

        this.scale.set(this._scaleCurrent);
    };
}
