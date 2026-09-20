import { Container, Rectangle, SCALE_MODES, Text, TextStyle } from "pixi.js";

const FONT_SIZE = 32;

/**
 * Simple text button: white Pixelify Sans label.
 */
export class Button extends Container {
    private readonly _label: Text;

    constructor(text: string, fontFamily: string, onClick?: () => void) {
        super();
        this.name = "Button";

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
        this.addChild(this._label);

        this.eventMode = "static";
        this.cursor = "pointer";
        this._syncHitArea();

        if (onClick) {
            this.on("pointertap", onClick);
        }
    }

    public get text(): string {
        return this._label.text;
    }

    public set text(value: string) {
        this._label.text = value;
        this._syncHitArea();
    }

    /**
     * Hit box in local space, centered on the anchored label.
     */
    private _syncHitArea(): void {
        this.hitArea = new Rectangle(
            -this._label.width / 2,
            -this._label.height / 2,
            this._label.width,
            this._label.height,
        );
    }
}
