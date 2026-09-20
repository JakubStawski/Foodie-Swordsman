import { Container, SCALE_MODES, Sprite, Texture } from "pixi.js";
import { sliceFrames, type SpriteSheetLayout } from "../utils/animations";

/** hearts.png: 4 frames stacked vertically, 16×16 each. */
const SHEET_LAYOUT: SpriteSheetLayout = {
    cols: 1,
    frameWidth: 16,
    frameHeight: 16,
};

const HEART_COUNT = 10;
const HEARTS_PER_ROW = 5;
const FRAME_FULL = 0;
const FRAME_EMPTY = 3;
const DISPLAY_SCALE = 2;
const HEART_GAP = 2;

/**
 * Ten HUD hearts. Each heart is 1 HP: red when full, gray when empty.
 */
export class Hearts extends Container {
    private readonly _sprites: Sprite[] = [];
    private readonly _full: Texture;
    private readonly _empty: Texture;

    constructor(sheet: Texture) {
        super();
        this.name = "Hearts";

        sheet.baseTexture.scaleMode = SCALE_MODES.NEAREST;
        const frames = sliceFrames(sheet, 0, FRAME_EMPTY, SHEET_LAYOUT);
        this._full = frames[FRAME_FULL];
        this._empty = frames[FRAME_EMPTY];

        const slot = SHEET_LAYOUT.frameWidth * DISPLAY_SCALE + HEART_GAP;

        for (let i = 0; i < HEART_COUNT; i++) {
            const sprite = new Sprite(this._full);
            sprite.roundPixels = true;
            sprite.scale.set(DISPLAY_SCALE);
            sprite.x = Math.round((i % HEARTS_PER_ROW) * slot);
            sprite.y = Math.round(Math.floor(i / HEARTS_PER_ROW) * slot);
            this._sprites.push(sprite);
            this.addChild(sprite);
        }
    }

    /**
     * Light up the first `hp` hearts; the rest stay empty.
     * @param hp current hit points
     */
    public setHp(hp: number): void {
        for (let i = 0; i < HEART_COUNT; i++) {
            this._sprites[i].texture = i < hp ? this._full : this._empty;
        }
    }
}
