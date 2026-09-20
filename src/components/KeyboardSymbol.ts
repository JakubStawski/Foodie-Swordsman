import { Container, Rectangle, SCALE_MODES, Sprite, Texture } from "pixi.js";
import { sliceFrames, type SpriteSheetLayout } from "../utils/animations";

const LETTERS_LAYOUT: SpriteSheetLayout = {
    cols: 8,
    frameWidth: 16,
    frameHeight: 16,
};

const LETTERS_COUNT = 8 * 14;
const LETTERS_BLUE_OFFSET = 8 * 7;
const SPECIAL_DARK_Y = 64;

/** First letter tile (A) on keyboard-letters.png. */
const LETTER_A_INDEX = 16;

/** Extra glyphs on the letters sheet (light variant). */
const LETTER_KEYS: Record<string, number> = {
    ArrowUp: 0,
    ArrowDown: 1,
    ArrowLeft: 2,
    ArrowRight: 3,
};

type SpecialFrame = {
    x: number;
    y: number;
    w: number;
    h: number;
};

/** Pixel rects on keyboard-special.png (light variant). */
const SPECIAL_FRAMES: Record<string, SpecialFrame> = {
    Tab: { x: 0, y: 0, w: 32, h: 16 },
    Escape: { x: 32, y: 0, w: 32, h: 16 },
    Shift: { x: 0, y: 16, w: 32, h: 16 },
    Enter: { x: 96, y: 16, w: 32, h: 16 },
    Space: { x: 64, y: 32, w: 32, h: 16 },
};

const DISPLAY_SCALE = 3;

export type KeyboardSheets = {
    letters: Texture;
    special: Texture;
};

export type KeyboardVariant = "light" | "dark";

/**
 * One keyboard key from keyboard-letters.png / keyboard-special.png.
 */
export class KeyboardSymbol extends Container {
    private static _letterFrames: Texture[] | null = null;
    private static _specialCache = new Map<string, Texture>();

    private readonly _sprite: Sprite;

    constructor(key: string, sheets: KeyboardSheets, variant: KeyboardVariant = "light") {
        super();
        this.name = `Key:${key}`;

        KeyboardSymbol._ensureLetterFrames(sheets.letters);
        sheets.special.baseTexture.scaleMode = SCALE_MODES.NEAREST;

        const texture = KeyboardSymbol._textureFor(key, sheets, variant);
        this._sprite = new Sprite(texture);
        this._sprite.anchor.set(0.5);
        this._sprite.roundPixels = true;
        this._sprite.scale.set(DISPLAY_SCALE);
        this.addChild(this._sprite);
    }

    /** Display width of the keycap. */
    public get capWidth(): number {
        return this._sprite.width;
    }

    /** Display height of the keycap. */
    public get capHeight(): number {
        return this._sprite.height;
    }

    private static _ensureLetterFrames(sheet: Texture): void {
        if (KeyboardSymbol._letterFrames) {
            return;
        }

        sheet.baseTexture.scaleMode = SCALE_MODES.NEAREST;
        KeyboardSymbol._letterFrames = sliceFrames(sheet, 0, LETTERS_COUNT - 1, LETTERS_LAYOUT);
    }

    private static _textureFor(key: string, sheets: KeyboardSheets, variant: KeyboardVariant): Texture {
        const letterIndex = KeyboardSymbol._letterIndex(key, variant);
        if (letterIndex !== null) {
            return KeyboardSymbol._letterFrames![letterIndex];
        }

        const frame = SPECIAL_FRAMES[key];
        if (!frame) {
            throw new Error(`Unknown keyboard symbol: ${key}`);
        }

        const cacheKey = `${key}:${variant}`;
        const cached = KeyboardSymbol._specialCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        const y = frame.y + (variant === "dark" ? SPECIAL_DARK_Y : 0);
        const texture = new Texture(sheets.special.baseTexture, new Rectangle(frame.x, y, frame.w, frame.h));
        KeyboardSymbol._specialCache.set(cacheKey, texture);
        return texture;
    }

    private static _letterIndex(key: string, variant: KeyboardVariant): number | null {
        const offset = variant === "dark" ? LETTERS_BLUE_OFFSET : 0;
        const named = LETTER_KEYS[key];
        if (named !== undefined) {
            return named + offset;
        }

        if (key.length === 1 && key >= "A" && key <= "Z") {
            return LETTER_A_INDEX + (key.charCodeAt(0) - 65) + offset;
        }

        if (key.length === 1 && key >= "a" && key <= "z") {
            return KeyboardSymbol._letterIndex(key.toUpperCase(), variant);
        }

        return null;
    }
}
