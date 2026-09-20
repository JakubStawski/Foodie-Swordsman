import { Container, SCALE_MODES, Text, TextStyle } from "pixi.js";
import { Background } from "../components/Background";
import { Button, BUTTON_GAP } from "../components/Button";
import { Logo } from "../components/Logo";
import { Loader } from "../core/Loader";
import { DESIGN_WIDTH, DESIGN_HEIGHT } from "../core/App";
import { gameStore } from "../store/gameStore";

/**
 * End-of-round screen. Best score is a placeholder until that logic exists.
 */
export class Score extends Container {
    private readonly _logo: Logo;
    private readonly _yourScore: Text;
    private readonly _bestScore: Text;

    constructor(loader: Loader) {
        super();
        this.name = "Score";

        const font = loader.getFont("pixelify_sans");
        this._logo = new Logo(font, loader.getAsset("sword_icon"));
        this._logo.position.set(DESIGN_WIDTH / 2, 48);

        this._yourScore = this._label("Your score: 0", font);
        this._yourScore.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.38);

        this._bestScore = this._label("Best score: 0", font);
        this._bestScore.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.38 + 48);

        const plaque = loader.getAsset("button");
        const mainMenu = new Button("Main menu", font, plaque, () => gameStore.getState().quit());
        mainMenu.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.58);

        const tryAgain = new Button("Try again", font, plaque, () => gameStore.getState().start());
        tryAgain.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.58 + BUTTON_GAP);

        this.addChild(
            new Background([
                loader.getAsset("bg_01"),
                loader.getAsset("bg_02"),
                loader.getAsset("bg_03"),
                loader.getAsset("bg_04"),
            ]),
            this._logo,
            this._yourScore,
            this._bestScore,
            mainMenu,
            tryAgain,
        );
    }

    /**
     * Copy the current round's points onto the labels. Best score stays a stub.
     */
    public refresh(): void {
        this._yourScore.text = `Your score: ${gameStore.getState().points}`;
        this._bestScore.text = "Best score: 0";
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
