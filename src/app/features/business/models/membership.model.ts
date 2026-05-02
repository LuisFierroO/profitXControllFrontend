export type Role = 'OWNER' | 'ADMIN' | 'EMPLOYEE';

export interface MembershipResponse {
    id: string;
    userId: string;
    userEmail: string;
    userFullName: string;
    businessId: string;
    role: Role;
}

export interface AddMemberRequest {
    userEmail: string;
    role: Role;
}
