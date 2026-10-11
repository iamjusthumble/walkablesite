// GET /api/waitlist/stats on Vercel (honest momentum counts, hidden below MOMENTUM_MIN).
import { handleStats, methodNotAllowed } from '../../server/vercel.js'
export const GET = handleStats
export const POST = () => methodNotAllowed('GET')
