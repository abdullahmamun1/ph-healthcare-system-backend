import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { AppointmentService } from "./appointment.service";

const bookAppointment = catchAsync(async (req: Request, res: Response) => {
	const result = await AppointmentService.bookAppointment();
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Appointment Booked successfully",
		data: result,
	});
});
const bookAppointmentCallback = catchAsync(
	async (req: Request, res: Response) => {
		const {executedPaymentResult, redirectUrl} = await AppointmentService.bookAppointmentCallback(req.query);

		console.log({executedPaymentResult}, "callback controller");

		res.redirect(redirectUrl)
	},
);

export const AppointmentController = {
	bookAppointment,
	bookAppointmentCallback,
};
