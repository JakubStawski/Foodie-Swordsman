import { Container, SCALE_MODES, Text, TextStyle } from "pixi.js";
import { Background } from "../components/Background";
import { Logo } from "../components/Logo";
import { Loader } from "../core/Loader";
import { DESIGN_WIDTH, DESIGN_HEIGHT } from "../core/App";
import { gameStore } from "../store/gameStore";

const STEP_MS = 1000;
const START_VALUE = 3;

/**
 * Pre-game beat: background, logo, and a 3 → 2 → 1 countdown.
 */
export class Countdown extends Container {
    private readonly _logo: Logo;
    private readonly _label: Text;
    private _startedAt = 0;
    private _finished = false;

    constructor(loader: Loader) {
        super();
        this.name = "Countdown";

        const font = loader.getFont("pixelify_sans");
        this._logo = new Logo(font, loader.getAsset("sword_icon"));
        this._logo.position.set(DESIGN_WIDTH / 2, 48);

        this._label = new Text(
            String(START_VALUE),
            new TextStyle({
                fontFamily: font,
                fontSize: 72,
                fill: 0xffffff,
                align: "center",
                padding: 8,
            }),
        );
        this._label.anchor.set(0.5);
        this._label.roundPixels = true;
        this._label.texture.baseTexture.scaleMode = SCALE_MODES.NEAREST;
        this._label.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT / 2);

        this.addChild(
            new Background([
                loader.getAsset("bg_01"),
                loader.getAsset("bg_02"),
                loader.getAsset("bg_03"),
                loader.getAsset("bg_04"),
            ]),
            this._logo,
            this._label,
        );
    }

    /**
     * Restart at 3 when this view is shown.
     */
    public reset(): void {
        this._startedAt = performance.now();
        this._finished = false;
        this._label.text = String(START_VALUE);
    }

    /**
     * Tick the countdown; starts the round after 1.
     * @param delta ticker delta time
     */
    public update(delta: number): void {
        this._logo.update(delta);
        if (this._finished) {
            return;
        }

        const elapsed = performance.now() - this._startedAt;
        const remaining = START_VALUE - Math.floor(elapsed / STEP_MS);

        if (remaining <= 0) {
            this._finished = true;
            gameStore.getState().play();
            return;
        }

        this._label.text = String(remaining);
    }
}
