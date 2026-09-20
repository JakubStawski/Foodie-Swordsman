import { Container, SCALE_MODES, Sprite, Text, TextStyle, Texture } from "pixi.js";

const ICON_SIZE_RATIO = 6;
const PULSE_SPEED = 0.04;
const TEXT_PULSE_AMOUNT = 0.04;
const SWORD_PULSE_AMOUNT = 0.02;

/**
 * Game title rendered as two-line outlined pixel text over a sword icon.
 */
export class Logo extends Container {
    private readonly _label: Text;
    private readonly _icon: Sprite;
    private _pulseTime = 0;

    constructor(fontFamily: string, swordTexture: Texture) {
        super();
        this.name = "Logo";

        this._label = new Text(
            "Foodie\nSwordsman",
            new TextStyle({
                fontFamily,
                fontSize: 56,
                fill: 0xffffff,
                stroke: 0x132722,
                strokeThickness: 6,
                align: "center",
                lineJoin: "round",
                padding: 12,
                lineHeight: 56,
            }),
        );
        this._label.anchor.set(0.5, 0);
        this._label.roundPixels = true;
        this._label.texture.baseTexture.scaleMode = SCALE_MODES.NEAREST;

        this._icon = new Sprite(swordTexture);
        this._icon.anchor.set(0.5);
        this._icon.scale.set(ICON_SIZE_RATIO);
        this._icon.y = this._label.height / 2;
        this._icon.rotation = -Math.PI / 8;
        this._icon.roundPixels = true;

        this.addChild(this._icon, this._label);
    }

    /**
     * Pulse the title and sword on the same cycle; the text scales more.
     * @param delta ticker delta time
     */
    public update(delta: number): void {
        this._pulseTime += PULSE_SPEED * delta;
        const wave = Math.sin(this._pulseTime);
        this._label.scale.set(1 + wave * TEXT_PULSE_AMOUNT);
        this._icon.scale.set(ICON_SIZE_RATIO * (1 + wave * SWORD_PULSE_AMOUNT));
    }
}
