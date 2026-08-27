import { z } from "zod";

export const applyDoctorValidationZodSchema = z.object({
	// User Payload fields
	user: z.object({
		name: z.string().trim().min(2, "Name must be at least 2 characters"),
		email: z.email("Invalid user email address").trim().toLowerCase(),
	}),

	// Doctor Payload fields
	doctor: z.object({
		specialiaztion: z.string().trim().min(2, "Specialization is required"), // Matches schema spelling
		licenseNumber: z.string().trim().min(3, "Valid license number is required"),
		qualification: z.string().trim().min(2, "Qualification is required"),
		experienceYears: z
			.number()
			.int()
			.nonnegative("Experience years must be a positive number"),
		bio: z
			.string()
			.trim()
			.max(1000, "Bio cannot exceed 1000 characters")
			.optional(),
		consultationFee: z
			.number()
			.positive("Fee must be a positive number")
			.optional(),
		contactNumber: z
			.string()
			.trim()
			.min(5, "Valid contact number is required")
			.optional(),
		address: z.string().trim().min(5, "Valid address is required").optional(),
	}),
});

// TypeScript type inference from the schema
export type ApplyDoctorInput = z.infer<typeof applyDoctorValidationZodSchema>;
