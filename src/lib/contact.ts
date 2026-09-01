/**
 * Where the contact form goes. Both values come from the environment so a
 * deploy can change them without a code edit — see .env.example.
 */

/** The address shown on the page, and the one the mail-client fallback opens. */
export const CONTACT_EMAIL =
  import.meta.env.PUBLIC_CONTACT_EMAIL || 'loremipsum@gmail.com';

/**
 * A form endpoint that forwards straight to CONTACT_EMAIL — Formspree, Basin,
 * Web3Forms, anything that accepts a JSON POST.
 * Leave it empty and the form composes the message into the visitor's own mail
 * client instead, so the page is never a dead end while this is unset.
 */
export const CONTACT_ENDPOINT = import.meta.env.PUBLIC_CONTACT_ENDPOINT || '';

/**
 * Only Web3Forms-style services need this: they identify the inbox by a key in
 * the request body rather than in the URL. Empty for Formspree and Basin.
 */
export const CONTACT_ACCESS_KEY = import.meta.env.PUBLIC_CONTACT_ACCESS_KEY || '';
