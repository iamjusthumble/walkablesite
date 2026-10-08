import { DatabaseSync } from 'node:sqlite'
import { resolve } from 'node:path'
const db = new DatabaseSync(process.env.WAITLIST_DB || resolve('data/waitlist.sqlite'), { readOnly: true })
const rows = db.prepare('SELECT * FROM leads ORDER BY id').all()
const columns = ['id','email','track','first_name','city','business_name','category','foot_traffic','consent','consent_text','created_at']
const escape = value => {
  let text = String(value ?? '')
  if (/^[=+\-@\t\r\n]/.test(text)) text = `'${text}`
  return `"${text.replaceAll('"', '""')}"`
}
process.stdout.write([columns.join(','), ...rows.map(row => columns.map(k => escape(row[k])).join(','))].join('\n') + '\n')
db.close()
