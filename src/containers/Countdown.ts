import { Container, SCALE_MODES, Text, TextStyle } from "pixi.js";
import { Logo } from "../components/Logo";
import { Loader } from "../core/Loader";
import { DESIGN_WIDTH, DESIGN_HEIGHT } from "../core/App";
import { gameStore } from "../store/gameStore";
import { SOUND, soundController } from "../core/SoundController";

const STEP_MS = 1000;
const START_VALUE = 3;
const LABEL_SCALE_GROW = 0.9;

/** Wall-clock length of the 3 → 2 → 1 beat. The shared background settles in this time. */
export const COUNTDOWN_MS = STEP_MS * START_VALUE;

/**
 * Pre-game beat: logo and a 3 → 2 → 1 countdown. Scenery lives on the stage.
 */
export class Countdown extends Container {
    private readonly _logo: Logo;
    private readonly _label: Text;
    private _startedAt = 0;
    private _finished = false;
    private _lastRemaining = START_VALUE;

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

        this.addChild(this._logo, this._label);
    }

    /**
     * Restart at 3 when this view is shown.
     */
    public reset(): void {
        this._startedAt = performance.now();
        this._finished = false;
        this._lastRemaining = START_VALUE;
        this._label.text = String(START_VALUE);
        this._pulseLabel(0);
        soundController.play(SOUND.COUNTDOWN);
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

        if (remaining !== this._lastRemaining) {
            this._lastRemaining = remaining;
            soundController.play(SOUND.COUNTDOWN);
        }

        this._label.text = String(remaining);
        this._pulseLabel((elapsed % STEP_MS) / STEP_MS);
    }

    /**
     * Grow and fade the current number over its one-second beat.
     * @param t 0 at the start of a beat, 1 at the end
     */
    private _pulseLabel(t: number): void {
        const eased = 1 - (1 - t) * (1 - t);
        this._label.scale.set(1 + eased * LABEL_SCALE_GROW);
        this._label.alpha = 1 - t;
    }
}
