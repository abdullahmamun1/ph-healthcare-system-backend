import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { ScheduleServices } from "./schedule.service";

const createSchedule = catchAsync(async (req: Request, res: Response) => {
	const payload = req.body;
	const user = req.user!;

	const result = await ScheduleServices.createSchedule(payload, user);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Schedule Created successfully",
		data: result,
	});
});
const getMySchedules = catchAsync(async (req: Request, res: Response) => {
	const user = req.user!;

	const { data, meta } = await ScheduleServices.getMySchedules(req.query, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "My Schedules Retrieved successfully",
		data,
		meta,
	});
});
const getTodaysSchedules = catchAsync(async (req: Request, res: Response) => {
	const { data, meta } = await ScheduleServices.getTodaysSchedules(req.query);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Today's Schedules Retrieved successfully",
		data,
		meta,
	});
});
const getScheduleById = catchAsync(async (req: Request, res: Response) => {
	const scheduleId = req.params.scheduleId as string;

	const result = await ScheduleServices.getScheduleById(scheduleId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Schedule Retrieved successfully",
		data: result,
	});
});
const getAllSchedules = catchAsync(async (req: Request, res: Response) => {
	const { data, meta } = await ScheduleServices.getAllSchedules(req.query);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "All Schedules Retrieved successfully",
		data,
		meta,
	});
});
const updateSchedule = catchAsync(async (req: Request, res: Response) => {
	const scheduleId = req.params.scheduleId as string;
	const payload = req.body;
	const user = req.user!;

	const result = await ScheduleServices.updateSchedule(
		scheduleId,
		payload,
		user,
	);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Schedule updated successfully",
		data: result,
	});
});
const publishSchedule = catchAsync(async (req: Request, res: Response) => {
	const scheduleId = req.params.scheduleId as string;
	const user = req.user!;

	const result = await ScheduleServices.publishSchedule(scheduleId, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Schedule published successfully",
		data: result,
	});
});
const deleteSchedule = catchAsync(async (req: Request, res: Response) => {
	const scheduleId = req.params.scheduleId as string;
	const user = req.user!;

	const result = await ScheduleServices.deleteSchedule(scheduleId, user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Schedule deleted successfully",
		data: result,
	});
});

export const scheduleController = {
	createSchedule,
	getMySchedules,
	getTodaysSchedules,
	getScheduleById,
	getAllSchedules,
	updateSchedule,
	publishSchedule,
	deleteSchedule,
};
