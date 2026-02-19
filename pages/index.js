export default function Home() {
  return null
}

export async function getServerSideProps({ res }) {
  const fs = require('fs')
  const path = require('path')
  const html = fs.readFileSync(path.join(process.cwd(), 'public', 'app.html'), 'utf8')
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.end(html)
  return { props: {} }
}