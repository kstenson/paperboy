import { NextRequest, NextResponse } from 'next/server'
import { importOPMLFeeds } from '@/lib/opml-parser'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('opmlFile') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No OPML file provided' },
        { status: 400 }
      )
    }
    
    if (!file.name.toLowerCase().endsWith('.opml') && !file.name.toLowerCase().endsWith('.xml')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an OPML (.opml) or XML (.xml) file' },
        { status: 400 }
      )
    }
    
    const opmlContent = await file.text()
    
    if (!opmlContent.trim()) {
      return NextResponse.json(
        { error: 'Empty file provided' },
        { status: 400 }
      )
    }
    
    const result = await importOPMLFeeds(opmlContent)
    
    return NextResponse.json({
      message: `Import completed: ${result.success} feeds added, ${result.failed} failed`,
      success: result.success,
      failed: result.failed,
      errors: result.errors
    })
    
  } catch (error) {
    console.error('Error importing OPML:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Failed to import OPML file'
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}