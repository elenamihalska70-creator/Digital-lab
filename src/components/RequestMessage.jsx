const formatMessageTime = (createdAt) => {
  if (!createdAt) {
    return "";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAt));
};

export function RequestMessage({ message, currentRole }) {
  const isOwnMessage = message.sender_role === currentRole;
  const senderLabel = message.sender_role === "admin" ? "Digital Lab" : "Client";

  return (
    <article className={`request-message ${isOwnMessage ? "is-own" : "is-other"} is-${message.sender_role}`}>
      <div>
        <span>{senderLabel}</span>
        <p>{message.message}</p>
        <time dateTime={message.created_at}>{formatMessageTime(message.created_at)}</time>
      </div>
    </article>
  );
}
