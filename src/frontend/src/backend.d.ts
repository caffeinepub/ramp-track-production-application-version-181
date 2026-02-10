import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface Session {
    id: string;
    role: string;
    display_name: string;
    login_time: bigint;
    employee_id: string;
}
export interface Issue {
    id: string;
    status: string;
    operator_id: string;
    grounded: boolean;
    notes: string;
    timestamp: bigint;
    category: string;
    photo?: ExternalBlob;
    location: string;
    equipment_id: string;
}
export interface Equipment {
    id: string;
    status: string;
    last_update_time: bigint;
    name: string;
    last_location: string;
    assigned_operator?: string;
}
export interface Assignment {
    id: string;
    operator_id: string;
    action: string;
    timestamp: bigint;
    location: string;
    equipment_id: string;
}
export interface ActivityLog {
    id: string;
    action: string;
    user_id: string;
    timestamp: bigint;
    details: string;
}
export interface UserProfile {
    role: string;
    display_name: string;
    login_time: bigint;
    employee_id: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addEquipment(equipmentData: Equipment): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createAssignment(assignmentData: Assignment): Promise<void>;
    createSession(sessionData: Session): Promise<void>;
    getActivityLogsByUser(userId: string): Promise<Array<ActivityLog>>;
    getAllActivityLogs(): Promise<Array<ActivityLog>>;
    getAllAssignments(): Promise<Array<Assignment>>;
    getAllEquipment(): Promise<Array<Equipment>>;
    getAllIssues(): Promise<Array<Issue>>;
    getAllSessions(): Promise<Array<Session>>;
    getAssignmentsByOperator(operatorId: string): Promise<Array<Assignment>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCurrentTime(): Promise<bigint>;
    getDemoOperatorCredentials(): Promise<{
        password: string;
        role: string;
        email: string;
        display_name: string;
        employee_id: string;
    }>;
    getEquipment(id: string): Promise<Equipment | null>;
    getOpenIssues(): Promise<Array<Issue>>;
    getSession(id: string): Promise<Session | null>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    initializeAccessControl(): Promise<void>;
    isCallerAdmin(): Promise<boolean>;
    logActivity(activityData: ActivityLog): Promise<void>;
    reportIssue(issueData: Issue): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    updateEquipment(equipmentData: Equipment): Promise<void>;
    updateIssue(issueData: Issue): Promise<void>;
    validateEmployeeId(employeeId: string): Promise<{
        role: string;
        isValid: boolean;
    }>;
}
