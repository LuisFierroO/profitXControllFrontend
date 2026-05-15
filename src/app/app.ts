import { Component, computed, inject, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { TokenCountdown } from './shared/components/token-countdown/token-countdown';
import { TokenTimerService } from './shared/services/token-timer.service';
import { AuthService } from './features/auth/services/auth.service';
import { ThemeService } from './shared/services/theme.service';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, TokenCountdown],
    templateUrl: './app.html',
    styleUrl: './app.scss',
})
export class App implements OnInit {
    private router = inject(Router);
    private timer  = inject(TokenTimerService);
    private auth   = inject(AuthService);
    readonly theme = inject(ThemeService);

    private currentUrl = toSignal(
        this.router.events.pipe(
            filter(e => e instanceof NavigationEnd),
            map(e => (e as NavigationEnd).urlAfterRedirects)
        ),
        { initialValue: this.router.url }
    );

    showTimer = computed(() => {
        const path = (this.currentUrl() ?? '/').split('?')[0];
        return path !== '/';
    });

    ngOnInit(): void {
        this.timer.expired$.subscribe(() => {
            this.auth.logout();
            this.router.navigate(['/'], { queryParams: { reason: 'expired' } });
        });
    }
}
