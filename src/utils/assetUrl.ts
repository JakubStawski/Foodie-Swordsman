/**
 * Prefix a public-folder path with Vite's base URL so assets load on GitHub Pages.
 */
export function assetUrl(path: string): string {
    return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}
