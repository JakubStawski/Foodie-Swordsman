import { Container, SCALE_MODES, Text, TextStyle } from "pixi.js";
import { Button } from "../components/Button";
import { KeyboardSymbol, type KeyboardSheets } from "../components/KeyboardSymbol";
import { Logo } from "../components/Logo";
import { Loader } from "../core/Loader";
import { DESIGN_WIDTH, DESIGN_HEIGHT } from "../core/App";
import { gameStore } from "../store/gameStore";

const KEY_GAP = 8;
const GROUP_GAP = 20;
const ROW_GAP = 92;
const FIRST_ROW_Y = DESIGN_HEIGHT * 0.28;

/**
 * Controls screen, reachable only from the main menu.
 */
export class Help extends Container {
    private readonly _logo: Logo;

    constructor(loader: Loader) {
        super();
        this.name = "Help";

        const font = loader.getFont("pixelify_sans");
        this._logo = new Logo(font, loader.getAsset("character"));
        this._logo.position.set(DESIGN_WIDTH / 2, 80);

        const sheets: KeyboardSheets = {
            letters: loader.getAsset("keyboard_letters"),
            special: loader.getAsset("keyboard_special"),
        };

        const move = this._hint(["A", "D"], ["ArrowLeft", "ArrowRight"], "Move", font, sheets);
        const catchFood = this._hint(["Space", "Enter"], [], "Catch", font, sheets);
        const pause = this._hint(["Escape"], [], "Pause", font, sheets);

        move.position.set(DESIGN_WIDTH / 2, FIRST_ROW_Y);
        catchFood.position.set(DESIGN_WIDTH / 2, FIRST_ROW_Y + ROW_GAP);
        pause.position.set(DESIGN_WIDTH / 2, FIRST_ROW_Y + ROW_GAP * 2);

        const back = new Button("Back to main menu", font, loader.getAsset("button"), () =>
            gameStore.getState().quit(),
        );
        back.position.set(DESIGN_WIDTH / 2, DESIGN_HEIGHT * 0.72);

        this.addChild(this._logo, move, catchFood, pause, back);
    }

    /**
     * Pulse the title.
     * @param delta ticker delta time
     */
    public update(delta: number): void {
        this._logo.update(delta);
    }

    /**
     * A centered caption with keycaps on the next line.
     * @param leftKeys first group of keys
     * @param rightKeys optional second group (e.g. arrows)
     * @param caption action name
     * @param fontFamily UI font
     * @param sheets keyboard spritesheets
     */
    private _hint(
        leftKeys: string[],
        rightKeys: string[],
        caption: string,
        fontFamily: string,
        sheets: KeyboardSheets,
    ): Container {
        const group = new Container();

        const label = new Text(
            caption,
            new TextStyle({
                fontFamily,
                fontSize: 22,
                fill: 0xffffff,
                stroke: 0x132722,
                strokeThickness: 4,
                align: "center",
                lineJoin: "round",
                padding: 6,
            }),
        );
        label.anchor.set(0.5, 0);
        label.roundPixels = true;
        label.texture.baseTexture.scaleMode = SCALE_MODES.NEAREST;
        group.addChild(label);

        const keys = new Container();
        let x = 0;
        x = this._placeKeys(keys, leftKeys, sheets, x);

        if (rightKeys.length > 0) {
            x += GROUP_GAP;
            x = this._placeKeys(keys, rightKeys, sheets, x);
        }

        keys.x = -Math.round((x - KEY_GAP) / 2);
        const firstKey = keys.children[0] as KeyboardSymbol | undefined;
        const keyHalf = firstKey ? firstKey.capHeight / 2 : 0;
        keys.y = Math.round(label.height + 10 + keyHalf);
        group.addChild(keys);

        return group;
    }

    /**
     * Lay keys out left-to-right and return the next x.
     */
    private _placeKeys(
        parent: Container,
        ids: string[],
        sheets: KeyboardSheets,
        startX: number,
    ): number {
        let x = startX;
        for (const id of ids) {
            const key = new KeyboardSymbol(id, sheets);
            key.position.set(x + key.capWidth / 2, 0);
            parent.addChild(key);
            x += key.capWidth + KEY_GAP;
        }
        return x;
    }
}
