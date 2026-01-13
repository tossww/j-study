// File parsing utilities for extracting text from uploaded files

export async function parseTextFile(file: File): Promise<string> {
  return await file.text()
}

export async function parsePdfFile(buffer: Buffer): Promise<string> {
  // Dynamic import for server-side only
  const pdfParse = (await import('pdf-parse')).default
  const data = await pdfParse(buffer)
  return data.text
}

export async function parseFile(file: File): Promise<string> {
  const fileName = file.name.toLowerCase()

  if (fileName.endsWith('.pdf')) {
    const buffer = Buffer.from(await file.arrayBuffer())
    return parsePdfFile(buffer)
  }

  // For .txt, .md, and other text files
  return parseTextFile(file)
}

// Extract text from a file buffer (for API routes)
export async function parseFileFromBuffer(buffer: Buffer, fileName: string): Promise<string> {
  const name = fileName.toLowerCase()

  if (name.endsWith('.pdf')) {
    return parsePdfFile(buffer)
  }

  // For text files
  return buffer.toString('utf-8')
}
