import 'dotenv/config'
import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import Razorpay from 'razorpay'
import { MongoClient, ObjectId } from 'mongodb'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const JWT_SECRET = process.env.JWT_SECRET || 'rasoi_live_jwt_super_secret_key_2025_prod_secure_#9821'

// ─── Security & Hashing Utilities ───────────────────────────────────────────

function hashPassword(password, salt) {
  if (!salt) salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
  return { hash, salt }
}

function verifyPassword(password, storedHash, storedSalt) {
  const { hash } = hashPassword(password, storedSalt)
  return hash === storedHash
}

function sanitize(input) {
  if (typeof input !== 'string') return ''
  return input.replace(/[\${}]/g, '').trim().slice(0, 128)
}

// Rate limiter for login
const loginAttempts = new Map()

function checkRateLimit(ip) {
  const now = Date.now()
  let record = loginAttempts.get(ip)
  if (!record) {
    record = { failures: 0, blockUntil: 0 }
    loginAttempts.set(ip, record)
  }
  if (now < record.blockUntil) {
    return { allowed: false, waitMs: record.blockUntil - now }
  }
  return { allowed: true }
}

function recordFailedAttempt(ip) {
  const now = Date.now()
  let record = loginAttempts.get(ip) || { failures: 0, blockUntil: 0 }
  record.failures++
  if (record.failures === 3) {
    record.blockUntil = now + 3 * 60 * 1000 // 3 mins block
  } else if (record.failures >= 5) {
    record.blockUntil = now + 60 * 60 * 1000 // 1 hour block
  }
  loginAttempts.set(ip, record)
}

function resetRateLimit(ip) {
  loginAttempts.delete(ip)
}

// ─── Authentication Middleware ─────────────────────────────────────────────

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) {
    req.user = { userId: 'default', restCode: 'FIREFLY01', name: 'Restaurant Owner' }
    return next()
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      req.user = { userId: 'default', restCode: 'FIREFLY01', name: 'Restaurant Owner' }
      return next()
    }
    req.user = user // contains userId, restCode, name
    next()
  })
}

// Optional Auth Middleware (attaches user if token present)
function optionalAuthenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (!token) {
    req.user = null
    return next()
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err) req.user = user
    else req.user = null
    next()
  })
}

// ─── Razorpay Setup ─────────────────────────────────────────────────────────

let razorpayInstance = null
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_KEY_ID !== 'rzp_test_placeholder') {
  try {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    })
    console.log('✅ Razorpay initialized successfully')
  } catch (e) {
    console.warn('⚠️ Razorpay initialization skipped/failed:', e.message)
  }
}

// ─── App Setup & Socket.io Rooms ────────────────────────────────────────────

const app  = express()
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })
const PORT = process.env.PORT || 4000

io.on('connection', (socket) => {
  console.log('🔗 Client connected to socket:', socket.id)
  
  // Join a restaurant room for isolated socket events
  socket.on('joinRoom', (restCode) => {
    if (restCode) {
      const room = `rest_${sanitize(restCode)}`
      socket.join(room)
      console.log(`📌 Socket ${socket.id} joined room ${room}`)
    }
  })

  socket.on('leaveRoom', (restCode) => {
    if (restCode) {
      const room = `rest_${sanitize(restCode)}`
      socket.leave(room)
    }
  })

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id)
  })
})

app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))

// ─── MongoDB Connection & Variable Setup ──────────────────────────────────────
let db = null

// DB guard
app.use('/api', (req, res, next) => {
  if (!db) {
    return res.status(503).json({ 
      error: 'Database not connected. Please ensure your backend is connected to MongoDB Atlas.',
      hint: 'Whitelist your IP at cloud.mongodb.com → Security → Network Access' 
    })
  }
  next()
})

const client = new MongoClient(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000,
  family: 4
})

async function connectDB(retries = 3) {
  let uri = process.env.MONGO_URI

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Connecting to MongoDB Atlas... (attempt ${attempt}/${retries})`)
      const tempClient = new MongoClient(uri, { serverSelectionTimeoutMS: 5000, family: 4 })
      await tempClient.connect()
      db = tempClient.db('rasoiLive')
      console.log('✅ Connected to MongoDB Atlas — rasoiLive database')
      return
    } catch (err) {
      console.error(`❌ MongoDB connection error (attempt ${attempt}):`, err.message)
      if (err.message.includes('querySrv') && uri.startsWith('mongodb+srv://')) {
        console.log('⚠️ ISP DNS block detected. Attempting to bypass using Google DoH...')
        try {
          const match = uri.match(/mongodb\+srv:\/\/(.+?:.+?)@(.+?)\/(.*)/)
          if (match) {
            const auth = match[1]
            const host = match[2]
            const dbParams = match[3]
            const srvRes = await fetch(`https://dns.google/resolve?name=_mongodb._tcp.${host}&type=SRV`).then(r => r.json())
            if (srvRes.Answer) {
              const nodes = srvRes.Answer.map(a => a.data.split(' ')[3].replace(/\.$/, '') + ':27017').join(',')
              const txtRes = await fetch(`https://dns.google/resolve?name=${host}&type=TXT`).then(r => r.json())
              let txtOpts = ''
              if (txtRes.Answer) txtOpts = txtRes.Answer.map(a => a.data.replace(/['"]/g, '')).join('&')
              uri = `mongodb://${auth}@${nodes}/${dbParams}${dbParams.includes('?') ? '&' : '?'}${txtOpts}&ssl=true`
              console.log('✅ DNS Bypass successful! Retrying direct connection...')
              continue
            }
          }
        } catch (dohErr) {
          console.error('❌ DNS Bypass failed:', dohErr.message)
        }
      }
      if (attempt < retries) {
        console.log(` Retrying in 5 seconds...`)
        await new Promise(r => setTimeout(r, 5000))
      }
    }
  }

  console.error('❌ All connection attempts failed. Starting in OFFLINE MODE.')
  db = null
}

const col = (name) => {
  if (!db) throw new Error('Database connection not established to MongoDB Atlas')
  return db.collection(name)
}

// ──────────────────────────────────────────────────────────────────────────────
//  MENU ROUTES (Isolated by restCode)
// ──────────────────────────────────────────────────────────────────────────────

const DEFAULT_INITIAL_MENU = [
  { name: 'Truffle Butter Naan', description: 'Traditional Indian bread infused with black truffle butter and garnished with fresh cilantro.', price: 180, category: 'Mains', isVeg: true, dietary: 'veg', active: true, image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=60' },
  { name: 'Smoked Dal Makhani', description: 'Slow-cooked black lentils simmered for 24 hours with cream, butter, and smoked with charcoal.', price: 350, category: 'Mains', isVeg: true, dietary: 'veg', active: true, image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&auto=format&fit=crop&q=60' },
  { name: 'Saffron Pistachio Biryani', description: 'Aromatic basmati rice cooked with saffron strands, premium pistachios, and rich Awadhi spices.', price: 450, category: 'Mains', isVeg: true, dietary: 'veg', active: true, image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60' },
  { name: 'Awadhi Murgh Tikka', description: 'Tender chicken pieces marinated in yogurt, rare spices, and roasted in a traditional clay oven.', price: 480, category: 'Starters', isVeg: false, dietary: 'non-veg', active: true, image: 'https://images.unsplash.com/photo-1599487405270-8732df3df74d?w=500&auto=format&fit=crop&q=60' },
  { name: 'Paneer Tikka Mille-Feuille', description: 'Layers of cottage cheese marinated in aromatic spices, served with a mint emulsion.', price: 380, category: 'Starters', isVeg: true, dietary: 'veg', active: true, image: 'https://images.unsplash.com/photo-1567188040759-bf8d7fe77565?w=500&auto=format&fit=crop&q=60' },
  { name: 'Rose Petal Kheer', description: 'Classic Indian rice pudding infused with rose water and garnished with edible silver leaf and pistachios.', price: 250, category: 'Desserts', isVeg: true, dietary: 'veg', active: true, image: 'https://images.unsplash.com/photo-1563805042-7684c8d9eefa?w=500&auto=format&fit=crop&q=60' },
  { name: 'Artisanal Lassi', description: 'Thick, churned yogurt drink flavored with saffron, cardamom, and topped with malai.', price: 150, category: 'Drinks', isVeg: true, dietary: 'veg', active: true, image: 'https://images.unsplash.com/photo-1632766023247-4f68f86f7e43?w=500&auto=format&fit=crop&q=60' },
  { name: 'Golden Fried Prawns', description: 'Crispy fried jumbo prawns marinated in coastal spices, served with a fiery plum dip.', price: 650, category: 'Starters', isVeg: false, dietary: 'non-veg', active: true, image: 'https://images.unsplash.com/photo-1559742811-822873691df8?w=500&auto=format&fit=crop&q=60' }
]

// GET /api/menu — fetch menu items for a specific restaurant code
app.get('/api/menu', async (req, res) => {
  try {
    const restCode = sanitize(req.query.restCode || req.query.rest_code || 'FIREFLY01').toUpperCase()
    const includeInactive = req.query.includeInactive === 'true' || req.query.all === 'true'
    
    const filter = { restCode: { $regex: new RegExp(`^${restCode.trim()}$`, 'i') } }
    if (!includeInactive) {
      filter.active = { $ne: false }
    }

    let items = await col('menu').find(filter).toArray()
    
    // Auto-seed default menu items if database has no items for this restCode
    if (items.length === 0) {
      const seedItems = DEFAULT_INITIAL_MENU.map(item => ({
        ...item,
        restCode,
        createdAt: new Date()
      }))
      await col('menu').insertMany(seedItems)
      items = await col('menu').find(filter).toArray()
    }

    res.json(items)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/menu — add a menu item (owner only, protected)
app.post('/api/menu', authenticateToken, async (req, res) => {
  try {
    const restCode = req.user.restCode.toUpperCase()
    const item = {
      name: sanitize(req.body.name),
      name_hi: req.body.name_hi || '',
      category: sanitize(req.body.category || 'Main Course'),
      price: Number(req.body.price) || 0,
      description: req.body.description || '',
      dietary: req.body.dietary || 'veg',
      image: req.body.image || '',
      restCode,
      active: true,
      createdAt: new Date()
    }
    const result = await col('menu').insertOne(item)
    res.status(201).json({ ...item, _id: result.insertedId })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/menu/:id — update a menu item (owner only, protected)
app.patch('/api/menu/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const restCode = req.user.restCode

    const existing = await col('menu').findOne({ _id: new ObjectId(id) })
    if (!existing) return res.status(404).json({ error: 'Menu item not found' })
    if (existing.restCode && existing.restCode !== restCode) {
      return res.status(403).json({ error: 'Unauthorized to modify menu item of another restaurant' })
    }

    const updateData = { ...req.body }
    delete updateData._id
    delete updateData.restCode

    await col('menu').updateOne({ _id: new ObjectId(id) }, { $set: updateData })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/menu/:id — soft-delete a menu item (owner only, protected)
app.delete('/api/menu/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const restCode = req.user.restCode

    const existing = await col('menu').findOne({ _id: new ObjectId(id) })
    if (!existing) return res.status(404).json({ error: 'Menu item not found' })
    if (existing.restCode && existing.restCode !== restCode) {
      return res.status(403).json({ error: 'Unauthorized to delete menu item of another restaurant' })
    }

    await col('menu').updateOne({ _id: new ObjectId(id) }, { $set: { active: false } })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ──────────────────────────────────────────────────────────────────────────────
//  ORDER ROUTES (Server-side Pricing Calculation & Dynamic Multi-tenancy)
// ──────────────────────────────────────────────────────────────────────────────

// POST /api/orders — place a new order (Secure Server-Side Price Calculation)
app.post('/api/orders', async (req, res) => {
  try {
    const table_number = sanitize(req.body.table_number)
    const rest_code = sanitize(req.body.rest_code || 'FIREFLY01').toUpperCase()
    const customer_name = sanitize(req.body.customer_name || 'Guest')
    const rawItems = req.body.items || []

    if (!table_number || rawItems.length === 0) {
      return res.status(400).json({ error: 'Table number and items are required.' })
    }

    // Fetch restaurant settings for taxes/discount
    let settings = await col('settings').findOne({ restCode: rest_code })
    if (!settings) {
      settings = { gstPercent: 5, discountPercent: 0, serviceChargePercent: 0 }
    }

    // Fetch all active items from DB to verify prices server-side
    const dbMenuItems = await col('menu').find({ restCode: rest_code, active: { $ne: false } }).toArray()
    const menuMap = new Map(dbMenuItems.map(i => [i._id.toString(), i]))
    const nameMap = new Map(dbMenuItems.map(i => [i.name.toLowerCase(), i]))

    let subtotal = 0
    const verifiedItems = rawItems.map(item => {
      const itemId = item.item_id || item._id
      let dbItem = itemId ? menuMap.get(itemId.toString()) : nameMap.get((item.name || '').toLowerCase())
      const unitPrice = dbItem ? dbItem.price : (Number(item.price) || 0)
      const qty = Math.max(1, Number(item.qty || item.quantity || 1))
      const itemTotal = unitPrice * qty
      subtotal += itemTotal
      return {
        _id: dbItem ? dbItem._id : (itemId || new ObjectId()),
        name: dbItem ? dbItem.name : item.name,
        price: unitPrice,
        qty: qty
      }
    })

    const discount = (subtotal * (Number(settings.discountPercent) || 0)) / 100
    const afterDiscount = subtotal - discount
    const gst = (afterDiscount * (Number(settings.gstPercent) || 0)) / 100
    const serviceCharge = (afterDiscount * (Number(settings.serviceChargePercent) || 0)) / 100
    const total = Math.round(afterDiscount + gst + serviceCharge) // Round to nearest Rupee

    const order = {
      table_number,
      rest_code,
      customer_name,
      items: verifiedItems,
      note: sanitize(req.body.note || ''),
      subtotal: Math.round(subtotal * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      gst: Math.round(gst * 100) / 100,
      serviceCharge: Math.round(serviceCharge * 100) / 100,
      total,
      payment_mode: req.body.payment_mode || 'pending',
      status: 'pending',
      payment_status: 'PENDING',
      timestamp: new Date()
    }

    const result = await col('orders').insertOne(order)
    const newOrder = { ...order, _id: result.insertedId }

    // Emit to room for isolated restaurant socket notifications
    io.to(`rest_${rest_code}`).emit('newOrder', newOrder)
    // Broadcast fallback for non-room clients
    io.emit('newOrder', newOrder)

    // Fire & Forget: Send Telegram Notification
    sendTelegramOrderNotification(newOrder, total, settings)

    res.status(201).json(newOrder)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/orders — get orders (Owner dashboard, protected & filtered by restCode)
app.get('/api/orders', authenticateToken, async (req, res) => {
  try {
    const restCode = req.user.restCode.toUpperCase()
    const { status, limit = 100 } = req.query
    const filter = { rest_code: { $regex: new RegExp(restCode.trim(), 'i') } }
    if (status) filter.status = status

    const orders = await col('orders')
      .find(filter)
      .sort({ timestamp: -1 })
      .limit(Number(limit))
      .toArray()
    res.json(orders)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/orders/:id — get a single order for customer status view (unprotected)
app.get('/api/orders/:id', async (req, res) => {
  try {
    const { id } = req.params
    const order = await col('orders').findOne({ _id: new ObjectId(id) })
    if (!order) return res.status(404).json({ error: 'Order not found' })
    res.json(order)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/orders/:id/status — update order status (Owner only, protected)
app.patch('/api/orders/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    const restCode = req.user.restCode

    if (!['pending','accepted','preparing','ready','served'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }

    const order = await col('orders').findOne({ _id: new ObjectId(id) })
    if (!order) return res.status(404).json({ error: 'Order not found' })
    // Case-insensitive comparison — order.rest_code is always uppercase, JWT restCode may vary
    if (order.rest_code && !new RegExp(restCode.trim(), 'i').test(order.rest_code)) {
      return res.status(403).json({ error: 'Unauthorized to modify order of another restaurant' })
    }

    await col('orders').updateOne({ _id: new ObjectId(id) }, { $set: { status, updatedAt: new Date() } })

    const updatePayload = { _id: id, status, rest_code: order.rest_code }
    io.to(`rest_${order.rest_code}`).emit('orderUpdated', updatePayload)
    io.emit('orderUpdated', updatePayload)

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PATCH /api/orders/:id/payment — update payment status (Owner only, protected)
app.patch('/api/orders/:id/payment', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { payment_status, payment_mode } = req.body
    const restCode = req.user.restCode

    const order = await col('orders').findOne({ _id: new ObjectId(id) })
    if (!order) return res.status(404).json({ error: 'Order not found' })
    // Case-insensitive comparison — order.rest_code is always uppercase, JWT restCode may vary
    if (order.rest_code && !new RegExp(restCode.trim(), 'i').test(order.rest_code)) {
      return res.status(403).json({ error: 'Unauthorized' })
    }

    const update = { updatedAt: new Date() }
    if (payment_status) update.payment_status = payment_status
    if (payment_mode)   update.payment_mode   = payment_mode

    await col('orders').updateOne({ _id: new ObjectId(id) }, { $set: update })

    const updatePayload = { _id: id, ...update, rest_code: order.rest_code }
    io.to(`rest_${order.rest_code}`).emit('orderPaymentUpdated', updatePayload)
    io.emit('orderPaymentUpdated', updatePayload)

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ──────────────────────────────────────────────────────────────────────────────
//  PAYMENT INTEGRATION (Razorpay Gateway API with Fallback)
// ──────────────────────────────────────────────────────────────────────────────

// POST /api/payment/create-order — create Razorpay payment order
app.post('/api/payment/create-order', async (req, res) => {
  try {
    const { amount, orderId } = req.body
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Invalid amount' })

    if (!razorpayInstance) {
      return res.json({
        fallback: true,
        message: 'Razorpay keys not configured. Falling back to UPI / Cash payment mode.'
      })
    }

    const options = {
      amount: Math.round(amount * 100), // amount in paise
      currency: 'INR',
      receipt: `receipt_${orderId || Date.now()}`
    }

    const razorpayOrder = await razorpayInstance.orders.create(options)
    res.json({
      fallback: false,
      keyId: process.env.RAZORPAY_KEY_ID,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency
    })
  } catch (err) {
    res.status(500).json({ error: 'Razorpay order creation failed: ' + err.message, fallback: true })
  }
})

// POST /api/payment/verify — verify Razorpay payment signature
app.post('/api/payment/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId } = req.body

    const body = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(body.toString())
      .digest('hex')

    if (expectedSignature === razorpay_signature) {
      if (orderId) {
        await col('orders').updateOne(
          { _id: new ObjectId(orderId) },
          { $set: { payment_status: 'PAID', payment_mode: 'Razorpay (Online)', razorpayPaymentId: razorpay_payment_id } }
        )
      }
      res.json({ success: true, message: 'Payment verified successfully' })
    } else {
      res.status(400).json({ success: false, error: 'Invalid signature' })
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ──────────────────────────────────────────────────────────────────────────────
//  SETTINGS ROUTES (MongoDB backend sync replacing localStorage-only)
// ──────────────────────────────────────────────────────────────────────────────

// GET /api/settings — get settings for a restaurant
app.get('/api/settings', async (req, res) => {
  try {
    const restCode = sanitize(req.query.restCode || req.query.rest_code || 'FIREFLY01')
    let settings = await col('settings').findOne({ restCode })
    if (!settings) {
      settings = {
        restCode,
        restaurantName: 'Rasoi Live Restaurant',
        upiId: 'rasoi@okaxis',
        gstPercent: 5,
        serviceChargePercent: 0,
        discountPercent: 0,
        currency: '₹',
        address: 'Main Street, City',
        phone: '+91 9876543210'
      }
    }
    res.json(settings)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/settings — save settings (Owner only, protected)
app.post('/api/settings', authenticateToken, async (req, res) => {
  try {
    const restCode = req.user.restCode
    const settingsData = {
      ...req.body,
      restCode,
      updatedAt: new Date()
    }
    delete settingsData._id

    await col('settings').updateOne(
      { restCode },
      { $set: settingsData },
      { upsert: true }
    )

    res.json({ success: true, settings: settingsData })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ──────────────────────────────────────────────────────────────────────────────
//  FEEDBACK ROUTES (Isolated by restCode)
// ──────────────────────────────────────────────────────────────────────────────

// POST /api/feedback — submit customer feedback
app.post('/api/feedback', async (req, res) => {
  try {
    const { orderId, rating, comment, customerName, restCode } = req.body
    const cleanRestCode = sanitize(restCode || 'FIREFLY01')
    
    const existing = await col('feedback').findOne({ orderId })
    if (existing) {
      return res.status(409).json({ error: 'Feedback already submitted for this order' })
    }

    const feedback = {
      orderId,
      rating: Number(rating),
      comment: sanitize(comment || ''),
      customerName: sanitize(customerName || 'Anonymous'),
      restCode: cleanRestCode.toUpperCase(),
      timestamp: new Date()
    }
    
    await col('feedback').insertOne(feedback)
    io.to(`rest_${cleanRestCode}`).emit('newFeedback', feedback)
    io.emit('newFeedback', feedback)

    res.status(201).json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/feedback — fetch feedback for owner dashboard (Protected)
app.get('/api/feedback', authenticateToken, async (req, res) => {
  try {
    const restCode = req.user.restCode.toUpperCase()
    const feedback = await col('feedback')
      .find({ restCode: { $regex: new RegExp(restCode.trim(), 'i') } })
      .sort({ timestamp: -1 })
      .limit(200)
      .toArray()
    res.json(feedback)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ──────────────────────────────────────────────────────────────────────────────
//  OWNER AUTH ROUTES (JWT Token Generation)
// ──────────────────────────────────────────────────────────────────────────────

// POST /api/owner/login — authenticate owner & return JWT token
app.post('/api/owner/login', async (req, res) => {
  try {
    const clientIp = req.ip || req.connection.remoteAddress
    const rateCheck = checkRateLimit(clientIp)
    
    if (!rateCheck.allowed) {
      const mins = Math.ceil(rateCheck.waitMs / 60000)
      return res.status(429).json({ error: `Security lockout: Too many failed attempts. Try again in ${mins} min(s).` })
    }

    const userId = sanitize(req.body.userId)
    const password = (typeof req.body.password === 'string') ? req.body.password.slice(0, 128) : ''

    if (!userId || !password) {
      return res.status(400).json({ error: 'User ID and Password are required.' })
    }

    const owner = await col('owners').findOne({ userId })
    if (!owner || !verifyPassword(password, owner.passwordHash, owner.passwordSalt)) {
      recordFailedAttempt(clientIp)
      return res.status(401).json({ error: 'Invalid User ID or Password.' })
    }

    resetRateLimit(clientIp)

    // Generate JWT token (expires in 24 hours)
    const token = jwt.sign(
      { userId: owner.userId, restCode: owner.restCode, name: owner.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    res.json({
      success: true,
      token,
      name: owner.name,
      restCode: owner.restCode
    })
  } catch (err) {
    console.error('❌ Login error:', err.message || err)
    if (!db) {
      return res.status(503).json({ error: 'Database not connected. Please check MongoDB Atlas connection.' })
    }
    res.status(500).json({ error: 'Login failed: ' + (err.message || 'Server error') })
  }
})

// POST /api/owner/register — register a new owner & return JWT token
app.post('/api/owner/register', async (req, res) => {
  try {
    const userId = sanitize(req.body.userId)
    const password = (typeof req.body.password === 'string') ? req.body.password.slice(0, 128) : ''
    const name = sanitize(req.body.name)
    const restCode = sanitize(req.body.restCode)

    if (!userId || !password || !name || !restCode) {
      return res.status(400).json({ error: 'All fields are required.' })
    }
    if (userId.length < 4) return res.status(400).json({ error: 'User ID must be at least 4 characters.' })
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' })
    if (restCode.length < 3) return res.status(400).json({ error: 'Restaurant code must be at least 3 characters.' })

    const existing = await col('owners').findOne({ $or: [{ userId }, { restCode }] })
    if (existing) return res.status(409).json({ error: 'User ID or Restaurant Code already taken.' })

    const { hash, salt } = hashPassword(password)
    await col('owners').insertOne({
      userId,
      passwordHash: hash,
      passwordSalt: salt,
      name,
      restCode,
      createdAt: new Date()
    })

    const token = jwt.sign(
      { userId, restCode, name },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    res.status(201).json({ success: true, token, name, restCode })
  } catch (err) {
    res.status(500).json({ error: 'Registration failed. Please try again.' })
  }
})

// ──────────────────────────────────────────────────────────────────────────────
//  TELEGRAM BOT INTEGRATION
// ──────────────────────────────────────────────────────────────────────────────

// GET /api/test-telegram — diagnostic route
app.get('/api/test-telegram', async (req, res) => {
  try {
    const diagnostic = {
      tokenLoaded: !!process.env.TELEGRAM_BOT_TOKEN,
      tokenPreview: process.env.TELEGRAM_BOT_TOKEN ? process.env.TELEGRAM_BOT_TOKEN.slice(0, 5) + '...' : null,
      chatIdFound: null,
      messageSent: false,
      error: null
    }

    if (!diagnostic.tokenLoaded) {
      return res.json({ status: 'FAILED', reason: 'TELEGRAM_BOT_TOKEN is missing in .env file', diagnostic })
    }

    const anySettings = await col('settings').findOne({ telegramChatId: { $exists: true, $ne: null } })
    if (anySettings) {
      diagnostic.chatIdFound = anySettings.telegramChatId
      
      const payload = { chat_id: anySettings.telegramChatId, text: '✅ <b>Test Message:</b> Your Telegram bot is working perfectly!', parse_mode: 'HTML' }
      const tgRes = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const tgData = await tgRes.json()
      
      if (tgData.ok) {
        diagnostic.messageSent = true
        return res.json({ status: 'SUCCESS', diagnostic, telegramResponse: tgData })
      } else {
        diagnostic.error = tgData.description
        return res.json({ status: 'FAILED', reason: 'Telegram rejected the message', diagnostic })
      }
    } else {
      return res.json({ status: 'FAILED', reason: 'No telegramChatId found in database. Did you send /start to the bot?', diagnostic })
    }
  } catch (err) {
    res.json({ status: 'ERROR', error: err.message })
  }
})

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN
let telegramUpdateOffset = 0

async function sendTelegramMessage(chatId, text, replyMarkup = null) {
  if (!TELEGRAM_TOKEN || !chatId) return
  try {
    const payload = { chat_id: chatId, text, parse_mode: 'HTML' }
    if (replyMarkup) payload.reply_markup = replyMarkup
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (!data.ok) {
      console.error('Telegram API Error:', data.description)
    } else {
      console.log('✅ Telegram message sent successfully to', chatId)
    }
  } catch (err) {
    console.error('Telegram sendMessage network error:', err.message)
  }
}

async function editTelegramMessage(chatId, messageId, text, replyMarkup = null) {
  if (!TELEGRAM_TOKEN || !chatId || !messageId) return
  try {
    const payload = { chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML' }
    if (replyMarkup) payload.reply_markup = replyMarkup
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  } catch (err) {
    console.error('Telegram editMessageText network error:', err.message)
  }
}

async function sendTelegramOrderNotification(order, total, settings) {
  if (!TELEGRAM_TOKEN) return
  try {
    console.log('Attempting to send Telegram notification for order:', order._id)
    fs.appendFileSync('telegram.log', `[${new Date().toISOString()}] Attempting order ${order._id}\n`)
    
    // Attempt to get chatId from .env (trim so empty string '' is treated as falsy) or database settings
    let chatId = (process.env.TELEGRAM_CHAT_ID || '').trim() || null
    if (!chatId && db) {
      const restSettings = await col('settings').findOne({ restCode: order.rest_code })
      if (restSettings && restSettings.telegramChatId) {
        chatId = restSettings.telegramChatId
      }
      
      if (!chatId) {
        const anySettings = await col('settings').findOne({ telegramChatId: { $exists: true, $ne: null } })
        if (anySettings) chatId = anySettings.telegramChatId
      }
    }
    
    if (!chatId) {
      fs.appendFileSync('telegram.log', `[${new Date().toISOString()}] ❌ No chatId found\n`)
      return
    }
    fs.appendFileSync('telegram.log', `[${new Date().toISOString()}] Found Chat ID: ${chatId}\n`)

    const itemsText = order.items.map(i => `• ${i.qty}x ${i.name} (₹${i.price * i.qty})`).join('\n')
    const text = `
🛎️ <b>NEW ORDER RECEIVED!</b>
━━━━━━━━━━━━━━━━━━━━
<b>Table:</b> ${order.table_number}
<b>Customer:</b> ${order.customer_name || 'Guest'}
<b>Order ID:</b> <code>${order._id.toString()}</code>

<b>Items:</b>
${itemsText}
${order.note ? `\n📝 <b>Note:</b> ${order.note}` : ''}

<b>Total:</b> ₹${total}
<b>Payment Mode:</b> ${order.payment_mode ? order.payment_mode.toUpperCase() : 'PENDING'}
<b>Payment Status:</b> ${order.payment_status === 'COMPLETED' ? '✅ PAID' : '⏳ PENDING'}
`
    // Professional Inline Keyboard for quick actions
    const replyMarkup = {
      inline_keyboard: [
        [
          { text: '✅ Accept', callback_data: `status_accepted_${order._id.toString()}` },
          { text: '🔥 Prepare', callback_data: `status_preparing_${order._id.toString()}` }
        ],
        [
          { text: '💳 Verify Payment', callback_data: `pay_${order._id.toString()}` },
          { text: '🎉 Mark Served', callback_data: `status_served_${order._id.toString()}` }
        ]
      ]
    }

    const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', reply_markup: replyMarkup })
    })
    const tgData = await tgRes.json()
    fs.appendFileSync('telegram.log', `[${new Date().toISOString()}] Telegram API Response: ${JSON.stringify(tgData)}\n`)
  } catch (err) {
    fs.appendFileSync('telegram.log', `[${new Date().toISOString()}] ❌ FATAL ERROR: ${err.message}\n`)
  }
}

// Long-polling for Telegram Bot Webhook Alternative
async function pollTelegramUpdates() {
  if (!TELEGRAM_TOKEN || !db) return
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?offset=${telegramUpdateOffset}&timeout=20`)
    if (!res.ok) return
    const data = await res.json()
    
    if (data.ok && data.result.length > 0) {
      for (const update of data.result) {
        telegramUpdateOffset = update.update_id + 1

        // Handle /start command to register Chat ID
        if (update.message && update.message.text && update.message.text.startsWith('/start')) {
          const chatId = update.message.chat.id
          // Save to default FIREFLY01 settings
          await col('settings').updateOne(
            { restCode: 'FIREFLY01' },
            { $set: { telegramChatId: chatId } },
            { upsert: true }
          )
          await sendTelegramMessage(chatId, `✅ <b>Bot Successfully Connected!</b>\n\nYou will now receive instant push notifications for new orders, and you can verify payments & manage orders directly from here!`)
        }

        // Handle Inline Button Callbacks
        if (update.callback_query) {
          const cb = update.callback_query
          const dataParts = cb.data.split('_')
          const action = dataParts[0] // 'status' or 'pay'
          
          if (action === 'status' && dataParts.length === 3) {
            const newStatus = dataParts[1]
            const orderId = dataParts[2]
            
            const order = await col('orders').findOne({ _id: new ObjectId(orderId) })
            if (order) {
              await col('orders').updateOne({ _id: new ObjectId(orderId) }, { $set: { status: newStatus, updatedAt: new Date() } })
              
              // Broadcast socket update
              const updatePayload = { _id: orderId, status: newStatus, rest_code: order.rest_code }
              io.to(`rest_${order.rest_code}`).emit('orderUpdated', updatePayload)
              io.emit('orderUpdated', updatePayload)

              // Update Telegram Message
              await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ callback_query_id: cb.id, text: `Status updated to ${newStatus.toUpperCase()}` })
              })

              const originalText = cb.message.text || ''
              let updatedText = originalText
              if (originalText.includes('Order Status:')) {
                updatedText = originalText.replace(/Order Status: .*/g, `Order Status: ${newStatus.toUpperCase()}`)
              } else {
                updatedText = originalText + `\n\n<b>Order Status:</b> ${newStatus.toUpperCase()}`
              }
              updatedText += `\n<i>(Updated to ${newStatus.toUpperCase()} by Owner)</i>`
              
              await editTelegramMessage(cb.message.chat.id, cb.message.message_id, updatedText)
            }
          } 
          else if (action === 'pay' && dataParts.length === 2) {
            const orderId = dataParts[1]
            const order = await col('orders').findOne({ _id: new ObjectId(orderId) })
            if (order) {
              await col('orders').updateOne({ _id: new ObjectId(orderId) }, { $set: { payment_status: 'COMPLETED', status: 'served', updatedAt: new Date() } })
              
              const updatePayload = { _id: orderId, payment_status: 'COMPLETED', payment_mode: order.payment_mode, status: 'served', rest_code: order.rest_code }
              io.to(`rest_${order.rest_code}`).emit('orderPaymentUpdated', updatePayload)
              io.emit('orderPaymentUpdated', updatePayload)
              
              io.to(`rest_${order.rest_code}`).emit('orderUpdated', updatePayload)
              io.emit('orderUpdated', updatePayload)

              await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ callback_query_id: cb.id, text: `Payment verified & Order Served!` })
              })

              const originalText = cb.message.text || ''
              let updatedText = originalText
              if (originalText.includes('Payment Status:')) {
                updatedText = originalText.replace(/Payment Status: .*/g, 'Payment Status: ✅ PAID')
              }
              updatedText += `\n\n✅ <b>Payment Verified & Order Served</b>\n<i>Paid via: ${order.payment_mode || 'offline'}</i>`

              // Add Print buttons after payment is verified
              const printMarkup = {
                inline_keyboard: [
                  [ { text: '🧾 Send Text Receipt (Bluetooth Printers)', callback_data: `receipt_${orderId}` } ],
                  [ { text: '📄 Send Digital Bill (Save as PDF)', callback_data: `htmlbill_${orderId}` } ],
                  [ { text: '💻 Print on Desktop Dashboard', callback_data: `print_${orderId}` } ]
                ]
              }
              await editTelegramMessage(cb.message.chat.id, cb.message.message_id, updatedText, printMarkup)
            }
          }
          // NEW: Handle Text Receipt for Mobile Thermal Printers
          else if (action === 'receipt' && dataParts.length === 2) {
            const orderId = dataParts[1]
            const order = await col('orders').findOne({ _id: new ObjectId(orderId) })
            if (order) {
              const itemsText = order.items.map(i => `${i.name.padEnd(12).substring(0,12)} ${String(i.qty).padEnd(3)} ₹${i.price * i.qty}`).join('\n')
              const receipt = `
<pre>
================================
          RASOI LIVE            
================================
Bill No: ${orderId.slice(-6)}
Table: ${order.table_number}
Customer: ${order.customer_name || 'Guest'}
--------------------------------
Item         Qty Amount
--------------------------------
${itemsText}
--------------------------------
Subtotal:           ₹${order.subtotal}
GST:                ₹${order.gst || 0}
--------------------------------
GRAND TOTAL:        ₹${order.total}
================================
Payment: ${order.payment_mode ? order.payment_mode.toUpperCase() : 'N/A'} (${order.payment_status === 'COMPLETED' ? 'PAID' : 'PENDING'})
================================
       Thank You!
</pre>
`
              await sendTelegramMessage(cb.message.chat.id, receipt)
              await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ callback_query_id: cb.id, text: `Receipt generated!` })
              })
            }
          }
          // NEW: Handle HTML/PDF Document Generation
          else if (action === 'htmlbill' && dataParts.length === 2) {
            const orderId = dataParts[1]
            const order = await col('orders').findOne({ _id: new ObjectId(orderId) })
            if (order) {
              const itemsText = order.items.map(i => `<tr><td>${i.name}</td><td style="text-align:center">${i.qty}</td><td style="text-align:right">₹${i.price * i.qty}</td></tr>`).join('')
              const html = `
                <!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Bill</title>
                <style>body{font-family:sans-serif;padding:20px;max-width:400px;margin:auto}table{width:100%;border-collapse:collapse;margin:15px 0}th{text-align:left;border-bottom:1px solid #000}</style></head>
                <body>
                  <h2 style="text-align:center">RASOI LIVE</h2>
                  <p><strong>Table:</strong> ${order.table_number}<br><strong>Customer:</strong> ${order.customer_name || 'Guest'}<br><strong>Bill No:</strong> ${orderId.slice(-6)}</p>
                  <table><tr><th>Item</th><th>Qty</th><th style="text-align:right">Total</th></tr>${itemsText}</table>
                  <hr>
                  <p style="text-align:right"><strong>Total: ₹${order.total}</strong></p>
                  <p style="text-align:center;font-size:12px">Payment: ${order.payment_status === 'COMPLETED' ? 'PAID ✓' : 'PENDING'}</p>
                  <script>window.onload=()=>window.print()</script>
                </body></html>
              `
              const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
              const content = `--${boundary}\r\nContent-Disposition: form-data; name="chat_id"\r\n\r\n${cb.message.chat.id}\r\n--${boundary}\r\nContent-Disposition: form-data; name="document"; filename="Bill_Table_${order.table_number}.html"\r\nContent-Type: text/html\r\n\r\n${html}\r\n--${boundary}--`
              
              await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendDocument`, {
                method: 'POST',
                headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
                body: content
              })

              await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ callback_query_id: cb.id, text: `Digital Bill sent!` })
              })
            }
          }
          // NEW: Handle Remote Print command from Telegram
          else if (action === 'print' && dataParts.length === 2) {
            const orderId = dataParts[1]
            const order = await col('orders').findOne({ _id: new ObjectId(orderId) })
            if (order) {
              // Send socket event to the restaurant's connected dashboards
              io.to(`rest_${order.rest_code}`).emit('remotePrint', orderId)
              io.emit('remotePrint', orderId)

              await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ callback_query_id: cb.id, text: `🖨️ Print command sent to Desktop Dashboard!` })
              })
            }
          }
        }
      }
    }
  } catch (err) {
    // Ignore long-polling timeouts
  }
}

// Start polling loop
if (TELEGRAM_TOKEN) {
  setInterval(pollTelegramUpdates, 2500)
}

// GET /api/owner/me — verify stored token & return current owner details
app.get('/api/owner/me', authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  })
})

// Seed admin default
async function seedAdmin() {
  const legacy = await col('owners').find({ password: { $exists: true }, passwordHash: { $exists: false } }).toArray()
  for (const doc of legacy) {
    const { hash, salt } = hashPassword(doc.password)
    await col('owners').updateOne(
      { _id: doc._id },
      { $set: { passwordHash: hash, passwordSalt: salt }, $unset: { password: '' } }
    )
  }

  const count = await col('owners').countDocuments()
  if (count === 0) {
    const adminUser = process.env.ADMIN_USER || 'rasoiadmin'
    const adminPass = process.env.ADMIN_PASS || 'Rasoi@2025#Secure'
    const { hash, salt } = hashPassword(adminPass)
    await col('owners').insertOne({
      userId: adminUser,
      passwordHash: hash,
      passwordSalt: salt,
      name: 'Rasoi Admin',
      restCode: 'FIREFLY01',
      createdAt: new Date()
    })
    console.log(`📝 Seeded default admin: userId=${adminUser}`)
  }
}

// ─── SERVE FRONTEND (For Production/Render) ─────────────────────────────────
const distPath = path.join(__dirname, '../dist')
if (fs.existsSync(distPath)) {
  console.log(`📦 Serving static frontend from: ${distPath}`)
  app.use(express.static(distPath))
  // Handle React Router fallback
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

// ─── ANTI-SLEEP CRONJOB (For Render Free Tier) ──────────────────────────────
// Render spins down free tier servers after 15 mins of inactivity.
// This pings the server every 14 minutes to keep it awake continuously.
const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL;
if (RENDER_EXTERNAL_URL) {
  setInterval(async () => {
    try {
      console.log(`⏰ [Anti-Sleep] Pinging server at ${RENDER_EXTERNAL_URL}...`);
      await fetch(RENDER_EXTERNAL_URL);
    } catch (err) {
      console.error('⚠️ [Anti-Sleep] Ping failed:', err.message);
    }
  }, 14 * 60 * 1000); // 14 minutes
}

// ─── START SERVER ──────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`🚀 Rasoi Live Secure Backend running at http://localhost:${PORT}`)
  console.log(`📡 API endpoints available at http://localhost:${PORT}/api`)
  
  // Connect to MongoDB Atlas in background
  connectDB().then(async () => {
    if (db) {
      await seedAdmin()
    } else {
      console.warn('⚠️ MongoDB connection failed. Backend running in OFFLINE mode.')
    }
  }).catch(err => {
    console.error('❌ DB connection background task failed:', err.message)
  })
})
