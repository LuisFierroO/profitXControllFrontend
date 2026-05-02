import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SessionResponse } from '../models/TokenResponse';
import { RegisterRequest } from '../models/RegisterRequest';
import { LoginRequest } from '../models/LoginRequest';
import { TokenTimerService } from '../../../shared/services/token-timer.service';
import { BusinessContextService } from '../../../shared/services/business-context.service';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private http    = inject(HttpClient);
    private timer   = inject(TokenTimerService);
    private context = inject(BusinessContextService);
    private readonly API = `${environment.apiUrl}/api`;

    login(data: LoginRequest): Observable<SessionResponse> {
        return this.http.post<SessionResponse>(`${this.API}/auth/login`, data, { withCredentials: true });
    }

    register(data: RegisterRequest): Observable<SessionResponse> {
        return this.http.post<SessionResponse>(`${this.API}/auth/register`, data, { withCredentials: true });
    }

    refreshToken(): Observable<SessionResponse> {
        return this.http.post<SessionResponse>(`${this.API}/auth/refresh`, {}, { withCredentials: true });
    }

    forgotPassword(email: string): Observable<void> {
        return this.http.post<void>(`${this.API}/auth/forgot-password`, { email }, { withCredentials: true });
    }

    logout(): void {
        this.http.post(`${this.API}/auth/logout`, {}, { withCredentials: true }).subscribe();
        localStorage.removeItem('tokenExpiry');
        this.context.clear();
        this.timer.stop();
    }
}
