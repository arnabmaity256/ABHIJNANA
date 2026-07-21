export function getPublicUrl() {
  const host = window.location.host;
  const protocol = window.location.protocol;
  // adminabhijnana.rkmvcse.in → abhijnana.rkmvcse.in
  if (host.startsWith('adminabhijnana.')) {
    return `${protocol}//abhijnana.${host.substring('adminabhijnana.'.length)}`;
  }
  // Legacy: console. or admin. subdomains (local dev)
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
  if (host.startsWith('adminabhijnana.') || host.startsWith('admin.') || host.startsWith('console.')) {
    return `${protocol}//${host}`;
  }
  // abhijnana.rkmvcse.in → adminabhijnana.rkmvcse.in
  if (host.startsWith('abhijnana.')) {
    return `${protocol}//adminabhijnana.${host.substring('abhijnana.'.length)}`;
  }
  return `${protocol}//admin.${host}`;
}

export function isConsoleSubdomain() {
  const h = window.location.hostname;
  return h.startsWith('adminabhijnana.') || h.startsWith('admin.') || h.startsWith('console.');
}
