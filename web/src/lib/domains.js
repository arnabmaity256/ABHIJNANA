export function getPublicUrl() {
  const host = window.location.host;
  const protocol = window.location.protocol;
  // If we are on console subdomain, strip it to get the base domain
  if (host.startsWith('console.')) {
    return `${protocol}//${host.substring('console.'.length)}`;
  }
  return `${protocol}//${host}`;
}

export function getConsoleUrl() {
  const host = window.location.host;
  const protocol = window.location.protocol;
  // If we are already on console subdomain, just return the origin
  if (host.startsWith('console.')) {
    return `${protocol}//${host}`;
  }
  // Otherwise, prepend console.
  return `${protocol}//console.${host}`;
}

export function isConsoleSubdomain() {
  return window.location.hostname.startsWith('console.');
}
