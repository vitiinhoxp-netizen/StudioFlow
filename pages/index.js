import fs from 'fs'
import path from 'path'

export default function Home() { return null }

export async function getServerSideProps({ res }) {
  const filePath = path.join(process.cwd(), 'public', 'app.html')
  const html = fs.readFileSync(filePath, 'utf8')
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.end(html)
  return { props: {} }
}
