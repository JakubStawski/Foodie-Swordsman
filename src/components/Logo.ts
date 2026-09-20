import { Container, SCALE_MODES, Sprite, Text, TextStyle, Texture } from "pixi.js";
import { sliceFrames, type SpriteSheetLayout } from "../utils/animations";

/** Same grid as Character: character_bitmap.png. */
const SHEET_LAYOUT: SpriteSheetLayout = {
    cols: 8,
    frameWidth: 84,
    frameHeight: 84,
};

/** Slash pose on the character sheet (0-based, left-to-right, top-to-bottom). */
const LOGO_FRAME = 28;
const ICON_SCALE = 2;
const PULSE_SPEED = 0.04;
const TEXT_PULSE_AMOUNT = 0.04;
const ICON_PULSE_AMOUNT = 0.02;

/**
 * Game title rendered as two-line outlined pixel text over the knight slash pose.
 */
export class Logo extends Container {
    private readonly _label: Text;
    private readonly _icon: Sprite;
    private _pulseTime = 0;

    constructor(fontFamily: string, characterSheet: Texture) {
        super();
        this.name = "Logo";

        this._label = new Text(
            "Foodie Swordsman",
            new TextStyle({
                fontFamily,
                fontSize: 36,
                fill: 0xffffff,
                stroke: 0x132722,
                strokeThickness: 6,
                align: "center",
                lineJoin: "round",
                lineHeight: 56,
            }),
        );
        this._label.anchor.set(0.5, 0);
        this._label.y = 30;
        this._label.roundPixels = true;
        this._label.texture.baseTexture.scaleMode = SCALE_MODES.NEAREST;

        this._icon = new Sprite(sliceFrames(characterSheet, LOGO_FRAME, LOGO_FRAME, SHEET_LAYOUT)[0]);
        this._icon.anchor.set(0.5);
        this._icon.scale.set(ICON_SCALE);
        this._icon.y = this._label.height / 2;
        this._icon.roundPixels = true;

        this.addChild(this._icon, this._label);
    }

    /**
     * Pulse the title and knight on the same cycle; the text scales more.
     * @param delta ticker delta time
     */
    public update(delta: number): void {
        this._pulseTime += PULSE_SPEED * delta;
        const wave = Math.sin(this._pulseTime);
        this._label.scale.set(1 + wave * TEXT_PULSE_AMOUNT);
        this._icon.scale.set(ICON_SCALE * (1 + wave * ICON_PULSE_AMOUNT));
    }
}
