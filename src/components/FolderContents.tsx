'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Folder {
  id: number
  name: string
  parentId: number | null
  depth: number
  deckCount?: number
}

interface FolderContentsProps {
  folderId: number
}

export default function FolderContents({ folderId }: FolderContentsProps) {
  const router = useRouter()
  const [folder, setFolder] = useState<Folder | null>(null)
  const [subfolders, setSubfolders] = useState<Folder[]>([])
  const [breadcrumbs, setBreadcrumbs] = useState<Folder[]>([])
  const [loading, setLoading] = useState(true)
  const [creatingSubfolder, setCreatingSubfolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameName, setRenameName] = useState('')

  useEffect(() => {
    async function fetchFolderData() {
      try {
        // Fetch current folder with contents
        const res = await fetch(`/api/folders/${folderId}`)
        if (!res.ok) throw new Error('Failed to fetch folder')
        const data = await res.json()

        setFolder(data)
        setSubfolders(data.subfolders || [])

        // Build breadcrumbs by fetching all folders and walking up the tree
        const foldersRes = await fetch('/api/folders')
        if (foldersRes.ok) {
          const allFolders: Folder[] = await foldersRes.json()
          const crumbs: Folder[] = []
          let current = data as Folder

          // Walk up the parent chain
          while (current.parentId !== null) {
            const parent = allFolders.find(f => f.id === current.parentId)
            if (parent) {
              crumbs.unshift(parent)
              current = parent
            } else {
              break
            }
          }

          setBreadcrumbs(crumbs)
        }
      } catch (error) {
        console.error('Error fetching folder:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchFolderData()
  }, [folderId])

  async function createSubfolder() {
    if (!newFolderName.trim() || !folder) return

    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim(), parentId: folderId }),
      })

      if (res.ok) {
        const newFolder = await res.json()
        setSubfolders([...subfolders, newFolder])
        setNewFolderName('')
        setCreatingSubfolder(false)
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to create subfolder')
      }
    } catch (error) {
      console.error('Error creating subfolder:', error)
      alert('Failed to create subfolder')
    }
  }

  async function renameFolder() {
    if (!renameName.trim() || !folder) return

    try {
      const res = await fetch(`/api/folders/${folderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameName.trim() }),
      })

      if (res.ok) {
        setFolder({ ...folder, name: renameName.trim() })
        setIsRenaming(false)
        setRenameName('')
        router.refresh()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to rename folder')
      }
    } catch (error) {
      console.error('Error renaming folder:', error)
      alert('Failed to rename folder')
    }
  }

  function startRenaming() {
    if (folder) {
      setRenameName(folder.name)
      setIsRenaming(true)
    }
  }

  const canCreateSubfolder = folder && folder.depth < 2

  if (loading) {
    return <div className="h-12 bg-white rounded-xl animate-pulse mb-6" />
  }

  if (!folder) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-xl mb-6">
        Folder not found
      </div>
    )
  }

  return (
    <div className="mb-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm mb-4">
        <Link
          href="/"
          className="text-gray-500 hover:text-primary-600 transition-colors"
        >
          Home
        </Link>

        {breadcrumbs.map((crumb) => (
          <span key={crumb.id} className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <Link
              href={`/?folderId=${crumb.id}`}
              className="text-gray-500 hover:text-primary-600 transition-colors"
            >
              {crumb.name}
            </Link>
          </span>
        ))}

        <span className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-900 font-medium">{folder.name}</span>
        </span>
      </nav>

      {/* Folder title */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
            </svg>
          </div>
          <div>
            {isRenaming ? (
              <input
                type="text"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') renameFolder()
                  if (e.key === 'Escape') {
                    setIsRenaming(false)
                    setRenameName('')
                  }
                }}
                onBlur={() => {
                  if (renameName.trim()) renameFolder()
                  else {
                    setIsRenaming(false)
                    setRenameName('')
                  }
                }}
                className="text-xl font-bold text-gray-900 bg-white border-2 border-primary-300 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-primary-400"
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{folder.name}</h1>
                <button
                  onClick={startRenaming}
                  className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                  title="Rename folder"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              </div>
            )}
            {subfolders.length > 0 && !isRenaming && (
              <p className="text-sm text-gray-500">{subfolders.length} subfolder{subfolders.length !== 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
        {canCreateSubfolder && !creatingSubfolder && (
          <button
            onClick={() => setCreatingSubfolder(true)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Subfolder
          </button>
        )}
      </div>

      {/* Subfolders grid */}
      {(subfolders.length > 0 || creatingSubfolder) && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Subfolders</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {subfolders.map((subfolder) => (
              <Link
                key={subfolder.id}
                href={`/?folderId=${subfolder.id}`}
                className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-primary-200 hover:shadow-soft transition-all"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700 truncate">{subfolder.name}</span>
              </Link>
            ))}
            {/* New subfolder input */}
            {creatingSubfolder && (
              <div className="flex items-center gap-2 p-3 bg-white rounded-xl border-2 border-amber-200">
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') createSubfolder()
                    if (e.key === 'Escape') {
                      setCreatingSubfolder(false)
                      setNewFolderName('')
                    }
                  }}
                  onBlur={() => {
                    if (newFolderName.trim()) createSubfolder()
                    else {
                      setCreatingSubfolder(false)
                      setNewFolderName('')
                    }
                  }}
                  placeholder="Folder name"
                  className="flex-1 text-sm bg-transparent border-none outline-none placeholder-gray-400"
                  autoFocus
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Decks header */}
      <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Decks in this folder</h2>
    </div>
  )
}
