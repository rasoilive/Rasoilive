import { MongoClient } from 'mongodb'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
dotenv.config({ path: path.join(__dirname, 'backend', '.env') })

async function check() {
  const client = new MongoClient(process.env.MONGO_URI, { family: 4 })
  await client.connect()
  const db = client.db('rasoiLive')
  const settings = await db.collection('settings').find({}).toArray()
  console.log("Settings docs:", JSON.stringify(settings, null, 2))
  
  const token = process.env.TELEGRAM_BOT_TOKEN
  console.log("Token exists:", !!token)
  
  await client.close()
}
check().catch(console.error)
