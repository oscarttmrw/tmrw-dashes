import { NextResponse } from 'next/server'
import { readdir, readFile } from 'fs/promises'
import { join, relative, extname } from 'path'

const ROOT = process.cwd()
const SRC = join(ROOT, 'src')

const LANG_MAP: Record<string, string> = {
  '.ts': 'ts',
  '.tsx': 'tsx',
  '.css': 'css',
  '.mjs': 'javascript',
  '.js': 'javascript',
  '.json': 'json',
}

async function collectFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(full)))
    } else {
      const ext = extname(entry.name)
      if (LANG_MAP[ext]) files.push(full)
    }
  }
  return files.sort()
}

export async function GET() {
  try {
    const lines: string[] = []
    lines.push('# TMRW Dashboard — Full Source Code')
    lines.push('')
    lines.push(`Generated: ${new Date().toISOString()}`)
    lines.push('')
    lines.push('---')
    lines.push('')

    // Root config files
    const rootConfigs = ['package.json', 'tsconfig.json', 'postcss.config.mjs', 'next.config.mjs', 'tailwind.config.ts']
    for (const name of rootConfigs) {
      try {
        const content = await readFile(join(ROOT, name), 'utf-8')
        const ext = extname(name)
        const lang = LANG_MAP[ext] || ''
        lines.push(`## \`${name}\``)
        lines.push('')
        lines.push(`\`\`\`${lang}`)
        lines.push(content.trimEnd())
        lines.push('```')
        lines.push('')
      } catch {
        // file doesn't exist, skip
      }
    }

    // All src files
    const srcFiles = await collectFiles(SRC)
    for (const file of srcFiles) {
      const rel = relative(ROOT, file)
      const ext = extname(file)
      const lang = LANG_MAP[ext] || ''
      const content = await readFile(file, 'utf-8')
      lines.push(`## \`${rel}\``)
      lines.push('')
      lines.push(`\`\`\`${lang}`)
      lines.push(content.trimEnd())
      lines.push('```')
      lines.push('')
    }

    return new NextResponse(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
