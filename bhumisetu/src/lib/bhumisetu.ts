// Shared, client-safe domain constants and helpers for BHUMISETU.

export const FIELD_KEYS = [
  "ownerName",
  "fatherOrGuardianName",
  "surveyNumber",
  "landArea",
  "landType",
  "village",
  "taluka",
  "district",
  "pincode",
  "documentNumber",
  "registrationDate",
] as const;

export type FieldKey = (typeof FIELD_KEYS)[number];

export const FIELD_LABELS: Record<FieldKey, string> = {
  ownerName: "Owner Name",
  fatherOrGuardianName: "Father / Guardian Name",
  surveyNumber: "Survey Number",
  landArea: "Land Area",
  landType: "Land Type",
  village: "Village",
  taluka: "Taluka",
  district: "District",
  pincode: "Pincode",
  documentNumber: "Document Number",
  registrationDate: "Registration Date",
};

export const REQUIRED_FIELDS: FieldKey[] = [
  "ownerName",
  "surveyNumber",
  "landArea",
  "village",
  "taluka",
  "district",
];

export const CONFIDENCE_THRESHOLD = 80;

export type OcrField = {
  value: string;
  confidence: number;
  sourceText: string;
  needsReview: boolean;
};

export type OcrFields = Record<FieldKey, OcrField>;

export const DB_COLUMN: Record<FieldKey, string> = {
  ownerName: "owner_name",
  fatherOrGuardianName: "father_or_guardian_name",
  surveyNumber: "survey_number",
  landArea: "land_area",
  landType: "land_type",
  village: "village",
  taluka: "taluka",
  district: "district",
  pincode: "pincode",
  documentNumber: "document_number",
  registrationDate: "registration_date",
};

export function confidenceLabel(c: number) {
  if (c >= 90) return "High Confidence";
  if (c >= 80) return "Acceptable";
  if (c >= 50) return "Needs Review";
  return "Very Low";
}

export function confidenceTone(c: number): "verified" | "review" | "danger" {
  if (c >= 80) return "verified";
  if (c >= 50) return "review";
  return "danger";
}

export const DOC_STATUS_LABEL: Record<string, string> = {
  UPLOADED: "Uploaded",
  PROCESSING: "Processing",
  NEEDS_REVIEW: "Needs Review",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
  OCR_FAILED: "OCR Failed",
};

export function emptyFields(): OcrFields {
  return FIELD_KEYS.reduce((acc, k) => {
    acc[k] = { value: "", confidence: 0, sourceText: "", needsReview: true };
    return acc;
  }, {} as OcrFields);
}

export const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

export const MAX_FILE_BYTES = 15 * 1024 * 1024;
