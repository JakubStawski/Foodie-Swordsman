import { Container, Sprite, Texture } from "pixi.js";
import { DESIGN_WIDTH, DESIGN_HEIGHT } from "../core/App";

/** Parallax strength from farthest (bg_01) to nearest (bg_04). Keep small for a subtle shift. */
const PARALLAX_FACTORS = [0.04, 0.08, 0.16, 0.24];

/** Vegetation layer (bg_03). Food masks that match its silhouette must track this index. */
export const VEGETATION_LAYER = 2;

type LayerFollower = {
    sprite: Sprite;
    layerIndex: number;
};

/**
 * Layered parallax background.
 * Layers are drawn back-to-front: bg_01 (sky) → bg_04 (ground).
 * Horizontal offset follows the character with a slight delay per depth.
 */
export class Background extends Container {
    private readonly _layers: Sprite[] = [];
    private readonly _baseX: number[] = [];
    private readonly _followers: LayerFollower[] = [];

    constructor(textures: Texture[]) {
        super();
        this.name = "Background";

        for (const texture of textures) {
            const sprite = new Sprite(texture);

            const coverScale = Math.max(
                DESIGN_WIDTH / texture.width,
                DESIGN_HEIGHT / texture.height,
            );
            sprite.scale.set(Math.ceil(coverScale));

            // Pin to the bottom so the ground layer stays under the character.
            sprite.y = DESIGN_HEIGHT - sprite.height;
            const baseX = (DESIGN_WIDTH - sprite.width) / 2;
            sprite.x = baseX;

            this._baseX.push(baseX);
            this._layers.push(sprite);
            this.addChild(sprite);
        }
    }

    /**
     * Sprite laid out like a parallax layer so it stays locked 1:1 with that layer.
     * Parent it anywhere in the same world; update() copies the tracked layer transform.
     * @param texture image matching the layer size
     * @param layerIndex parallax layer to follow (0 = farthest)
     */
    public createTrackingSprite(texture: Texture, layerIndex: number): Sprite {
        const layer = this._layers[layerIndex];
        const sprite = new Sprite(texture);
        sprite.roundPixels = true;
        sprite.scale.copyFrom(layer.scale);
        sprite.position.copyFrom(layer.position);
        this._followers.push({ sprite, layerIndex });
        return sprite;
    }

    /**
     * Shift layers based on the focus point (here: the character x).
     * Far layers move less than near ones. Offset is clamped so empty edges never show.
     * @param focusX world x to follow
     */
    public update(focusX: number): void {
        const offset = focusX - DESIGN_WIDTH / 2;

        for (let i = 0; i < this._layers.length; i++) {
            const layer = this._layers[i];
            const extra = (layer.width - DESIGN_WIDTH) / 2;
            const shift = Math.max(-extra, Math.min(extra, offset * PARALLAX_FACTORS[i]));
            layer.x = Math.round(this._baseX[i] - shift);
        }

        for (const follower of this._followers) {
            const layer = this._layers[follower.layerIndex];
            follower.sprite.scale.copyFrom(layer.scale);
            follower.sprite.position.copyFrom(layer.position);
        }
    }
}
