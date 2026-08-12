import z from "zod";

const PatientRegistrationZodSchema = z.object({
	name: z
		.string("Name must be a string")
		.min(3, "Name should contain at least 3 characters")
		.max(10, "Name should contain maximum 10 characters"),
	email: z.email("Email must be a proper email"),
	password: z
		.string()
		.min(8, "Name should contain at least 8 characters")
		.regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
		.regex(/[a-z]/, "Password must contain at least one lowercase letter.")
		.regex(/[0-9]/, "Password must contain at least one number.")
		.regex(
			/[^A-Za-z0-9]/,
			"Password must contain at least one special character.",
		),
	patient: z.object({
		contactNumber: z.string().optional(),
	}),
});

const LoginZodSehema = z.object({
	email: z.email("Email must be a proper email"),
	password: z
		.string()
		.min(8, "Name should contain at least 8 characters")
		.regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
		.regex(/[a-z]/, "Password must contain at least one lowercase letter.")
		.regex(/[0-9]/, "Password must contain at least one number.")
		.regex(
			/[^A-Za-z0-9]/,
			"Password must contain at least one special character.",
		),
});

export const UserValidation = {
	PatientRegistrationZodSchema,
	LoginZodSehema,
};
