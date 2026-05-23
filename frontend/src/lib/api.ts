import axios from "axios";

export const API_BASE_URL =
  (typeof window !== "undefined" && (window as any).__API_BASE__) ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = sessionStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("role");
      // soft redirect — don't loop on login page
      if (!window.location.pathname.includes("login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

// ---- Auth helpers ----
export type Role = "admin" | "customer";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem("token");
}
export function getRole(): Role | null {
  if (typeof window === "undefined") return null;
  return (sessionStorage.getItem("role") as Role) || null;
}
export function setAuth(token: string, role: Role) {
  sessionStorage.setItem("token", token);
  sessionStorage.setItem("role", role);
}
export function clearAuth() {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("role");
}
export function isAuthed() {
  return !!getToken();
}

// ---- Canteens (static, per spec) ----
export const CANTEENS = [
  { id: 1, name: "Prathap Deluxe", tagline: "Premium experience" },
  { id: 2, name: "Prathap Non-Delux", tagline: "Classic favorites" },
  { id: 3, name: "Mini Prathap", tagline: "Quick bites" },
] as const;

// ---- Global Notification Service ----
export class NotificationService {
  private static instance: NotificationService;
  private previousOrderCount: number = 0;
  private notificationPermission: NotificationPermission = 'default';
  private intervalId: NodeJS.Timeout | null = null;
  private isActive: boolean = false;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize() {
    if (typeof window === 'undefined') return;
    
    // Check and request notification permission
    if ('Notification' in window) {
      this.notificationPermission = Notification.permission;
      if (this.notificationPermission === 'default') {
        this.notificationPermission = await Notification.requestPermission();
      }
    }
    
    this.startPolling();
  }

  private startPolling() {
    if (this.isActive || typeof window === 'undefined') return;
    
    this.isActive = true;
    
    const startPolling = () => {
      if (this.intervalId) clearInterval(this.intervalId);
      
      const interval = document.hidden ? 30000 : 5000; // 5s visible, 30s hidden
      this.intervalId = setInterval(() => {
        if (!document.hidden || this.notificationPermission === 'granted') {
          this.checkForNewOrders();
        }
      }, interval);
    };

    startPolling();
    
    // Handle visibility changes
    const handleVisibilityChange = () => startPolling();
    const handleFocus = () => this.checkForNewOrders();
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
  }

  private async checkForNewOrders() {
    try {
      const response = await api.get("/canteen-ops/orders");
      const orders = Array.isArray(response.data) ? response.data : response.data?.orders || [];
      
      if (this.previousOrderCount > 0 && orders.length > this.previousOrderCount) {
        const newOrderCount = orders.length - this.previousOrderCount;
        const newOrders = orders.slice(this.previousOrderCount);
        
        this.triggerNotifications(newOrderCount, newOrders);
      }
      
      this.previousOrderCount = orders.length;
    } catch (error) {
      console.error('Error checking for new orders:', error);
    }
  }

  private playNotificationSound() {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
      
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.6);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }

  private triggerNotifications(orderCount: number, newOrders: any[]) {
    console.log('Triggering notifications:', { orderCount, newOrders });
    
    // Play sound
    this.playNotificationSound();
    
    // Vibrate for mobile
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
    
    // Browser notification
    if (this.notificationPermission === 'granted') {
      try {
        const notification = new Notification('New Order Received! - Prathap Theatre', {
          body: `${orderCount} new order${orderCount > 1 ? 's' : ''} received${newOrders.length > 0 ? `: ${newOrders.map(o => `Order #${o.order_id}`).join(', ')}` : ''}`,
          icon: '/favicon.ico',
          tag: 'new-order',
          requireInteraction: orderCount > 1,
          silent: false,
        });
        
        const autoCloseTime = orderCount > 1 ? 10000 : 8000;
        setTimeout(() => notification.close(), autoCloseTime);
        
        // Second sound for emphasis
        setTimeout(() => this.playNotificationSound(), 300);
      } catch (error) {
        console.error('Error showing browser notification:', error);
      }
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isActive = false;
  }
}

// Initialize notification service globally
if (typeof window !== 'undefined' && getRole() === 'admin') {
  const notificationService = NotificationService.getInstance();
  notificationService.initialize();
}
