import { Container, SCALE_MODES, Text, TextStyle } from "pixi.js";

const FONT_SIZE = 20;
const RISE_SPEED = 0.85;
const DURATION = 32;
const OFFSET_X = 18;
const OFFSET_Y = -14;

/**
 * Tiny "+N" that pops beside a caught food, then drifts up and fades.
 */
export class PointsPopup extends Container {
    private readonly _label: Text;
    private _elapsed = 0;

    constructor(points: number, fontFamily: string) {
        super();
        this.name = "PointsPopup";

        this._label = new Text(
            `+${points}`,
            new TextStyle({
                fontFamily,
                fontSize: FONT_SIZE,
                fill: 0xffffff,
                stroke: 0x132722,
                strokeThickness: 4,
                align: "center",
                lineJoin: "round",
                padding: 6,
            }),
        );
        this._label.anchor.set(0.5);
        this._label.roundPixels = true;
        this._label.texture.baseTexture.scaleMode = SCALE_MODES.NEAREST;
        this.addChild(this._label);
    }

    /**
     * Place the popup next to a food in world space.
     * @param foodX food world x
     * @param foodY food world y
     */
    public placeAt(foodX: number, foodY: number): void {
        this.position.set(Math.round(foodX + OFFSET_X), Math.round(foodY + OFFSET_Y));
    }

    /**
     * Drift up and fade out.
     * @param delta ticker delta time
     */
    public update(delta: number): void {
        this._elapsed += delta;
        this.y -= RISE_SPEED * delta;
        const t = Math.min(1, this._elapsed / DURATION);
        this.alpha = 1 - t;
    }

    /** Whether the popup finished fading — safe to remove. */
    public get isDone(): boolean {
        return this._elapsed >= DURATION;
    }
}
