import { Container, SCALE_MODES, Text, TextStyle } from "pixi.js";
import { Button, BUTTON_GAP } from "../components/Button";
import { Logo } from "../components/Logo";
import { Loader } from "../core/Loader";
import { DESIGN_WIDTH, DESIGN_HEIGHT } from "../core/App";
import { gameStore } from "../store/gameStore";

/**
 * End-of-round screen. Best score is kept in localStorage.
 */
export class Score extends Container {
    private readonly _logo: Logo;
    private readonly _yourScore: Text;
    private readonly _bestScore: Text;

    constructor(loader: Loader) {
        super();
        this.name = "Score";

        const font = loader.getFont("pixelify_sans");
        this._logo = new Logo(font, loader.getAsset("character"));
        this._logo.position.set(DESIGN_WIDTH / 2, 80);

        this._yourScore = this._label("Your score: 0", font);
        this._yourScore.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.38);

        this._bestScore = this._label("Best score: 0", font);
        this._bestScore.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.38 + 48);

        const plaque = loader.getAsset("button");
        const mainMenu = new Button("Main menu", font, plaque, () => gameStore.getState().quit());
        mainMenu.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.58);

        const tryAgain = new Button("Try again", font, plaque, () => gameStore.getState().start());
        tryAgain.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.58 + BUTTON_GAP);

        this.addChild(this._logo, this._yourScore, this._bestScore, mainMenu, tryAgain);
    }

    /**
     * Copy this round's points and the saved best score onto the labels.
     */
    public refresh(): void {
        const { points, bestScore } = gameStore.getState();
        this._yourScore.text = `Your score: ${points}`;
        this._bestScore.text = `Best score: ${bestScore}`;
    }

    /**
     * Pulse the title.
     * @param delta ticker delta time
     */
    public update(delta: number): void {
        this._logo.update(delta);
    }

    private _label(content: string, fontFamily: string): Text {
        const label = new Text(
            content,
            new TextStyle({
                fontFamily,
                fontSize: 32,
                fill: 0xffffff,
                stroke: 0x132722,
                strokeThickness: 4,
                align: "center",
                lineJoin: "round",
                padding: 8,
            }),
        );
        label.anchor.set(0.5);
        label.roundPixels = true;
        label.texture.baseTexture.scaleMode = SCALE_MODES.NEAREST;
        return label;
    }
}
