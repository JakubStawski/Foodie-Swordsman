import { Container, Rectangle, SCALE_MODES, Sprite, Text, TextStyle, Texture, Ticker } from "pixi.js";
import { SOUND, soundController } from "../core/SoundController";

const FONT_SIZE = 24;
const DISPLAY_WIDTH = 220;
const TEXT_INSET = 62;
const HOVER_SCALE = 1.08;
const PRESS_SCALE = 0.96;
const LERP = 0.18;

/** Vertical distance between stacked button centers. */
export const BUTTON_GAP = 88;

/**
 * Wooden plaque button: sprite background with a white Pixelify Sans label.
 */
export class Button extends Container {
    private readonly _bg: Sprite;
    private readonly _label: Text;
    private _hovered = false;
    private _pressed = false;
    private _scaleCurrent = 1;

    constructor(text: string, fontFamily: string, texture: Texture, onClick?: () => void) {
        super();
        this.name = "Button";

        this._bg = new Sprite(texture);
        this._bg.anchor.set(0.5);
        this._bg.roundPixels = true;
        this._bg.scale.set(DISPLAY_WIDTH / texture.width);

        this._label = new Text(
            text,
            new TextStyle({
                fontFamily,
                fontSize: FONT_SIZE,
                fill: 0xffffff,
                align: "center",
                padding: 8,
            }),
        );
        this._label.anchor.set(0.5);
        this._label.roundPixels = true;
        this._label.texture.baseTexture.scaleMode = SCALE_MODES.NEAREST;
        this._fitLabel();

        this.addChild(this._bg, this._label);

        this.eventMode = "static";
        this.cursor = "pointer";
        this.hitArea = new Rectangle(
            -this._bg.width / 2,
            -this._bg.height / 2,
            this._bg.width,
            this._bg.height,
        );

        this.on("pointerover", this._onOver);
        this.on("pointerout", this._onOut);
        this.on("pointerdown", this._onDown);
        this.on("pointerup", this._onUp);
        this.on("pointerupoutside", this._onUpOutside);

        this.on("pointertap", () => {
            soundController.play(SOUND.CLICK);
            onClick?.();
        });

        Ticker.shared.add(this._tick);
    }

    public override destroy(options?: Parameters<Container["destroy"]>[0]): void {
        Ticker.shared.remove(this._tick);
        super.destroy(options);
    }

    public get text(): string {
        return this._label.text;
    }

    public set text(value: string) {
        this._label.text = value;
        this._label.style.fontSize = FONT_SIZE;
        this._fitLabel();
    }

    /**
     * Shrink the label if it would overlap the leafy ends of the plaque.
     */
    private _fitLabel(): void {
        const maxWidth = this._bg.width - TEXT_INSET;
        if (this._label.width > maxWidth) {
            this._label.style.fontSize = Math.floor(FONT_SIZE * (maxWidth / this._label.width));
        }
    }

    private readonly _onOver = (): void => {
        this._hovered = true;
        soundController.play(SOUND.CLICK);
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
