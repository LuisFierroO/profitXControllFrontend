import { Routes } from '@angular/router';


import { AuthLayout } from './layouts/auth-layout/auth-layout';
import { MainLayout } from './layouts/main-layout/main-layout';
import { Business } from './layouts/business/business';

export const routes: Routes = [

    {
        path: '',
        component: AuthLayout,
        children: [
            {
                path: '',
                loadComponent: () => import('./features/auth/pages/acces/acces').then(m => m.Acces)
            }
        ]
    },
    {

        path: 'app',
        component: MainLayout,
        children: [
            {
                path: 'bussines/list',
                loadComponent: () => import('./features/admin-business/pages/list-bussines/list-bussines').then(m => m.ListBussines)
            },
            {
                path: 'bussines/create',
                loadComponent: () => import('./features/admin-business/pages/create-bussines/create-bussines').then(m => m.CreateBussines)
            },
            {
                path: 'bussines/:id/edit',
                loadComponent: () => import('./features/admin-business/pages/edit-bussines/edit-bussines').then(m => m.EditBussines)
            }
        ]
    },
    {
        path: 'dashboard',
        component: Business,
        children: [
            {
                path: 'products',
                loadComponent: () => import('./features/business/pages/products/products').then(m => m.Products)
            },
            {
                path: 'sale',
                loadComponent: () => import('./features/business/pages/sale/sale').then(m => m.Sale)
            },
            {
                path: 'sales',
                loadComponent: () => import('./features/business/pages/sales-list/sales-list').then(m => m.SalesList)
            },
            {
                path: 'members',
                loadComponent: () => import('./features/business/pages/members/members').then(m => m.Members)
            },
            {
                path: 'expenses',
                loadComponent: () => import('./features/business/pages/expenses/expenses').then(m => m.Expenses)
            },
            {
                path: 'metrics',
                loadComponent: () => import('./features/business/pages/metrics/metrics').then(m => m.Metrics)
            },
            {
                path: 'audit',
                loadComponent: () => import('./features/business/pages/audit-log/audit-log').then(m => m.AuditLog)
            },
            {
                path: 'profitability',
                loadComponent: () => import('./features/business/pages/profitability/profitability').then(m => m.Profitability)
            }
        ]
        
    },
    {
        path: '**',
        redirectTo: '',
        pathMatch: 'full'
    }

];
