import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { UserServices } from "./user.service";

const uploadProfileImage = catchAsync(async (req: Request, res: Response) => {

    if(!req.file){
        throw new Error("No file uploaded")
    }
    const userId = req.user?.userId
    const result = await UserServices.uploadProfileImage(req.file?.buffer as Buffer, userId as string)
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Profile Image Uploaded Successfully",
		data: result,
	});
});

export const UserController = {
	uploadProfileImage,
};
