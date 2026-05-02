import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import {authInterceptor} from "./interceptors/auth-interceptor";
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(
      withFetch(), 
      withInterceptors([authInterceptor]) 
    ),
    provideRouter(routes), provideClientHydration(withEventReplay())
  ]
};
