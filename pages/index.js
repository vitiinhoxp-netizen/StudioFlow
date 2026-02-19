export default function Home() {
  return null
}

export async function getServerSideProps({ res }) {
  res.setHeader('Content-Type', 'text/html')
  const fs = require('fs')
  const path = require('path')
  const html = fs.readFileSync(path.join(process.cwd(), 'public', 'index.html'), 'utf8')
  res.end(html)
  return { props: {} }
}