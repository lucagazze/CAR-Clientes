import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url, filename } = req.query;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'url parameter is required' });
  }

  try {
    // Fetch the media from the target URL (e.g. Meta CDN)
    // Server-side fetch does not pass the user's browser Referer header, avoiding the 403 block.
    const mediaRes = await fetch(url);
    if (!mediaRes.ok) {
      return res.status(mediaRes.status).json({ error: `Failed to fetch media: ${mediaRes.statusText}` });
    }

    // Get content type and headers
    const contentType = mediaRes.headers.get('content-type') || 'application/octet-stream';
    const contentLength = mediaRes.headers.get('content-length');

    // Set headers to trigger a file download in the browser
    const finalFilename = typeof filename === 'string' ? filename : 'download.mp4';
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(finalFilename)}"`);
    res.setHeader('Content-Type', contentType);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    
    // Cache-Control to allow caching for 1 hour
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // Convert response body to a Node Buffer and send it
    if (!mediaRes.body) {
      return res.status(500).json({ error: 'No media body returned' });
    }

    const arrayBuffer = await mediaRes.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return res.status(200).send(buffer);
  } catch (error: any) {
    console.error("Download proxy error:", error);
    return res.status(500).json({ error: error.message });
  }
}
