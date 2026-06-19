import { useEffect, useRef, useState } from "react";
import { useConversation } from "../hooks/useConversation";
import { RequestMessage } from "./RequestMessage";
import { markRequestMessagesAsRead } from "../services/requestMessages";

export function RequestConversation({ request, senderRole, senderId, onMessagesRead }) {
  const [draftMessage, setDraftMessage] = useState("");
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const { messages, isLoading, isSending, errorMessage, sendMessage } = useConversation({
    requestId: request?.id,
    senderRole,
    senderId,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    let isActive = true;

    const markMessagesRead = async () => {
      if (!request?.id || !senderRole) {
        return;
      }

      const { error } = await markRequestMessagesAsRead({ requestId: request.id, viewerRole: senderRole });

      if (!error && isActive) {
        onMessagesRead?.(request.id);
      } else if (error && isActive) {
        console.warn("REQUEST MESSAGES READ ERROR:", error);
      }
    };

    markMessagesRead();

    return () => {
      isActive = false;
    };
  }, [messages.length, onMessagesRead, request?.id, senderRole]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const { error } = await sendMessage(draftMessage);

    if (!error) {
      setDraftMessage("");
      window.setTimeout(() => textareaRef.current?.focus(), 0);
    }
  };

  if (!request?.id) {
    return (
      <aside className="request-conversation">
        <div className="conversation-heading">
          <span>Conversation</span>
          <h3>Sélectionnez une demande</h3>
        </div>
        <div className="conversation-empty-state">
          <span aria-hidden="true">DL</span>
          <p>Ouvrez une demande pour consulter les messages.</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="request-conversation">
      <div className="conversation-heading">
        <span>Conversation</span>
        <h3>{request.reference || request.project_type || "Demande"}</h3>
      </div>

      <div className="conversation-thread" aria-live="polite">
        {isLoading && (
          <div className="conversation-loading" aria-label="Chargement des messages">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
        {!isLoading && errorMessage && <p className="conversation-error">{errorMessage}</p>}
        {!isLoading && !errorMessage && messages.length === 0 && (
          <div className="conversation-empty-state">
            <span aria-hidden="true">DL</span>
            <p>Aucun message pour le moment.</p>
          </div>
        )}
        {messages.map((message) => (
          <RequestMessage currentRole={senderRole} key={message.id} message={message} />
        ))}
        <div ref={messagesEndRef}></div>
      </div>

      <form className="conversation-form" onSubmit={handleSubmit}>
        <label htmlFor={`conversation-message-${request.id}`}>Écrire un message</label>
        <textarea
          id={`conversation-message-${request.id}`}
          ref={textareaRef}
          value={draftMessage}
          placeholder="Écrire un message..."
          rows="4"
          onChange={(event) => setDraftMessage(event.target.value)}
        ></textarea>
        <button className="btn btn-primary" type="submit" disabled={isSending || !draftMessage.trim()}>
          {isSending ? "Envoi en cours..." : "Envoyer"}
        </button>
      </form>
    </aside>
  );
}
