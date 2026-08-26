import { Router } from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { AppointmentController } from "./appointment.controller";


const router = Router();

router.post(
	"/book-appointment",
	// validateRequest(UserValidation.PatientRegistrationZodSchema),
	AppointmentController.bookAppointment,
);

//book appointment callback url
router.get("/book-appointment/payment/callback", AppointmentController.bookAppointmentCallback)

export const AppointmentRoutes = router;
