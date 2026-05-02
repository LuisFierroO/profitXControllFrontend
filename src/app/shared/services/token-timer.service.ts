import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class TokenTimerService {
    private _secondsLeft = signal<number>(0);
    private _isActive    = signal<boolean>(false);

    readonly secondsLeft = this._secondsLeft.asReadonly();
    readonly isActive    = this._isActive.asReadonly();
    readonly expired$    = new Subject<void>();

    private intervalId?: ReturnType<typeof setInterval>;

    /**
     * Inicia el countdown.
     * - Con expiresInSeconds: calcula y persiste el timestamp de expiración.
     * - Sin argumento: recupera el timestamp guardado (útil tras recarga de página).
     */
    start(expiresInSeconds?: number): void {
        this.stop();
        let expiry: Date;
        if (expiresInSeconds !== undefined) {
            expiry = new Date(Date.now() + expiresInSeconds * 1000);
            localStorage.setItem('tokenExpiry', expiry.getTime().toString());
        } else {
            const stored = this.readExpiry();
            if (!stored) return;
            expiry = stored;
        }
        this._isActive.set(true);
        this.tick(expiry);
        this.intervalId = setInterval(() => this.tick(expiry), 1000);
    }

    stop(): void {
        if (this.intervalId !== undefined) {
            clearInterval(this.intervalId);
            this.intervalId = undefined;
        }
        this._isActive.set(false);
        this._secondsLeft.set(0);
    }

    private tick(expiry: Date): void {
        const diff = Math.floor((expiry.getTime() - Date.now()) / 1000);
        this._secondsLeft.set(Math.max(0, diff));
        if (diff <= 0) {
            this.stop();
            this.expired$.next();
        }
    }

    private readExpiry(): Date | null {
        const raw = localStorage.getItem('tokenExpiry');
        if (!raw) return null;
        const timestamp = parseInt(raw, 10);
        return isNaN(timestamp) ? null : new Date(timestamp);
    }
}
