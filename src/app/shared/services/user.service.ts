import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserResponse } from '../models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UserService {
    private http = inject(HttpClient);
    private readonly API = `${environment.apiUrl}/api`;

    findMe(): Observable<UserResponse> {
        return this.http.get<UserResponse>(`${this.API}/users/me`);
    }
}
