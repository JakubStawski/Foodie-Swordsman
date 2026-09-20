export type GfxConfig = {
    sprites: Record<string, string>;
    fonts: Record<string, string>;
};

export type SoundSprite = Record<string, [number, number] | [number, number, boolean]>;

export type SoundDef = {
    src?: string | string[];
    /** Alternate clips; play() picks one at random. */
    variants?: string[];
    loop?: boolean;
    volume?: number;
    html5?: boolean;
    rate?: number;
    sprite?: SoundSprite;
};

export type SfxConfig = Record<string, SoundDef>;

