export function isDemoMode() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('demo') === '1') sessionStorage.setItem('demoMode', '1');
    return sessionStorage.getItem('demoMode') === '1';
  } catch { return false; }
}
