import { Component, inject, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CdkDrag, CdkDragHandle } from '@angular/cdk/drag-drop';
import { TokenTimerService } from '../../services/token-timer.service';

@Component({
    selector: 'app-token-countdown',
    standalone: true,
    imports: [MatIconModule, MatTooltipModule, CdkDrag, CdkDragHandle],
    template: `
        @if (timer.isActive() || timer.secondsLeft() > 0) {
            <div class="floating-timer"
                cdkDrag
                [class.ok]="urgencyClass === 'ok'"
                [class.warn]="urgencyClass === 'warn'"
                [class.danger]="urgencyClass === 'danger'"
                matTooltip="Sesión activa · Arrastra para mover"
                matTooltipPosition="left">

                <mat-icon cdkDragHandle class="drag-handle">drag_indicator</mat-icon>
                <mat-icon class="clock-icon">schedule</mat-icon>
                <span class="timer-label">{{ label }}</span>
            </div>
        }
    `,
    styles: [`
        .floating-timer {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;

            display: flex;
            align-items: center;
            gap: 6px;
            padding: 8px 14px 8px 10px;
            border-radius: 9999px;
            font-size: 12px;
            font-weight: 600;
            font-family: 'JetBrains Mono', monospace;
            user-select: none;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(12px);
            transition: background 0.3s, color 0.3s, border-color 0.3s;
            letter-spacing: .03em;

            &.ok {
                background: rgba(16, 185, 129, 0.12);
                color: #6ee7b7;
                border: 1px solid rgba(16, 185, 129, 0.3);
            }
            &.warn {
                background: rgba(245, 158, 11, 0.12);
                color: #fcd34d;
                border: 1px solid rgba(245, 158, 11, 0.3);
            }
            &.danger {
                background: rgba(239, 68, 68, 0.14);
                color: #fca5a5;
                border: 1px solid rgba(239, 68, 68, 0.35);
                animation: timer-pulse 1.2s ease-in-out infinite;
            }

            @keyframes timer-pulse {
                0%, 100% { opacity: 1; }
                50%       { opacity: 0.5; }
            }
        }

        .drag-handle {
            font-size: 18px;
            width: 18px;
            height: 18px;
            opacity: 0.45;
            cursor: grab;
            flex-shrink: 0;

            &:active { cursor: grabbing; }
        }

        .clock-icon {
            font-size: 16px;
            width: 16px;
            height: 16px;
            flex-shrink: 0;
        }

        .timer-label {
            letter-spacing: 0.3px;
            white-space: nowrap;
        }
    `]
})
export class TokenCountdown implements OnInit {
    protected timer = inject(TokenTimerService);

    ngOnInit(): void {
        this.timer.start();
    }

    get label(): string {
        const s = this.timer.secondsLeft();
        if (s <= 0) return 'Expirada';
        const h   = Math.floor(s / 3600);
        const m   = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    }

    get urgencyClass(): 'ok' | 'warn' | 'danger' {
        const s = this.timer.secondsLeft();
        if (s > 5 * 60) return 'ok';
        if (s > 60)     return 'warn';
        return 'danger';
    }
}
