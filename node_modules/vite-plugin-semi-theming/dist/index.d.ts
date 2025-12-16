import type { Plugin } from 'vite';
export interface SemiThemingOptions {
    theme?: string;
    include?: string;
    variables?: Record<string, string | number>;
    prefixCls?: string;
}
export declare function semiTheming({ theme, ...options }: SemiThemingOptions): Plugin;
export default semiTheming;
