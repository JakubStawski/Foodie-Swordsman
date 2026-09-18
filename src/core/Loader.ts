import { Assets, Texture } from "pixi.js";
import { GfxConfig } from "./types";

/**
 * Loader class to load all assets listed in given config
 */
export class Loader {
    private _config: GfxConfig;
    private _fontFamilies: Record<string, string> = {};

    constructor(config: GfxConfig) {
        this._config = config;
    }

    /**
     * Load all assets listed in given config
     * @returns a promise that resolves when all assets are loaded
     */
    public async loadAssets(): Promise<void> {
        Assets.addBundle("sprites", this._config.sprites);

        const fontBundle: Record<string, { src: string; data: { family: string } }> = {};

        for (const [name, src] of Object.entries(this._config.fonts)) {
            fontBundle[name] = {
                src,
                data: { family: name },
            };
            this._fontFamilies[name] = name;
        }

        Assets.addBundle("fonts", fontBundle);

        await Assets.loadBundle(["sprites", "fonts"]);
    }

    /**
     * Get a texture asset by name
     * @param name the name of the asset
     * @returns texture
     */
    public getAsset(name: string): Texture {
        return Assets.get<Texture>(name);
    }

    /**
     * Get a font family by name
     * @param name the name of the font family
     * @returns font family
     */
    public getFont(name: string): string {
        return this._fontFamilies[name] ?? name;
    }
}
