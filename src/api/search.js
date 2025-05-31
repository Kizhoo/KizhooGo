// List of reliable SearXNG instances
const SEARXNG_INSTANCES = [
  'https://searx.be',
  'https://search.us.projectsegfau.lt',
  'https://searx.space',
  'https://searx.nixnet.services',
  'https://search.garudalinux.org'
];

/**
 * Perform search using SearXNG instances
 * @param {string} query - Search query
 * @param {string} category - Search category (web, images, news, videos)
 * @param {number} page - Page number
 * @returns {Promise} - Promise with search results
 */
export const search = async (query, category = 'web', page = 1) => {
  let lastError = null;
  
  // Try all instances in order
  for (const instance of SEARXNG_INSTANCES) {
    try {
      const params = new URLSearchParams({
        q: query,
        format: 'json',
        categories: category,
        pageno: page,
        language: 'id',
        safesearch: 1
      });

      const response = await fetch(`${instance}/search?${params.toString()}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000) // Timeout after 5 seconds
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      if (!data.results || data.results.length === 0) {
        throw new Error('No results from this instance');
      }
      
      return formatResults(data);

    } catch (error) {
      lastError = error;
      console.warn(`SearXNG instance ${instance} failed:`, error.message);
      // Wait a bit before trying next instance
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  throw lastError || new Error('All SearXNG instances failed');
};

/**
 * Format search results consistently
 */
function formatResults(data) {
  return {
    results: data.results.map(result => ({
      title: result.title || 'Tidak ada judul',
      url: result.url || '#',
      content: result.content || 'Tidak ada deskripsi tersedia',
      source: getDomainFromUrl(result.url) || 'Sumber tidak diketahui',
      image: result.img_src || null,
      engine: 'SearXNG'
    })),
    hasMore: data.results.length >= 10
  };
}

/**
 * Helper function to extract domain from URL
 */
function getDomainFromUrl(url) {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain;
  } catch (e) {
    return url;
  }
}

/**
 * Fallback data when all instances fail
 */
export function getFallbackResults(query) {
  return {
    results: [
      {
        title: `Contoh hasil untuk "${query}" - Wikipedia`,
        url: `https://id.wikipedia.org/wiki/${encodeURIComponent(query)}`,
        content: `Ini adalah contoh hasil karena mesin pencari utama sedang tidak tersedia.`,
        source: "wikipedia.org",
        image: null,
        engine: 'Fallback'
      },
      {
        title: `Pembelajaran tentang ${query}`,
        url: `https://example.com/search?q=${encodeURIComponent(query)}`,
        content: `Sistem sedang mengalami masalah koneksi. Ini adalah contoh hasil untuk "${query}".`,
        source: "example.com",
        image: null,
        engine: 'Fallback'
      }
    ],
    hasMore: false
  };
}
