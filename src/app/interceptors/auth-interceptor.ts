import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../features/auth/services/auth.service';
import { TokenTimerService } from '../shared/services/token-timer.service';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';

let isRefreshing = false;

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
    const authService = inject(AuthService);
    const router      = inject(Router);
    const timer       = inject(TokenTimerService);
    // En dev apiUrl es vacío: el proxy sirve /api desde el mismo origen.
    // window.location.origin resuelve correctamente localhost, IP de red o dominio de prod.
    const BACKEND     = `${environment.apiUrl || window.location.origin}/api`;

    if (!req.url.startsWith(BACKEND)) {
        return next(req);
    }

    // Cookies + cabecera anti-CSRF para bloquear envíos desde formularios HTML nativos
    const authReq = req.clone({
        withCredentials: true,
        headers: req.headers.set('X-Requested-With', 'XMLHttpRequest'),
    });

    const isPublic = req.url.includes('/auth/login') ||
                     req.url.includes('/auth/register') ||
                     req.url.includes('/auth/refresh') ||
                     req.url.includes('/auth/logout') ||
                     req.url.includes('/auth/forgot-password');

    if (isPublic) {
        return next(authReq);
    }

    return next(authReq).pipe(
        catchError((err: HttpErrorResponse) => {
            if (err.status === 401 && !isRefreshing) {
                isRefreshing = true;

                return authService.refreshToken().pipe(
                    switchMap(session => {
                        isRefreshing = false;
                        timer.start(session.expiresIn);
                        return next(authReq);
                    }),
                    catchError(refreshErr => {
                        isRefreshing = false;
                        expireSession(authService, router);
                        return throwError(() => refreshErr);
                    })
                );
            }
            return throwError(() => err);
        })
    );
};

function expireSession(authService: AuthService, router: Router): void {
    authService.logout();
    router.navigate(['/'], { queryParams: { reason: 'expired' } });
}
