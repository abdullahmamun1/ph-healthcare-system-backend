import { addDays, differenceInMinutes, startOfDay } from "date-fns";
import httpStatus from "http-status";
import type { ScheduleWhereInput } from "../../../generated/prisma/models";
import type { IQueryParams } from "../../interfaces";
import { prisma } from "../../lib/prisma";
import type { RequestUser } from "../../middleware/checkAuth";
import { AppError } from "../../utils/AppError";
import type { ICreateSchedulePayload } from "./schedule.interface";

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
		payload.startDateTime,
		payload.endDateTime,
	);

	const MINUTES_ALLOCATED_PER_SLOT = 20;

	const totalSlots = Math.floor(durationInMinutes / MINUTES_ALLOCATED_PER_SLOT);

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
						specialiaztion: { contains: query.searchTerm, mode: "insensitive" },
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
					specialiaztion: true,
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

export const ScheduleServices = {
	createSchedule,
	getMySchedules,
	getAllSchedules,
	getScheduleById,
};
