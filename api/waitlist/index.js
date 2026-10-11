// POST /api/waitlist on Vercel. The Node server handles the same route via server/waitlist.js.
import { handleSignup, methodNotAllowed } from '../../server/vercel.js'
export const POST = handleSignup
export const GET = () => methodNotAllowed('POST')
