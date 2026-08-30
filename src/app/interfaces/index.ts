import type {
	DoctorVerificationStatus,
	Role,
} from "../../generated/prisma/enums";

export interface UserPayload {
	name: string;
	email: string;
	password?: string;
	role?: Role;
}

export interface DoctorPayload {
	address?: string;
	specialiaztion: string;
	licenseNumber: string;
	qualification: string;
	experienceYears: number;
	bio?: string;
	consultationFee?: number;
	contactNumber?: string;
}

export interface IApplyAsDoctorPayload {
	user: UserPayload;
	doctor: DoctorPayload;
}

export interface IVerifyDoctorEmailPayload {
	email: string;
	otp: string;
}

export interface IApproveDoctorPayload {
	doctorId: string;
	verificationStatus: DoctorVerificationStatus;
	rejectionReason: string;
}

export interface IQueryParams {
	searchTerm?: string;
	page?: string;
	limit?: string;
	sortBy?: string;
	sortOrder?: "asc" | "desc";

	[key: string]: any;
}
