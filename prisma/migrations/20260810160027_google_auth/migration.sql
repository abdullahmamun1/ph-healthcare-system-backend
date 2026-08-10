-- AlterTable
ALTER TABLE "users" ADD COLUMN     "authProvider" "AuthProvider" NOT NULL DEFAULT 'CREDENTIALS',
ALTER COLUMN "googleId" DROP NOT NULL;
