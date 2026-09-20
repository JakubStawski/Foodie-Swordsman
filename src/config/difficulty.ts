/** Starting lives. One miss costs 1 HP. */
export const INITIAL_HP = 10;

/** Ticks (~60/s) from round start until spawn/fall reach their hardest values. */
const RAMP_TICKS = 60 * 80;

const FALL_SPEED_MIN = 2.2;
const FALL_SPEED_MAX = 4.8;
/** ± spread around the current base speed so items in one wave are not identical. */
const SPEED_SPREAD = 0.3;
const RUSH_CHANCE_START = 0.08;
const RUSH_CHANCE_END = 0.22;
const RUSH_SPEED_MULT = 1.45;

const SPAWN_INTERVAL_START = 76;
const SPAWN_INTERVAL_END = 34;
const DOUBLE_SPAWN_FROM = 0.38;
const DOUBLE_SPAWN_CHANCE_MAX = 0.48;
const MAX_ACTIVE_FOOD = 12;

/** Minimum horizontal gap between a double-spawn pair, in pixels. */
export const DOUBLE_SPAWN_GAP = 100;

/**
 * 0 at round start, 1 at the top of the ramp. Eases in so the first seconds stay readable.
 */
export function difficultyFromElapsed(elapsedTicks: number): number {
    const t = Math.min(1, Math.max(0, elapsedTicks / RAMP_TICKS));
    return t ** 1.2;
}

/**
 * Ticks between spawns at this difficulty. Shrinks as the round goes on.
 */
export function spawnInterval(difficulty: number): number {
    return SPAWN_INTERVAL_START + (SPAWN_INTERVAL_END - SPAWN_INTERVAL_START) * difficulty;
}

/**
 * Per-item fall speed: ramps with difficulty, then jittered so two foods rarely match.
 */
export function rollFallSpeed(difficulty: number): number {
    const base = FALL_SPEED_MIN + (FALL_SPEED_MAX - FALL_SPEED_MIN) * difficulty;
    let jitter = 1 + (Math.random() * 2 - 1) * SPEED_SPREAD;

    const rushChance = RUSH_CHANCE_START + (RUSH_CHANCE_END - RUSH_CHANCE_START) * difficulty;
    if (difficulty > 0.28 && Math.random() < rushChance) {
        jitter *= RUSH_SPEED_MULT;
    }

    return Math.max(FALL_SPEED_MIN * 0.65, base * jitter);
}

/**
 * Late-game extra spawn so two foods can demand opposite sides of the playfield.
 */
export function shouldDoubleSpawn(difficulty: number, activeCount: number): boolean {
    if (activeCount >= MAX_ACTIVE_FOOD - 1) {
        return false;
    }

    if (difficulty < DOUBLE_SPAWN_FROM) {
        return false;
    }

    const t = (difficulty - DOUBLE_SPAWN_FROM) / (1 - DOUBLE_SPAWN_FROM);
    return Math.random() < t * DOUBLE_SPAWN_CHANCE_MAX;
}

/**
 * Soft cap so a long round cannot flood the playfield.
 */
export function canSpawnFood(activeCount: number): boolean {
    return activeCount < MAX_ACTIVE_FOOD;
}
