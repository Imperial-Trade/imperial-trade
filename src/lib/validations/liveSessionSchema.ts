import { z } from "zod";

// Base validation schemas for live sessions
export const baseSessionSchemas = {
  sessionTitle: z.string()
    .min(3, "Session title must be at least 3 characters")
    .max(100, "Session title must be no more than 100 characters")
    .trim(),
  
  description: z.string()
    .max(500, "Description must be no more than 500 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  
  hostName: z.string()
    .min(2, "Host name must be at least 2 characters")
    .max(50, "Host name must be no more than 50 characters")
    .trim(),
  
  zoomMeetingUrl: z.string()
    .url("Please enter a valid Zoom meeting URL")
    .refine(
      (url) => url.includes("zoom.us") || url.includes("zoom.com"),
      "URL must be a valid Zoom meeting link"
    ),
  
  zoomMeetingId: z.string()
    .min(9, "Meeting ID must be at least 9 characters")
    .max(15, "Meeting ID must be no more than 15 characters")
    .regex(/^[\d\s-]+$/, "Meeting ID can only contain numbers, spaces, and dashes")
    .optional(),
  
  zoomPasscode: z.string()
    .min(1, "Passcode must be at least 1 character")
    .max(20, "Passcode must be no more than 20 characters")
    .optional(),
  
  sessionDate: z.string()
    .refine((date) => {
      const selectedDate = new Date(date);
      const now = new Date();
      return selectedDate > now;
    }, "Session date must be in the future"),
  
  status: z.enum(['scheduled', 'live', 'completed'], {
    errorMap: () => ({ message: "Please select a valid session status" })
  }),
  
  autoStartEnabled: z.boolean().default(true)
};

// Create live session schema
export const createLiveSessionSchema = z.object({
  session_title: baseSessionSchemas.sessionTitle,
  description: baseSessionSchemas.description,
  host_name: baseSessionSchemas.hostName,
  zoom_meeting_url: baseSessionSchemas.zoomMeetingUrl,
  zoom_meeting_id: baseSessionSchemas.zoomMeetingId,
  zoom_passcode: baseSessionSchemas.zoomPasscode,
  session_date: baseSessionSchemas.sessionDate,
  auto_start_enabled: baseSessionSchemas.autoStartEnabled,
}).refine((data) => {
  // Ensure session is scheduled at least 5 minutes in the future
  const sessionDate = new Date(data.session_date);
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
  return sessionDate >= fiveMinutesFromNow;
}, {
  message: "Session must be scheduled at least 5 minutes in the future",
  path: ["session_date"]
});

// Update live session schema
export const updateLiveSessionSchema = z.object({
  session_title: baseSessionSchemas.sessionTitle.optional(),
  description: baseSessionSchemas.description,
  host_name: baseSessionSchemas.hostName.optional(),
  zoom_meeting_url: baseSessionSchemas.zoomMeetingUrl.optional(),
  zoom_meeting_id: baseSessionSchemas.zoomMeetingId,
  zoom_passcode: baseSessionSchemas.zoomPasscode,
  session_date: z.string().optional(),
  status: baseSessionSchemas.status.optional(),
  auto_start_enabled: baseSessionSchemas.autoStartEnabled.optional(),
}).refine((data) => {
  // If session_date is being updated, ensure it's in the future
  if (data.session_date) {
    const sessionDate = new Date(data.session_date);
    const now = new Date();
    return sessionDate > now;
  }
  return true;
}, {
  message: "Session date must be in the future",
  path: ["session_date"]
});

// Status update schema for quick status changes
export const statusUpdateSchema = z.object({
  status: baseSessionSchemas.status,
});

// Type exports
export type CreateLiveSessionData = z.infer<typeof createLiveSessionSchema>;
export type UpdateLiveSessionData = z.infer<typeof updateLiveSessionSchema>;
export type StatusUpdateData = z.infer<typeof statusUpdateSchema>;

// Validation functions with caching
const cachedValidations = new Map<string, any>();

export const validateCreateSession = (data: unknown): z.SafeParseReturnType<unknown, CreateLiveSessionData> => {
  return createLiveSessionSchema.safeParse(data);
};

export const validateUpdateSession = (data: unknown): z.SafeParseReturnType<unknown, UpdateLiveSessionData> => {
  return updateLiveSessionSchema.safeParse(data);
};

export const validateStatusUpdate = (data: unknown): z.SafeParseReturnType<unknown, StatusUpdateData> => {
  return statusUpdateSchema.safeParse(data);
};