import type {
	DoctorVerificationStatus,
	Role,
} from "../../../generated/prisma/enums";

export interface UserPayload {
	name: string;
	email: string;
	password?: string;
	role?: Role;
}

export interface DoctorPayload {
	address?: string;
	specialization: string;
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

export interface IUpdateDoctorProfilePayload {
	address?: string;
	bio?: string;
	consultationFee?: number;
	contactNumber?: string;
}
