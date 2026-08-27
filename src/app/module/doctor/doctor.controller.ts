import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { DoctorServices } from "./doctor.service";
import { applyDoctorValidationZodSchema } from "./doctor.validation";

const applyAsDoctor = catchAsync(async (req: Request, res: Response) => {
	const files = req.files as { [fieldName: string]: Express.Multer.File[] };

	const resume = files?.["resume"] ? files["resume"][0] : null;
	const additionalFiles = files?.["additionalFiles"] || [];

	const zodValidationResult = applyDoctorValidationZodSchema.safeParse(
		JSON.parse(req.body.data),
	);
	if (!zodValidationResult.success) {
		throw new Error(zodValidationResult.error?.issues[0].message);
	}

	const payload = zodValidationResult.data

	const result = await DoctorServices.applyAsDoctor(
		payload,
		resume,
		additionalFiles,
	);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Applied as Doctor successfully",
		data: result,
	});
});

const verifyDoctorEmail = catchAsync(async (req: Request, res: Response) => {
	
	const payload = req.body;

	const result = await DoctorServices.verifyDoctorEmail(payload)
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Doctor Email Verified successfully",
		data: result,
	});
});

export const DoctorController = {
	applyAsDoctor,
	verifyDoctorEmail
};
