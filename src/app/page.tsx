import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">J-Study</h1>
      <p className="text-lg text-gray-600 mb-8">AI-powered flashcard study app</p>

      <div className="flex gap-4">
        <Link
          href="/upload"
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Upload Study Material
        </Link>
        <Link
          href="/study"
          className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Study Flashcards
        </Link>
      </div>

      <div className="mt-12 text-center text-gray-500">
        <p>Upload PDFs, text files, or markdown to generate flashcards with AI</p>
      </div>
    </div>
  )
}
