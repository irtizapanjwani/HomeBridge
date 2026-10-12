// Minimal service worker so browsers offer "Install" for the home page.
// It deliberately does not cache anything, so visitors always see fresh content.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
