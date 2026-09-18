import { Rectangle, Texture } from "pixi.js";

export type FrameRange = [from: number, to: number];

export type SpriteSheetLayout = {
    cols: number;
    frameWidth: number;
    frameHeight: number;
};

/**
 * Slice a contiguous range of frames from a grid spritesheet.
 * Frames are indexed left-to-right, top-to-bottom.
 */
export function sliceFrames(
    sheet: Texture,
    from: number,
    to: number,
    layout: SpriteSheetLayout,
): Texture[] {
    const { cols, frameWidth, frameHeight } = layout;
    const base = sheet.baseTexture;
    const frames: Texture[] = [];

    for (let i = from; i <= to; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);

        frames.push(
            new Texture(
                base,
                new Rectangle(col * frameWidth, row * frameHeight, frameWidth, frameHeight),
            ),
        );
    }

    return frames;
}
