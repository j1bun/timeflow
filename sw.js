const CACHE = 'timeflow-v1.5.2';
const CORE = [
	'./',
	'./index.html',
	'./styles.css',
	'./app.js',
	'./manifest.webmanifest',
	'./icons/icon-192.png',
	'./icons/icon-512.png',
];

self.addEventListener('install', (event) => {
	event.waitUntil((async () => {
		const cache = await caches.open(CACHE);
		await cache.addAll(CORE);
		self.skipWaiting();
	})());
});

self.addEventListener('activate', (event) => {
	event.waitUntil((async () => {
		const keys = await caches.keys();
		await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
		self.clients.claim();
	})());
});

self.addEventListener('fetch', (event) => {
	const req = event.request;
	if (req.method !== 'GET') return;
	event.respondWith((async () => {
		const cached = await caches.match(req, { ignoreSearch: true });
		if (cached) return cached;
		try {
			const res = await fetch(req);
			const cache = await caches.open(CACHE);
			cache.put(req, res.clone());
			return res;
		} catch (err) {
			const fallback = await caches.match('./index.html');
			return fallback || new Response('Offline', { status: 503, statusText: 'Offline' });
		}
	})());
}); 