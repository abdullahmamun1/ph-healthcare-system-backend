import { Router } from "express";
import { upload } from "../../lib/multer";
import { DoctorController } from "./doctor.controller";
import { validateRequest } from "../../middleware/validateRequest";
import { doctorValidation } from "./doctor.validation";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const router = Router();

router.post(
	"/apply-as-doctor",
	upload.fields([
		{ name: "resume", maxCount: 1 },
		{ name: "additionalFiles", maxCount: 10 },
	]),
	DoctorController.applyAsDoctor,
);
router.post(
	"/apply-as-doctor/verify-email",
	validateRequest(doctorValidation.DoctorEmailVerificationZodSchema),
	DoctorController.verifyDoctorEmail,
);
router.post(
	"/approve-doctor",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	validateRequest(doctorValidation.ApproveDoctorPayloadSchema),
	DoctorController.verifyDoctorEmail,
);

router.get(
	"/all-doctors",
	auth(Role.ADMIN, Role.SUPER_ADMIN),
	DoctorController.getAllDoctors,
);

export const DoctorRoutes = router;
