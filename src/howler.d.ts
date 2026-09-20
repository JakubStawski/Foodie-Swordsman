declare module "howler" {
    export type HowlCallback = (soundId: number) => void;
    export type HowlErrorCallback = (soundId: number, error: unknown) => void;

    export interface HowlOptions {
        src: string | string[];
        volume?: number;
        html5?: boolean;
        loop?: boolean;
        preload?: boolean | "metadata";
        autoplay?: boolean;
        mute?: boolean;
        sprite?: { [name: string]: [number, number] | [number, number, boolean] };
        rate?: number;
        pool?: number;
        format?: string | string[];
        xhr?: object;
        onload?: () => void;
        onloaderror?: HowlErrorCallback;
        onplay?: HowlCallback;
        onend?: HowlCallback;
        onpause?: HowlCallback;
        onstop?: HowlCallback;
        onmute?: HowlCallback;
        onvolume?: HowlCallback;
        onrate?: HowlCallback;
        onseek?: HowlCallback;
        onfade?: HowlCallback;
        onunlock?: () => void;
    }

    export class Howl {
        constructor(options: HowlOptions);
        play(spriteOrId?: string | number): number;
        pause(id?: number): this;
        stop(id?: number): this;
        mute(): boolean;
        mute(muted: boolean, id?: number): this;
        volume(): number;
        volume(id: number): number;
        volume(volume: number, id?: number): this;
        fade(from: number, to: number, duration: number, id?: number): this;
        rate(): number;
        rate(id: number): number;
        rate(rate: number, id?: number): this;
        seek(): number;
        seek(id: number): number;
        seek(seek: number, id?: number): this;
        loop(): boolean;
        loop(id: number): boolean;
        loop(loop: boolean, id?: number): this;
        playing(id?: number): boolean;
        duration(id?: number): number;
        state(): "unloaded" | "loading" | "loaded";
        load(): this;
        unload(): this;
        on(event: string, fn: Function, id?: number): this;
        once(event: string, fn: Function, id?: number): this;
        off(event?: string, fn?: Function, id?: number): this;
    }

    export interface HowlerGlobal {
        mute(muted: boolean): this;
        volume(): number;
        volume(volume: number): this;
        stop(): this;
        codecs(ext: string): boolean;
        unload(): this;
        usingWebAudio: boolean;
        html5PoolSize: number;
        noAudio: boolean;
        autoUnlock: boolean;
        autoSuspend: boolean;
        ctx: AudioContext | null;
        masterGain: GainNode | null;
    }

    export const Howler: HowlerGlobal;
}
