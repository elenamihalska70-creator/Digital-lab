import { useEffect, useId, useState } from "react";
import {
  ALLOWED_DOCUMENT_EXTENSIONS,
  createRequestDocumentUrl,
  getRequestDocuments,
  MAX_DOCUMENT_SIZE,
  uploadRequestDocument,
} from "../services/requestDocuments";

const formatFileSize = (size) => {
  if (!size) {
    return "Taille inconnue";
  }

  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} Ko`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDocumentDate = (createdAt) => {
  if (!createdAt) {
    return "";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(createdAt));
};

export function RequestDocuments({ request, userId, role }) {
  const inputId = useId();
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDocuments = async () => {
    if (!request?.id) {
      setDocuments([]);
      setIsLoading(false);
      setErrorMessage("");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    const { data, error } = await getRequestDocuments(request.id);

    if (error) {
      console.error("REQUEST DOCUMENTS LOAD ERROR:", error);
      setErrorMessage("Les documents n’ont pas pu être chargés pour le moment.");
      setDocuments([]);
    } else {
      setDocuments(data ?? []);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!isMounted) {
        return;
      }

      await loadDocuments();
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [request?.id]);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !request?.id || !userId) {
      return;
    }

    setIsUploading(true);
    setErrorMessage("");

    const { error } = await uploadRequestDocument({
      requestId: request.id,
      userId,
      role,
      file,
    });

    if (error) {
      console.error("REQUEST DOCUMENT UPLOAD ERROR:", error);
      setErrorMessage("Le fichier n’a pas pu être ajouté. Vérifiez le format puis réessayez.");
    } else {
      await loadDocuments();
    }

    setIsUploading(false);
  };

  const handleOpenDocument = async (document) => {
    setErrorMessage("");

    const { data, error } = await createRequestDocumentUrl(document.file_path);

    if (error) {
      console.error("REQUEST DOCUMENT OPEN ERROR:", error);
      setErrorMessage("Le fichier n’a pas pu être ouvert pour le moment.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="request-documents" aria-label="Documents de la demande">
      <div className="documents-heading">
        <div>
          <span>Documents</span>
          <h3>Fichiers liés à la demande</h3>
        </div>
        {request?.id && (
          <label className="document-upload-button" htmlFor={inputId}>
            {isUploading ? "Ajout en cours..." : "Ajouter un fichier"}
            <input
              accept={ALLOWED_DOCUMENT_EXTENSIONS.map((extension) => `.${extension}`).join(",")}
              disabled={isUploading}
              id={inputId}
              type="file"
              onChange={handleUpload}
            />
          </label>
        )}
      </div>

      <p className="documents-help">PDF, PNG, JPG, DOC ou DOCX. Taille maximale : {formatFileSize(MAX_DOCUMENT_SIZE)}.</p>

      {!request?.id && (
        <div className="documents-empty-state">
          <span aria-hidden="true">DL</span>
          <p>Sélectionnez une demande pour consulter les documents.</p>
        </div>
      )}
      {isLoading && (
        <div className="documents-loading" aria-label="Chargement des documents">
          <span></span>
          <span></span>
        </div>
      )}
      {errorMessage && <p className="documents-error">{errorMessage}</p>}

      {!isLoading && request?.id && documents.length === 0 && (
        <div className="documents-empty-state">
          <span aria-hidden="true">DL</span>
          <p>Aucun document ajouté pour le moment.</p>
        </div>
      )}

      {documents.length > 0 && (
        <div className="documents-list">
          {documents.map((document) => (
            <button
              className="document-item"
              key={document.id}
              type="button"
              onClick={() => handleOpenDocument(document)}
            >
              <span className="document-icon" aria-hidden="true">
                ▣
              </span>
              <span>
                <strong>{document.file_name}</strong>
                <small>
                  {formatFileSize(document.file_size)} · {document.uploaded_by_role === "admin" ? "Digital Lab" : "Client"} ·{" "}
                  {formatDocumentDate(document.created_at)}
                </small>
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
