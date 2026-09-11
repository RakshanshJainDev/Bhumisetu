
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'PRIMARY',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'UPLOADED',
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT ALL ON public.documents TO service_role;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_staff_all" ON public.documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.ocr_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  document_type TEXT,
  detected_languages TEXT[] NOT NULL DEFAULT '{}',
  overall_confidence NUMERIC NOT NULL DEFAULT 0,
  fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ocr_results TO authenticated;
GRANT ALL ON public.ocr_results TO service_role;
ALTER TABLE public.ocr_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ocr_staff_all" ON public.ocr_results FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.verification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  assigned_to UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  UNIQUE (document_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.verification_queue TO authenticated;
GRANT ALL ON public.verification_queue TO service_role;
ALTER TABLE public.verification_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "queue_staff_all" ON public.verification_queue FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.land_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  owner_name TEXT NOT NULL,
  father_or_guardian_name TEXT,
  survey_number TEXT NOT NULL,
  land_area TEXT,
  land_type TEXT,
  village TEXT,
  taluka TEXT,
  district TEXT,
  pincode TEXT,
  document_number TEXT,
  registration_date TEXT,
  status TEXT NOT NULL DEFAULT 'VERIFIED',
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX land_records_owner_idx ON public.land_records (lower(owner_name));
CREATE INDEX land_records_survey_idx ON public.land_records (lower(survey_number));
GRANT SELECT ON public.land_records TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.land_records TO authenticated;
GRANT ALL ON public.land_records TO service_role;
ALTER TABLE public.land_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "land_records_public_verified" ON public.land_records FOR SELECT TO anon USING (status = 'VERIFIED');
CREATE POLICY "land_records_staff_all" ON public.land_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  document_id UUID,
  record_id UUID,
  user_id UUID,
  details TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_staff_read" ON public.audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit_staff_insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id UUID NOT NULL REFERENCES public.land_records(id) ON DELETE CASCADE,
  requested_changes JSONB NOT NULL DEFAULT '{}'::jsonb,
  requested_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '24 hours',
  status TEXT NOT NULL DEFAULT 'PENDING'
);
GRANT SELECT, INSERT, UPDATE ON public.change_requests TO authenticated;
GRANT ALL ON public.change_requests TO service_role;
ALTER TABLE public.change_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "change_requests_staff_all" ON public.change_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "docs_staff_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'documents');
CREATE POLICY "docs_staff_write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'documents');

INSERT INTO public.land_records
  (owner_name, father_or_guardian_name, survey_number, land_area, land_type, village, taluka, district, pincode, document_number, registration_date, status, verified_at)
VALUES
  ('Ramesh Patel','Kishorbhai Patel','SY-114/2','1.25 hectare','Agricultural','Devgadh','Anand','Anand','388001','DOC-AN-2019-0451','12-03-2019','VERIFIED', now()),
  ('Sunita Deshmukh','Anil Deshmukh','SY-27/A','0.80 hectare','Agricultural','Pimpalgaon','Nashik','Nashik','422003','DOC-NS-2021-1187','05-08-2021','VERIFIED', now()),
  ('Arjun Iyer','Krishnan Iyer','SY-902/6','2.10 hectare','Dry Land','Thirumangalam','Madurai','Madurai','625706','DOC-MD-2018-0093','21-11-2018','VERIFIED', now()),
  ('Meena Sharma','Rajkumar Sharma','SY-58/1','0.45 hectare','Residential','Bhondsi','Sohna','Gurugram','122102','DOC-GG-2022-0774','17-02-2022','VERIFIED', now()),
  ('Farhan Qureshi','Iqbal Qureshi','SY-311/3','3.00 hectare','Irrigated','Kadegaon','Sangli','Sangli','415304','DOC-SG-2020-0620','30-06-2020','VERIFIED', now());
