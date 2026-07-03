import { router } from "@/server/trpc";
import { authRouter } from "@/server/routers/auth";
import { patientRouter } from "@/server/routers/patient";
import { triageRouter } from "@/server/routers/triage";
import { queueRouter } from "@/server/routers/queue";
import { notificationRouter } from "@/server/routers/notification";
import { staffRouter } from "@/server/routers/staff";
import { adminRouter } from "@/server/routers/admin";

export const appRouter = router({
  auth: authRouter,
  patient: patientRouter,
  triage: triageRouter,
  queue: queueRouter,
  notification: notificationRouter,
  staff: staffRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
