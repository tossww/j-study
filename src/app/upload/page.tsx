'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import FileUpload from '@/components/FileUpload'

function UploadPageContent() {
  const searchParams = useSearchParams()
  const folderId = searchParams.get('folderId')
  const backUrl = folderId ? `/?folderId=${folderId}` : '/'

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <Link href={backUrl} className="absolute top-8 left-8 text-gray-600 hover:text-gray-900">
        &larr; Back
      </Link>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Deck</h1>
      <p className="text-gray-600 mb-8">Describe what you want to learn and AI will create flashcards for you</p>

      <FileUpload folderId={folderId ? parseInt(folderId) : undefined} />

      <div className="mt-8 text-center text-sm text-gray-500">
        <p>Just describe what you want to study, or add a file for context</p>
      </div>
    </div>
  )
}

export default function UploadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    }>
      <UploadPageContent />
    </Suspense>
  )
}
