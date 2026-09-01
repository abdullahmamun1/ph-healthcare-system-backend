import bcrypt from "bcryptjs";
import type { UploadApiResponse } from "cloudinary";
import ejs from "ejs";
import httpStatus from "http-status";
import crypto from "node:crypto";
import path from "node:path";
import {
	DoctorVerificationStatus,
	Role,
} from "../../../generated/prisma/enums";
import type { DoctorWhereInput } from "../../../generated/prisma/models";
import config from "../../config";
import type { IQueryParams } from "../../interfaces";
import { cloudinary } from "../../lib/cloudinary";
import { transporter } from "../../lib/nodemailer";
import { prisma } from "../../lib/prisma";
import { redisClient } from "../../lib/redis";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import type {
	IApplyAsDoctorPayload,
	IApproveDoctorPayload,
	IVerifyDoctorEmailPayload,
} from "./doctor.interface";

const applyAsDoctor = async (
	payload: IApplyAsDoctorPayload,
	resume: Express.Multer.File | null,
	additionalFiles: Express.Multer.File[],
) => {
	const isUserExists = await prisma.user.findUnique({
		where: {
			email: payload.user.email,
		},
	});
	if (isUserExists) {
		throw new AppError(
			httpStatus.CONFLICT,
			"User Already Exists with this Email",
		);
	}

	const resumeUploadResult = await new Promise<UploadApiResponse>(
		(resolve, reject) => {
			cloudinary.uploader
				.upload_stream(
					{
						resource_type: "auto",
					},
					(error, result) => {
						if (error) {
							return reject(error);
						}
						if (!result) {
							return reject(
								new AppError(
									httpStatus.INTERNAL_SERVER_ERROR,
									"No result returned from cloudinary",
								),
							);
						}
						resolve(result);
					},
				)
				.end(resume?.buffer);
		},
	);

	const additionalFilesUploadResults = await Promise.all(
		additionalFiles.map((file) => {
			return new Promise<UploadApiResponse>((resolve, reject) => {
				cloudinary.uploader
					.upload_stream(
						{
							resource_type: "auto",
						},
						(error, result) => {
							if (error) {
								return reject(error);
							}
							if (!result) {
								return reject(
									new AppError(
										httpStatus.INTERNAL_SERVER_ERROR,
										"No result returned from cloudinary",
									),
								);
							}
							resolve(result);
						},
					)
					.end(file.buffer);
			});
		}),
	);

	const randomDoctorPassword = Math.random().toString(36).slice(-8);

	const hashedPassword = await bcrypt.hash(
		randomDoctorPassword,
		Number(config.bcrypt_salt_rounds),
	);

	const doctorApplication = await prisma.user.create({
		data: {
			...payload.user,
			password: hashedPassword,
			role: Role.DOCTOR,
			needPasswordChange: true,
			doctor: {
				create: {
					name: payload.user.name,
					email: payload.user.email,
					...payload.doctor,
					resume: resumeUploadResult.secure_url,
					resumePublicId: resumeUploadResult.public_id,
					additionalFiles: additionalFilesUploadResults.map((file) => ({
						url: file.secure_url,
						publicId: file.public_id,
					})),
				},
			},
		},
		include: {
			doctor: true,
		},
	});

	const otpKey = `doctor-application-otp:${payload.user.email}`;
	const otpValue = crypto.randomInt(100000, 1000000).toString();

	const expiryInSec = 60 * 60;

	await redisClient.set(otpKey, otpValue, {
		expiration: {
			type: "EX",
			value: expiryInSec,
		},
	});

	const templatePath = path.join(
		process.cwd(),
		"src/app/templates/registration-user-otp.ejs",
	);

	const templateData = {
		appName: "PH Healthcare System",
		name: payload.user.name,
		expiryMinutes: expiryInSec / 60,
		otp: otpValue,
	};
	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: config.email_sender,
		to: payload.user.email,
		subject: "Doctor Application - Email Verification",
		html,
	});

	return doctorApplication;
};

const verifyDoctorEmail = async (payload: IVerifyDoctorEmailPayload) => {
	const otp = payload.otp;
	const email = payload.email.trim().toLowerCase();

	const existingUser = await prisma.user.findUnique({
		where: {
			email,
			role: Role.DOCTOR,
		},
	});
	if (!existingUser) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Doctor Application Not Found. Please Apply again.",
		);
	}
	if (existingUser.emailVerified) {
		throw new AppError(httpStatus.CONFLICT, "Email Already Verified.");
	}

	const otpKey = `doctor-application-otp:${email}`;
	const redisOtp = await redisClient.get(otpKey);
	if (!redisOtp) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"OTP Expired. Your OTP window has closed, Please Apply again.",
		);
	}
	if (redisOtp !== otp) {
		throw new AppError(httpStatus.BAD_REQUEST, "OTP does not match!");
	}

	await redisClient.del(otpKey);

	const verifiedUser = await prisma.user.update({
		where: { id: existingUser.id },
		data: { emailVerified: true },
		omit: { password: true },
		include: { doctor: true },
	});

	return verifiedUser;
};

const approveDoctor = async (
	payload: IApproveDoctorPayload,
	reviewer: RequestUser,
) => {
	const { doctorId, verificationStatus, rejectionReason } = payload;

	const existingDoctor = await prisma.doctor.findUnique({
		where: {
			id: doctorId,
		},
		include: { user: true },
	});
	if (!existingDoctor) {
		throw new AppError(httpStatus.NOT_FOUND, "Doctor Application Not Found");
	}
	if (existingDoctor.isDeleted) {
		throw new AppError(httpStatus.GONE, "Doctor Application Has been deleted");
	}
	if (!existingDoctor.user.emailVerified) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Doctor has not verified their email yet. Application cannot be reviewed",
		);
	}
	if (existingDoctor.verificationStatus !== DoctorVerificationStatus.PENDING) {
		throw new AppError(
			httpStatus.CONFLICT,
			`Doctor Application has already been ${existingDoctor.verificationStatus.toLowerCase()}`,
		);
	}
	if (
		verificationStatus === DoctorVerificationStatus.REJECTED &&
		!rejectionReason
	) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Rejection Reason is Required when Rejecting a Doctor Application.",
		);
	}

	const updatedDoctor = await prisma.doctor.update({
		where: { id: doctorId },
		data: {
			verificationStatus,
			rejectionReason:
				verificationStatus === DoctorVerificationStatus.REJECTED
					? rejectionReason
					: null,
			reviewdBy: reviewer.userId,
			reviewdAt: new Date(),
		},
	});

	const isApproved = verificationStatus === DoctorVerificationStatus.APPROVED;

	const templatePath = path.join(
		process.cwd(),
		`src/app/templates/${
			isApproved
				? "doctor-application-approved.ejs"
				: "doctor-application-rejected.ejs"
		}`,
	);

	const templateData = {
		appName: "PH Healthcare System",
		name: updatedDoctor.name,
		specialty: updatedDoctor.specialization,
		approvedAt: updatedDoctor.reviewdAt,
		supportEmail: config.email_sender,
		...(!isApproved && { reason: rejectionReason }),
	};
	const html = await ejs.renderFile(templatePath, templateData);

	await transporter.sendMail({
		from: config.email_sender,
		to: updatedDoctor.email,
		subject: isApproved
			? "Your Doctor Application Has Been Approved"
			: "Your Doctor Application Has Been Rejected",
		html,
	});

	return updatedDoctor;
};

const getAllDoctors = async (query: IQueryParams) => {
	const limit = query.limit ? Number(query.limit) : 10;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy || "createdAt";
	const sortOrder = query.sortOrder || "desc";

	const andConditions: DoctorWhereInput[] = [];

	//Searching
	if (query.searchTerm) {
		andConditions.push({
			OR: [
				{ name: { contains: query.searchTerm, mode: "insensitive" } },
				{ email: { contains: query.searchTerm, mode: "insensitive" } },
				{ specialization: { contains: query.searchTerm, mode: "insensitive" } },
				{ licenseNumber: { contains: query.searchTerm, mode: "insensitive" } },
			],
		});
	}

	//filtering
	if (query.specialization) {
		andConditions.push({
			specialization: { equals: query.specialization, mode: "insensitive" },
		});
	}
	if (query.email) {
		andConditions.push({
			specialization: { equals: query.email, mode: "insensitive" },
		});
	}
	if (query.licenseNumber) {
		andConditions.push({
			specialization: { equals: query.licenseNumber, mode: "insensitive" },
		});
	}
	if (query.verificationStatus) {
		andConditions.push({
			specialization: query.verificationStatus as DoctorVerificationStatus,
		});
	}

	andConditions.push({ isDeleted: false });

	const allDoctors = await prisma.doctor.findMany({
		//dynamic searching, filtering
		where: {
			AND: andConditions.length > 0 ? andConditions : undefined,
		},

		//dynamic sorting, pagination
		take: limit,
		skip: skip,
		orderBy: {
			[sortBy]: sortOrder,
		},
		include: {
			user: {
				omit: {
					password: true,
				},
			},
		},
	});
	const totalDoctorCount = await prisma.doctor.count({
		where: {
			AND: andConditions,
		},
	});

	return {
		data: allDoctors,
		meta: {
			page,
			limit,
			total: totalDoctorCount,
			totalPages: Math.ceil(totalDoctorCount / limit),
		},
	};
};

export const DoctorServices = {
	applyAsDoctor,
	verifyDoctorEmail,
	approveDoctor,
	getAllDoctors,
};
