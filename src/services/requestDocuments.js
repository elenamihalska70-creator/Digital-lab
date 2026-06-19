import { supabase } from "./auth";

export const REQUEST_DOCUMENTS_BUCKET = "request-documents";

export const ALLOWED_DOCUMENT_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "doc", "docx"];
export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;

const getMissingConfigError = () => ({
  data: null,
  error: new Error("Supabase n’est pas configuré. Vérifiez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY."),
});

const sanitizeFileName = (fileName) =>
  fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-");

export const validateDocumentFile = (file) => {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (!ALLOWED_DOCUMENT_EXTENSIONS.includes(extension)) {
    return new Error("Format non autorisé. Ajoutez un fichier PDF, image, Word ou DOCX.");
  }

  if (file.size > MAX_DOCUMENT_SIZE) {
    return new Error("Le fichier dépasse la limite de 10 MB.");
  }

  return null;
};

export const getRequestDocuments = async (requestId) => {
  if (!supabase) {
    return getMissingConfigError();
  }

  if (!requestId) {
    return { data: [], error: null };
  }

  return supabase
    .from("request_documents")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false });
};

export const uploadRequestDocument = async ({ requestId, userId, role, file }) => {
  if (!supabase) {
    return getMissingConfigError();
  }

  const validationError = validateDocumentFile(file);

  if (validationError) {
    return { data: null, error: validationError };
  }

  const filePath = `${requestId}/${Date.now()}-${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from(REQUEST_DOCUMENTS_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    return { data: null, error: uploadError };
  }

  const { data, error } = await supabase
    .from("request_documents")
    .insert({
      request_id: requestId,
      uploaded_by: userId,
      uploaded_by_role: role,
      file_name: file.name,
      file_path: filePath,
      file_type: file.type || file.name.split(".").pop()?.toLowerCase() || "file",
      file_size: file.size,
    })
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from(REQUEST_DOCUMENTS_BUCKET).remove([filePath]);
    return { data: null, error };
  }

  return { data, error: null };
};

export const createRequestDocumentUrl = async (filePath) => {
  if (!supabase) {
    return getMissingConfigError();
  }

  return supabase.storage.from(REQUEST_DOCUMENTS_BUCKET).createSignedUrl(filePath, 60 * 5);
};
