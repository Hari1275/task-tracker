const CACHE_NAME = 'todo-tracker-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/manifest.json',
  '/offline.html',
  '/icon-192.png',
  '/icon-512.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Installed');
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip chrome-extension and moz-extension requests
  if (event.request.url.startsWith('chrome-extension://') || 
      event.request.url.startsWith('moz-extension://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        if (response) {
          console.log('Service Worker: Serving from cache', event.request.url);
          return response;
        }
        
        return fetch(event.request).then((response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          // If fetch fails, try to serve a fallback
          if (event.request.destination === 'document') {
            return caches.match('/offline.html') || caches.match('/');
          }
          // For other resources, return a basic offline response
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Handle any pending actions when connection is restored
  console.log('Service Worker: Performing background sync');
}

// Background notification checking
let notificationCheckInterval;

// Start background notification checking when service worker activates
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activated');
      startBackgroundNotificationCheck();
      return self.clients.claim();
    })
  );
});

// Start periodic notification checking
function startBackgroundNotificationCheck() {
  // Clear any existing interval
  if (notificationCheckInterval) {
    clearInterval(notificationCheckInterval);
  }
  
  // Check immediately
  checkForDueNotifications();
  
  // Then check every 2 minutes
  notificationCheckInterval = setInterval(() => {
    checkForDueNotifications();
  }, 2 * 60 * 1000);
  
  console.log('Service Worker: Background notification checking started');
}

// Check for due notifications
async function checkForDueNotifications() {
  try {
    // Get todos from localStorage via message to client
    const todos = await getTodosFromStorage();
    if (!todos || todos.length === 0) return;
    
    const now = new Date();
    const notificationPromises = [];
    
    todos.forEach(todo => {
      if (!todo.completed && todo.dueDate) {
        const dueDate = new Date(todo.dueDate);
        const timeUntilDue = dueDate.getTime() - now.getTime();
        
        // Notify if due in 30 minutes or overdue (but not more than 1 hour overdue)
        if (timeUntilDue <= 30 * 60 * 1000 && timeUntilDue > -60 * 60 * 1000) {
          const isOverdue = timeUntilDue < 0;
          const notificationId = `todo-${todo.id}-${isOverdue ? 'overdue' : 'due'}`;
          
          // Check if we've already shown this notification
          if (!hasNotificationBeenShown(notificationId)) {
            const options = {
              body: `${todo.text}${isOverdue ? ' is overdue' : ' is due in 30 minutes'}`,
              icon: '/icon-192.png',
              badge: '/icon-192.png',
              tag: notificationId,
              requireInteraction: isOverdue, // Keep overdue notifications visible
              actions: [
                {
                  action: 'complete',
                  title: 'Mark Complete',
                  icon: '/icon-192.png'
                },
                {
                  action: 'view',
                  title: 'View Task',
                  icon: '/icon-192.png'
                }
              ],
              data: {
                todoId: todo.id,
                action: 'todo-notification',
                url: `/?filter=${isOverdue ? 'overdue' : 'due-today'}`
              },
              vibrate: isOverdue ? [200, 100, 200] : [100],
              silent: false
            };
            
            const title = isOverdue ? '⚠️ Overdue Task!' : '⏰ Task Due Soon!';
            
            notificationPromises.push(
              self.registration.showNotification(title, options).then(() => {
                markNotificationAsShown(notificationId);
              })
            );
          }
        }
      }
    });
    
    if (notificationPromises.length > 0) {
      await Promise.all(notificationPromises);
      console.log(`Service Worker: Sent ${notificationPromises.length} notifications`);
    }
  } catch (error) {
    console.error('Service Worker: Error checking notifications:', error);
  }
}

// Get todos from client storage
async function getTodosFromStorage() {
  try {
    const clients = await self.clients.matchAll();
    if (clients.length === 0) {
      // No active clients, try to get from IndexedDB or return null
      return null;
    }
    
    // Send message to client to get todos
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.todos);
      };
      
      clients[0].postMessage({
        type: 'GET_TODOS'
      }, [messageChannel.port2]);
      
      // Timeout after 5 seconds
      setTimeout(() => resolve(null), 5000);
    });
  } catch (error) {
    console.error('Service Worker: Error getting todos:', error);
    return null;
  }
}

// Track shown notifications to prevent duplicates
const shownNotifications = new Set();

function hasNotificationBeenShown(notificationId) {
  return shownNotifications.has(notificationId);
}

function markNotificationAsShown(notificationId) {
  shownNotifications.add(notificationId);
  // Clean up old notifications after 2 hours
  setTimeout(() => {
    shownNotifications.delete(notificationId);
  }, 2 * 60 * 60 * 1000);
}

// Enhanced push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'push-notification',
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || [],
      data: data.data || {},
      vibrate: data.vibrate || [100],
      silent: data.silent || false
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Enhanced notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event.action);
  event.notification.close();
  
  const data = event.notification.data;
  
  if (event.action === 'complete' && data.todoId) {
    // Handle complete action
    event.waitUntil(
      handleCompleteAction(data.todoId)
    );
  } else if (event.action === 'view' || !event.action) {
    // Handle view action or default click
    const url = data.url || '/';
    event.waitUntil(
      clients.matchAll().then((clientList) => {
        // Check if app is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.focus();
            client.postMessage({
              type: 'NAVIGATE',
              url: url
            });
            return;
          }
        }
        // If app is not open, open it
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  }
});

// Handle complete action from notification
async function handleCompleteAction(todoId) {
  try {
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
      clients[0].postMessage({
        type: 'COMPLETE_TODO',
        todoId: todoId
      });
    }
  } catch (error) {
    console.error('Service Worker: Error completing todo:', error);
  }
}

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('Service Worker: Notification closed', event.notification.tag);
  
  // Track notification dismissals for analytics
  const data = event.notification.data;
  if (data && data.action === 'todo-notification') {
    // Could send analytics data here
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  } else if (event.tag === 'notification-sync') {
    event.waitUntil(checkForDueNotifications());
  }
});

// Enhanced background sync
async function doBackgroundSync() {
  console.log('Service Worker: Performing background sync');
  
  try {
    // Sync any pending todo changes
    await syncPendingChanges();
    
    // Check for notifications
    await checkForDueNotifications();
    
    console.log('Service Worker: Background sync completed');
  } catch (error) {
    console.error('Service Worker: Background sync failed:', error);
  }
}

// Sync pending changes when back online
async function syncPendingChanges() {
  try {
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
      clients[0].postMessage({
        type: 'SYNC_PENDING_CHANGES'
      });
    }
  } catch (error) {
    console.error('Service Worker: Error syncing pending changes:', error);
  }
}

// Periodic background sync registration
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'REGISTER_BACKGROUND_SYNC') {
    event.waitUntil(
      self.registration.sync.register('notification-sync')
    );
  }
});