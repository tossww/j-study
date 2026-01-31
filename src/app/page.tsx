import Link from 'next/link'
import { Suspense } from 'react'
import DeckList from '@/components/DeckList'
import StatsBar from '@/components/StatsBar'
import FolderContents from '@/components/FolderContents'
import TroubleCards from '@/components/TroubleCards'
import FolderDeckActions from '@/components/FolderDeckActions'

interface HomeProps {
  searchParams: Promise<{ folderId?: string }>
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams
  const folderId = params.folderId ? parseInt(params.folderId) : null
  const isInFolder = folderId !== null

  return (
    <div className="max-w-6xl mx-auto">
      {/* Welcome section - only show on home */}
      {!isInFolder && (
        <>
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Welcome back!</h1>
            <p className="text-gray-500 mt-1">Ready to continue learning?</p>
          </div>

          {/* Stats */}
          <Suspense fallback={<div className="h-24 bg-white rounded-2xl animate-pulse" />}>
            <StatsBar />
          </Suspense>

          {/* Quick actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            <Link
              href="/upload"
              className="group p-6 bg-gradient-to-br from-primary-50 to-accent-lavender rounded-2xl border border-primary-100 hover:shadow-soft transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Create New Deck</h3>
                  <p className="text-sm text-gray-500">Generate flashcards with AI</p>
                </div>
              </div>
            </Link>

            <Link
              href="/study"
              className="group p-6 bg-gradient-to-br from-accent-mint to-accent-sky rounded-2xl border border-green-100 hover:shadow-soft transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Study Now</h3>
                  <p className="text-sm text-gray-500">Continue where you left off</p>
                </div>
              </div>
            </Link>
          </div>

          {/* Trouble Cards - cards you miss most */}
          <div className="mt-8">
            <Suspense fallback={<div className="h-48 bg-white rounded-2xl animate-pulse" />}>
              <TroubleCards />
            </Suspense>
          </div>
        </>
      )}

      {/* Folder view with breadcrumbs */}
      {isInFolder && (
        <Suspense fallback={<div className="h-12 bg-white rounded-xl animate-pulse mb-6" />}>
          <FolderContents folderId={folderId} />
        </Suspense>
      )}

      {/* Decks section */}
      <div className={isInFolder ? '' : 'mt-10'}>
        {!isInFolder && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Decks</h2>
            <Link href="/study" className="text-sm text-primary-600 hover:text-primary-700">
              View all
            </Link>
          </div>
        )}
        {isInFolder && (
          <Suspense fallback={null}>
            <FolderDeckActions folderId={folderId} />
          </Suspense>
        )}
        <Suspense fallback={<div className="h-48 bg-white rounded-2xl animate-pulse" />}>
          <DeckList folderId={isInFolder ? folderId : undefined} />
        </Suspense>
      </div>
    </div>
  )
}
