export function getListingContactLinks(contact?: {
  phone?: string;
  email?: string;
} | null) {
  return {
    whatsappHref: contact?.phone ? `https://wa.me/${contact.phone.replace(/\D/g, "")}` : null,
    emailHref: contact?.email ? `mailto:${contact.email}` : null,
  };
}
