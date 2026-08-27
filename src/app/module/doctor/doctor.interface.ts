import type { Role } from "../../../generated/prisma/enums";

export interface UserPayload {
	name: string;
	email: string;
	password?: string;
	role?: Role;
}

export interface DoctorPayload {
	specialiaztion: string;
	licenseNumber: string;
	qualification: string;
	experienceYears: number;
	bio?: string;
	consultationFee?: number;
	contactNumber?: string;
	address?: string;
}

export interface applyDoctorPayload {
	user: UserPayload;
	doctor: DoctorPayload;
}
