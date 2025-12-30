import { ZoomSession } from "../models/ZoomSession.model";
import { SeedContext } from "./seedContext";

export async function seedZoomSessions(context: SeedContext) {
  await ZoomSession.deleteMany();

  await ZoomSession.create({
    batch: context.batchId,
    teacher: context.teacherId,
    zoomLink: "https://zoom.us/j/123456789",
    classDate: new Date(),
    startTime: "10:00",
    endTime: "11:00",
    status: "SCHEDULED",
  });

  console.log("✅ Zoom sessions seeded");
}
