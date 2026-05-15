import { Injectable, signal, effect } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
    private readonly KEY = 'px-theme';

    isDark = signal(this.resolve());

    constructor() {
        // Apply immediately to prevent flash of wrong theme
        document.documentElement.classList.toggle('dark', this.isDark());

        effect(() => {
            const dark = this.isDark();
            document.documentElement.classList.toggle('dark', dark);
            localStorage.setItem(this.KEY, dark ? 'dark' : 'light');
        });
    }

    toggle(): void {
        this.isDark.update(v => !v);
    }

    private resolve(): boolean {
        const stored = localStorage.getItem(this.KEY);
        if (stored !== null) return stored === 'dark';
        return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    }
}
