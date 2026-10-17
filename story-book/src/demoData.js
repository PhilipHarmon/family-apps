import seedStory from './data/seed-story.json';

/* Minimal in-browser demo backend for ?demo=1. Mirrors the /stories API
 * shape so the app works end-to-end with zero server. */
let demoStories = null;

function ensure() {
  if (!demoStories) demoStories = [JSON.parse(JSON.stringify(seedStory))];
  return demoStories;
}

export function handleDemoRequest(method, path, body) {
  const stories = ensure();

  if (method === 'GET' && path === '/stories') {
    return Promise.resolve(stories);
  }
  if (method === 'POST' && path === '/stories') {
    const doc = {
      _id: `demo-${Date.now()}`,
      createdAt: new Date().toISOString(),
      title: '',
      tellers: [],
      passages: [],
      ...(body || {}),
    };
    stories.unshift(doc);
    return Promise.resolve(doc);
  }
  const m = path.match(/^\/stories\/([\w-]+)$/);
  if (m) {
    const id = m[1];
    const idx = stories.findIndex((s) => s._id === id);
    if (method === 'GET') return Promise.resolve(idx >= 0 ? stories[idx] : null);
    if (method === 'DELETE') {
      if (idx >= 0) stories.splice(idx, 1);
      return Promise.resolve({ deleted: true });
    }
    if (method === 'PUT' && idx >= 0) {
      stories[idx] = { ...stories[idx], ...(body || {}) };
      return Promise.resolve(stories[idx]);
    }
  }
  return Promise.reject(new Error(`Demo mode: unsupported ${method} ${path}`));
}
