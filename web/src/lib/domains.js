export function getPublicUrl() {
  const host = window.location.host;
  const protocol = window.location.protocol;
  // Strip console. or admin. if present to get the public base domain
  if (host.startsWith('admin.')) {
    return `${protocol}//${host.substring('admin.'.length)}`;
  }
  if (host.startsWith('console.')) {
    return `${protocol}//${host.substring('console.'.length)}`;
  }
  return `${protocol}//${host}`;
}

export function getConsoleUrl() {
  const host = window.location.host;
  const protocol = window.location.protocol;
  // If we are already on admin or console subdomain, just return the origin
  if (host.startsWith('admin.') || host.startsWith('console.')) {
    return `${protocol}//${host}`;
  }
  // Otherwise, prepend admin.
  return `${protocol}//admin.${host}`;
}

export function isConsoleSubdomain() {
  return window.location.hostname.startsWith('admin.') || window.location.hostname.startsWith('console.');
}
