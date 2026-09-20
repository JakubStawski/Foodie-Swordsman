import { Container, SCALE_MODES, Text, TextStyle } from "pixi.js";
import { Background } from "../components/Background";
import { Button } from "../components/Button";
import { Logo } from "../components/Logo";
import { Loader } from "../core/Loader";
import { DESIGN_WIDTH, DESIGN_HEIGHT } from "../core/App";
import { gameStore } from "../store/gameStore";

const CONTROLS =
    "A / D or Arrow keys — move\nSpace or Enter — catch\nEscape — pause";

/**
 * Controls screen, reachable only from the main menu.
 */
export class Help extends Container {
    private readonly _logo: Logo;

    constructor(loader: Loader) {
        super();
        this.name = "Help";

        const font = loader.getFont("pixelify_sans");
        this._logo = new Logo(font, loader.getAsset("sword_icon"));
        this._logo.position.set(DESIGN_WIDTH / 2, 48);

        const controls = new Text(
            CONTROLS,
            new TextStyle({
                fontFamily: font,
                fontSize: 28,
                fill: 0xffffff,
                stroke: 0x132722,
                strokeThickness: 4,
                align: "center",
                lineJoin: "round",
                lineHeight: 40,
                padding: 8,
            }),
        );
        controls.anchor.set(0.5);
        controls.roundPixels = true;
        controls.texture.baseTexture.scaleMode = SCALE_MODES.NEAREST;
        controls.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.48);

        const back = new Button("Back to main menu", font, () => gameStore.getState().quit());
        back.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.72);

        this.addChild(
            new Background([
                loader.getAsset("bg_01"),
                loader.getAsset("bg_02"),
                loader.getAsset("bg_03"),
                loader.getAsset("bg_04"),
            ]),
            this._logo,
            controls,
            back,
        );
    }

    /**
     * Pulse the title.
     * @param delta ticker delta time
     */
    public update(delta: number): void {
        this._logo.update(delta);
    }
}
