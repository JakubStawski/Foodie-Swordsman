import { Container, SCALE_MODES, Text, TextStyle } from "pixi.js";
import { Button } from "../components/Button";
import { Logo } from "../components/Logo";
import { Loader } from "../core/Loader";
import { DESIGN_WIDTH, DESIGN_HEIGHT } from "../core/App";
import { gameStore } from "../store/gameStore";

/**
 * Credits screen, reachable only from the main menu.
 */
export class Credits extends Container {
    private readonly _logo: Logo;

    constructor(loader: Loader) {
        super();
        this.name = "Credits";

        const font = loader.getFont("pixelify_sans");
        this._logo = new Logo(font, loader.getAsset("character"));
        this._logo.position.set(DESIGN_WIDTH / 2, 80);

        const author = new Text(
            "Author: Jakub Stawski",
            new TextStyle({
                fontFamily: font,
                fontSize: 32,
                fill: 0xffffff,
                stroke: 0x132722,
                strokeThickness: 4,
                align: "center",
                lineJoin: "round",
                padding: 8,
            }),
        );
        author.anchor.set(0.5);
        author.roundPixels = true;
        author.texture.baseTexture.scaleMode = SCALE_MODES.NEAREST;
        author.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.48);

        const back = new Button("Back to main menu", font, loader.getAsset("button"), () =>
            gameStore.getState().quit(),
        );
        back.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.72);

        this.addChild(this._logo, author, back);
    }

    /**
     * Pulse the title.
     * @param delta ticker delta time
     */
    public update(delta: number): void {
        this._logo.update(delta);
    }
}
