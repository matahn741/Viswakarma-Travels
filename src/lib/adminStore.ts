import mongoose from "mongoose";

export type AdminSettings = {
  blockedVehicleTypes: string[];
  closedWeekdays: number[];
  closedDates: string[];
  updatedAt?: Date;
};

const defaultSettings: AdminSettings = {
  blockedVehicleTypes: [],
  closedWeekdays: [],
  closedDates: [],
};

let connectPromise: Promise<typeof mongoose> | null = null;

export function hasMongoConfig() {
  return Boolean(import.meta.env.MONGODB_URI);
}

async function connectMongo() {
  if (!hasMongoConfig()) {
    throw new Error("MONGODB_URI is required for admin settings.");
  }
  if (!connectPromise) {
    connectPromise = mongoose.connect(import.meta.env.MONGODB_URI);
  }
  return connectPromise;
}

const adminSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "main" },
    blockedVehicleTypes: { type: [String], default: [] },
    closedWeekdays: { type: [Number], default: [] },
    closedDates: { type: [String], default: [] },
  },
  { timestamps: true },
);

const adminActionLogSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    action: { type: String, required: true },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    ip: { type: String, default: "" },
  },
  { timestamps: true },
);

const AdminSettingsModel =
  mongoose.models.AdminSettings || mongoose.model("AdminSettings", adminSettingsSchema);

const AdminActionLogModel =
  mongoose.models.AdminActionLog || mongoose.model("AdminActionLog", adminActionLogSchema);

function normalizeSettings(settings: Partial<AdminSettings> | null | undefined): AdminSettings {
  return {
    blockedVehicleTypes: Array.from(new Set(settings?.blockedVehicleTypes ?? [])).filter(Boolean),
    closedWeekdays: Array.from(new Set(settings?.closedWeekdays ?? []))
      .map(Number)
      .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
      .sort((a, b) => a - b),
    closedDates: Array.from(new Set(settings?.closedDates ?? []))
      .filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date))
      .sort(),
    updatedAt: settings?.updatedAt,
  };
}

export async function getAdminSettings(): Promise<AdminSettings> {
  await connectMongo();
  const doc = await AdminSettingsModel.findOneAndUpdate(
    { key: "main" },
    { $setOnInsert: defaultSettings },
    { upsert: true, new: true, lean: true },
  );
  return normalizeSettings(doc as unknown as AdminSettings);
}

export async function getBookingAdminSettings(): Promise<AdminSettings> {
  if (!hasMongoConfig()) return defaultSettings;
  try {
    return await getAdminSettings();
  } catch {
    return defaultSettings;
  }
}

export async function saveAdminSettings(settings: Partial<AdminSettings>) {
  await connectMongo();
  const normalized = normalizeSettings(settings);
  const doc = await AdminSettingsModel.findOneAndUpdate(
    { key: "main" },
    {
      $set: {
        blockedVehicleTypes: normalized.blockedVehicleTypes,
        closedWeekdays: normalized.closedWeekdays,
        closedDates: normalized.closedDates,
      },
    },
    { upsert: true, new: true, lean: true },
  );
  return normalizeSettings(doc as unknown as AdminSettings);
}

export async function logAdminAction(input: {
  userId: string;
  action: string;
  details?: Record<string, unknown>;
  ip?: string;
}) {
  await connectMongo();
  await AdminActionLogModel.create({
    userId: input.userId,
    action: input.action,
    details: input.details ?? {},
    ip: input.ip ?? "",
  });
}

export async function listAdminActions(limit = 50) {
  await connectMongo();
  return AdminActionLogModel.find({})
    .sort({ createdAt: -1 })
    .limit(Math.min(Math.max(limit, 1), 100))
    .lean();
}

export function dateIsClosed(date: string, settings: AdminSettings) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return false;
  return settings.closedDates.includes(date) || settings.closedWeekdays.includes(parsed.getDay());
}
