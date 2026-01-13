import Link from 'next/link'
import FileUpload from '@/components/FileUpload'

export default function UploadPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <Link href="/" className="absolute top-8 left-8 text-gray-600 hover:text-gray-900">
        &larr; Back
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Deck</h1>
      <p className="text-gray-600 mb-8">Describe what you want to learn and AI will create flashcards for you</p>

      <FileUpload />

      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Just describe what you want to study, or add a file for context</p>
      </div>
    </div>
  )
}
