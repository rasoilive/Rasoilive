import { io } from 'socket.io-client'

export const socket = io(window.location.origin, {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 10000,
  timeout: 10000,
  autoConnect: true,
})

let hasLoggedError = false
socket.on('connect_error', () => {
  if (!hasLoggedError) {
    console.warn('[Rasoi Live] Backend offline — real-time updates paused.')
    hasLoggedError = true
  }
})

socket.on('connect', () => {
  hasLoggedError = false
  console.log('[Rasoi Live] Real-time connected ✅')
})

// Helper to join a specific restaurant room for isolated events
export function joinRestaurantRoom(restCode) {
  if (restCode && socket.connected) {
    socket.emit('joinRoom', restCode)
  }
}
