'use client'

import { useState, useEffect } from 'react'

export interface ReferenceFile {
  id: number
  deckId: number
  fileName: string
  blobUrl: string
  fileType: string // 'pdf' | 'txt' | 'md'
  fileSize: number | null
  createdAt: string
}

interface ReferencePanelProps {
  files: ReferenceFile[]
  isOpen: boolean
  onClose: () => void
}

export default function ReferencePanel({ files, isOpen, onClose }: ReferencePanelProps) {
  const [selectedFile, setSelectedFile] = useState<ReferenceFile | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [loadingText, setLoadingText] = useState(false)

  // Select first file by default when panel opens
  useEffect(() => {
    if (isOpen && files.length > 0 && !selectedFile) {
      setSelectedFile(files[0])
    }
  }, [isOpen, files, selectedFile])

  // Load text content for TXT/MD files
  useEffect(() => {
    async function loadTextContent() {
      if (!selectedFile || selectedFile.fileType === 'pdf') {
        setTextContent(null)
        return
      }

      setLoadingText(true)
      try {
        const response = await fetch(selectedFile.blobUrl)
        const text = await response.text()
        setTextContent(text)
      } catch (error) {
        console.error('Failed to load text content:', error)
        setTextContent('Failed to load file content')
      } finally {
        setLoadingText(false)
      }
    }

    loadTextContent()
  }, [selectedFile])

  if (!isOpen) return null

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] md:w-[600px] lg:w-[700px] bg-white shadow-2xl z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">Reference Materials</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          title="Close panel"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* File tabs (if multiple files) */}
      {files.length > 1 && (
        <div className="flex gap-1 p-2 border-b border-gray-200 overflow-x-auto bg-gray-50">
          {files.map((file) => (
            <button
              key={file.id}
              onClick={() => setSelectedFile(file)}
              className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors ${
                selectedFile?.id === file.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <span className="flex items-center gap-1.5">
                {file.fileType === 'pdf' ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                  </svg>
                ) : file.fileType === 'image' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                {file.fileName.length > 20 ? file.fileName.slice(0, 17) + '...' : file.fileName}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {selectedFile ? (
          selectedFile.fileType === 'pdf' ? (
            // PDF Viewer (iframe)
            <iframe
              src={selectedFile.blobUrl}
              className="w-full h-full border-0"
              title={selectedFile.fileName}
            />
          ) : selectedFile.fileType === 'image' ? (
            // Image viewer
            <div className="h-full overflow-auto p-4 bg-gray-50 flex items-center justify-center">
              <img
                src={selectedFile.blobUrl}
                alt={selectedFile.fileName}
                className="max-w-full max-h-full object-contain rounded-lg shadow-md"
              />
            </div>
          ) : (
            // Text/Markdown viewer
            <div className="h-full overflow-auto p-4 bg-gray-50">
              {loadingText ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono bg-white p-4 rounded-lg border border-gray-200">
                  {textContent}
                </pre>
              )}
            </div>
          )
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            No file selected
          </div>
        )}
      </div>

      {/* Footer with file info */}
      {selectedFile && (
        <div className="p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
          <span>{selectedFile.fileName}</span>
          <span className="flex items-center gap-3">
            <span className="uppercase">{selectedFile.fileType}</span>
            {selectedFile.fileSize && <span>{formatFileSize(selectedFile.fileSize)}</span>}
            <a
              href={selectedFile.blobUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700"
            >
              Open in new tab
            </a>
          </span>
        </div>
      )}
    </div>
  )
}
