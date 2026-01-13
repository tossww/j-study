import Link from 'next/link'
import FileUpload from '@/components/FileUpload'

export default function UploadPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <Link href="/" className="absolute top-8 left-8 text-gray-600 hover:text-gray-900">
        &larr; Back
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Study Material</h1>
      <p className="text-gray-600 mb-8">Upload a PDF, text file, or markdown to generate flashcards</p>

      <FileUpload />

      <div className="mt-8 text-center text-sm text-gray-500">
        <p>AI will analyze your content and create flashcards automatically</p>
        <p className="mt-1">Supports: PDF, TXT, MD files</p>
      </div>
    </div>
  )
}
