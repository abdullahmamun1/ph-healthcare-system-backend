import {
	addDays,
	differenceInMinutes,
	isAfter,
	isSameDay,
	startOfDay,
} from "date-fns";
import httpStatus from "http-status";
import { ScheduleStatus } from "../../../generated/prisma/enums";
import type { ScheduleWhereInput } from "../../../generated/prisma/models";
import type { IQueryParams } from "../../interfaces";
import { prisma } from "../../lib/prisma";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import type {
	ICreateSchedulePayload,
	IUpdateSchedulePayload,
} from "./schedule.interface";

const createSchedule = async (
	payload: ICreateSchedulePayload,
	user: RequestUser,
) => {
	const doctor = await prisma.doctor.findUnique({
		where: { userId: user.userId },
	});
	if (!doctor) {
		throw new AppError(httpStatus.NOT_FOUND, "Doctor Profile Not Found!");
	}

	if (!isSameDay(payload.startDateTime, payload.endDateTime)) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Start Date Time and End Date Time Must be on the Same day",
		);
	}
	if (isAfter(payload.startDateTime, payload.endDateTime)) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Start Date Time cannot be after End Date Time",
		);
	}

	const startOfTheDay = startOfDay(payload.startDateTime);
	const startOfNextDay = addDays(startOfTheDay, 1);

	const existingScheduleOnThisDay = await prisma.schedule.findFirst({
		where: {
			doctorId: doctor.id,
			isDeleted: false,
			startDateTime: {
				gte: startOfTheDay,
				lt: startOfNextDay,
			},
		},
	});

	if (existingScheduleOnThisDay) {
		throw new AppError(
			httpStatus.CONFLICT,
			"You already have a schedule for this date",
		);
	}

	const durationInMinutes = differenceInMinutes(
		payload.endDateTime,
		payload.startDateTime,
	);

	const MINUTES_ALLOCATED_PER_SLOT = 20;

	const totalSlots = Math.floor(durationInMinutes / MINUTES_ALLOCATED_PER_SLOT);

	if (totalSlots < 1) {
		throw new AppError(
			httpStatus.CONFLICT,
			`Schedule Must Be At Least ${MINUTES_ALLOCATED_PER_SLOT} Minutes Long To Fit One Slot`,
		);
	}

	const schedule = await prisma.schedule.create({
		data: {
			startDateTime: payload.startDateTime,
			endDateTime: payload.endDateTime,
			meetingLink: payload.meetingLink,
			totalSlots,
			availableSlots: totalSlots,
			doctorId: doctor.id,
		},
		include: {
			doctor: {
				select: {
					name: true,
					email: true,
					contactNumber: true,
				},
			},
		},
	});

	return schedule;
};

const getMySchedules = async (query: IQueryParams, user: RequestUser) => {
	const limit = query.limit ? Number(query.limit) : 10;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy || "createdAt";
	const sortOrder = query.sortOrder || "desc";

	const doctor = await prisma.doctor.findUnique({
		where: { userId: user.userId },
	});
	if (!doctor) {
		throw new AppError(httpStatus.NOT_FOUND, "Doctor Profile Not Found!");
	}

	const andConditions: ScheduleWhereInput[] = [
		{
			doctorId: doctor.id,
		},
		{
			isDeleted: false,
		},
	];

	if (query.status) {
		andConditions.push({
			status: query.status,
		});
	}

	const schedules = await prisma.schedule.findMany({
		where: {
			AND: andConditions,
		},
		take: limit,
		skip: skip,
		orderBy: {
			[sortBy]: sortOrder,
		},
		include: {
			appointments: {
				include: {
					patient: true,
				},
			},
		},
	});
	const totalScheduleCount = await prisma.schedule.count({
		where: {
			AND: andConditions,
		},
	});

	return {
		data: schedules,
		meta: {
			page,
			limit,
			total: totalScheduleCount,
			totalPages: Math.ceil(totalScheduleCount / limit),
		},
	};
};

const getTodaysSchedules = async (query: IQueryParams) => {
	const limit = query.limit ? Number(query.limit) : 10;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy || "createdAt";
	const sortOrder = query.sortOrder || "desc";

	const doctor = await prisma.doctor.findUnique({
		where: { id: query.doctorId },
	});
	if (!doctor) {
		throw new AppError(httpStatus.NOT_FOUND, "Doctor Profile Not Found!");
	}

	if (!query.doctorId) {
		throw new AppError(
			httpStatus.NOT_FOUND,
			"Doctor ID Must be Provided in Query",
		);
	}

	const now = new Date();
	const startOfToday = startOfDay(now);
	const startOfTommorrow = addDays(startOfToday, 1);

	const andConditions: ScheduleWhereInput[] = [
		{ doctorId: query.doctorId },
		{ isDeleted: false },
		{ status: ScheduleStatus.PUBLISHED },
		{
			startDateTime: {
				gte: startOfToday,
				lt: startOfTommorrow,
				gt: now,
			},
		},
		{ availableSlots: { gt: 0 } },
	];
	if (query.specialization) {
		andConditions.push({
			doctor: {
				specialization: {
					equals: query.specialization,
					mode: "insensitive",
				},
			},
		});
	}

	const schedules = await prisma.schedule.findMany({
		where: {
			AND: andConditions,
		},
		take: limit,
		skip: skip,
		orderBy: {
			[sortBy]: sortOrder,
		},
	});

	const totalScheduleCount = await prisma.schedule.count({
		where: {
			AND: andConditions,
		},
	});

	return {
		data: schedules,
		meta: {
			page,
			limit,
			total: totalScheduleCount,
			totalPages: Math.ceil(totalScheduleCount / limit),
		},
	};
};

const getScheduleById = async (scheduleId: string) => {
	const schedule = await prisma.schedule.findUnique({
		where: {
			id: scheduleId,
		},
		include: {
			doctor: {
				select: {
					id: true,
					name: true,
					email: true,
					specialization: true,
					userId: true,
				},
			},
			appointments: {
				include: {
					patient: true,
				},
			},
		},
	});

	if (!schedule || schedule.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Schedule Not Found!");
	}

	return schedule;
};

const getAllSchedules = async (query: IQueryParams) => {
	const limit = query.limit ? Number(query.limit) : 10;
	const page = query.page ? Number(query.page) : 1;
	const skip = (page - 1) * limit;
	const sortBy = query.sortBy || "createdAt";
	const sortOrder = query.sortOrder || "desc";

	const andConditions: ScheduleWhereInput[] = [];

	if (query.status) {
		andConditions.push({
			status: query.status,
		});
	}
	if (query.email) {
		andConditions.push({ doctor: { email: query.email } });
	}

	if (query.doctorId) {
		andConditions.push({
			doctorId: query.doctorId,
		});
	}

	//Searching
	if (query.searchTerm) {
		andConditions.push({
			doctor: {
				OR: [
					{ name: { contains: query.searchTerm, mode: "insensitive" } },
					{ email: { contains: query.searchTerm, mode: "insensitive" } },
					{
						specialization: { contains: query.searchTerm, mode: "insensitive" },
					},
					{
						licenseNumber: { contains: query.searchTerm, mode: "insensitive" },
					},
				],
			},
		});
	}

	const schedules = await prisma.schedule.findMany({
		where: {
			AND: andConditions,
		},
		take: limit,
		skip: skip,
		orderBy: {
			[sortBy]: sortOrder,
		},
		include: {
			appointments: {
				include: {
					patient: true,
				},
			},
		},
	});
	const totalScheduleCount = await prisma.schedule.count({
		where: {
			AND: andConditions,
		},
	});

	return {
		data: schedules,
		meta: {
			page,
			limit,
			total: totalScheduleCount,
			totalPages: Math.ceil(totalScheduleCount / limit),
		},
	};
};

const updateSchedule = async (
	scheduleId: string,
	payload: IUpdateSchedulePayload,
	user: RequestUser,
) => {
	const doctor = await prisma.doctor.findUnique({
		where: { userId: user.userId },
	});
	if (!doctor) {
		throw new AppError(httpStatus.NOT_FOUND, "Doctor Profile Not Found!");
	}

	const schedule = await prisma.schedule.findUnique({
		where: {
			id: scheduleId,
		},
	});

	if (!schedule || schedule.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Schedule Not Found!");
	}

	if (
		schedule.status === ScheduleStatus.PUBLISHED &&
		schedule.totalSlots !== schedule.availableSlots
	) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Schedule Once Published and Appointment Booked Cannot be Updated",
		);
	}

	if (schedule.doctorId || doctor.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not allowed to update this schedule",
		);
	}

	payload.meetingLink = payload.meetingLink || schedule.meetingLink;
	payload.startDateTime = payload.startDateTime || schedule.startDateTime;
	payload.endDateTime = payload.endDateTime || schedule.endDateTime;

	if (!isSameDay(payload.startDateTime, payload.endDateTime)) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Start Date Time and End Date Time Must be on the Same day",
		);
	}
	if (isAfter(payload.startDateTime, payload.endDateTime)) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Start Date Time cannot be after End Date Time",
		);
	}

	const startOfTheDay = startOfDay(payload.startDateTime);
	const startOfNextDay = addDays(startOfTheDay, 1);

	const existingScheduleOnThisDay = await prisma.schedule.findFirst({
		where: {
			doctorId: doctor.id,
			isDeleted: false,
			startDateTime: {
				gte: startOfTheDay,
				lt: startOfNextDay,
			},
		},
	});

	if (existingScheduleOnThisDay) {
		throw new AppError(
			httpStatus.CONFLICT,
			"You already have a schedule for this date",
		);
	}

	const durationInMinutes = differenceInMinutes(
		payload.endDateTime,
		payload.startDateTime,
	);

	const MINUTES_ALLOCATED_PER_SLOT = 20;

	const totalSlots = Math.floor(durationInMinutes / MINUTES_ALLOCATED_PER_SLOT);

	const updatedSchedule = await prisma.schedule.update({
		where: { id: schedule.id },
		data: {
			startDateTime: payload.startDateTime,
			endDateTime: payload.endDateTime,
			meetingLink: payload.meetingLink,
			totalSlots,
			availableSlots: totalSlots,
			doctorId: doctor.id,
		},
		include: {
			doctor: {
				select: {
					name: true,
					email: true,
					contactNumber: true,
				},
			},
		},
	});

	return updatedSchedule;
};

const publishSchedule = async (scheduleId: string, user: RequestUser) => {
	const doctor = await prisma.doctor.findUnique({
		where: { userId: user.userId },
	});
	if (!doctor) {
		throw new AppError(httpStatus.NOT_FOUND, "Doctor Profile Not Found!");
	}

	const schedule = await prisma.schedule.findUnique({
		where: {
			id: scheduleId,
		},
	});

	if (!schedule || schedule.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Schedule Not Found!");
	}

	if (schedule.doctorId !== doctor.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not allowed to update this schedule",
		);
	}

	if (schedule.status === ScheduleStatus.PUBLISHED) {
		throw new AppError(httpStatus.CONFLICT, "Schedule is Already Published");
	}

	const publishedSchedule = await prisma.schedule.update({
		where: {
			id: schedule.id,
		},
		data: {
			status: ScheduleStatus.PUBLISHED,
		},
	});

	return publishedSchedule;
};

const deleteSchedule = async (scheduleId: string, user: RequestUser) => {
	const doctor = await prisma.doctor.findUnique({
		where: { userId: user.userId },
	});
	if (!doctor) {
		throw new AppError(httpStatus.NOT_FOUND, "Doctor Profile Not Found!");
	}

	const schedule = await prisma.schedule.findUnique({
		where: {
			id: scheduleId,
		},
	});

	if (!schedule || schedule.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Schedule Not Found!");
	}

	if (schedule.doctorId || doctor.id) {
		throw new AppError(
			httpStatus.FORBIDDEN,
			"You are not allowed to update this schedule",
		);
	}

	if (
		schedule.status === ScheduleStatus.PUBLISHED &&
		schedule.totalSlots !== schedule.availableSlots
	) {
		throw new AppError(
			httpStatus.CONFLICT,
			"Schedule Once Published and Appointment Booked Cannot be Deleted",
		);
	}

	const deletedSchedule = await prisma.schedule.update({
		where: {
			id: schedule.id,
		},
		data: {
			isDeleted: true,
			deletedAt: new Date(),
		},
	});

	return deletedSchedule;
};

export const ScheduleServices = {
	createSchedule,
	getMySchedules,
	getAllSchedules,
	getTodaysSchedules,
	getScheduleById,
	updateSchedule,
	publishSchedule,
	deleteSchedule,
};
