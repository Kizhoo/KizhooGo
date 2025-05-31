// Konfigurasi Google Custom Search API
const GOOGLE_API_KEY = 'AIzaSyCWja1Z5bqT_-Vy_J_hxWMb_Da0pjkrzvk';
const GOOGLE_CSE_ID = '234faf42b08954785';
const GOOGLE_API_URL = 'https://cse.google.com/cse?cx=234faf42b08954785';

// Jenis pencarian yang didukung
const SEARCH_TYPES = {
  WEB: 'web',
  IMAGES: 'images',
  NEWS: 'news',
  VIDEOS: 'videos'
};

/**
 * Lakukan pencarian menggunakan Google Custom Search API
 * @param {string} query - Kata kunci pencarian
 * @param {string} type - Jenis pencarian (web, images, news, videos)
 * @param {number} page - Halaman hasil
 * @returns {Promise} - Promise dengan hasil pencarian
 */
export const search = async (query, type = SEARCH_TYPES.WEB, page = 1) => {
  try {
    // Hitung start index untuk paginasi (10 hasil per halaman)
    const startIndex = (page - 1) * 10 + 1;
    
    // Parameter dasar
    const params = new URLSearchParams({
      key: GOOGLE_API_KEY,
      cx: GOOGLE_CSE_ID,
      q: query,
      start: startIndex,
      num: 10,
      hl: 'id', // Bahasa Indonesia
      safe: 'active' // Safe search aktif
    });
    
    // Sesuaikan parameter berdasarkan jenis pencarian
    switch (type) {
      case SEARCH_TYPES.IMAGES:
        params.append('searchType', 'image');
        params.append('imgSize', 'medium');
        break;
      case SEARCH_TYPES.NEWS:
        params.append('sort', 'date');
        break;
      case SEARCH_TYPES.VIDEOS:
        params.append('searchType', 'video');
        break;
    }
    
    // Lakukan request ke Google API
    const response = await fetch(`${GOOGLE_API_URL}?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return formatGoogleResults(data, type);
    
  } catch (error) {
    console.error('Google search error:', error);
    throw error;
  }
};

/**
 * Format hasil pencarian Google
 */
function formatGoogleResults(data, type) {
  if (type === SEARCH_TYPES.IMAGES) {
    return {
      results: data.items?.map(item => ({
        title: item.title,
        url: item.link,
        image: item.link,
        source: getDomainFromUrl(item.image.contextLink) || 'Unknown source'
      })) || [],
      totalResults: data.searchInformation?.totalResults || 0
    };
  }
  
  return {
    results: data.items?.map(item => ({
      title: item.title,
      url: item.link,
      content: item.snippet,
      source: getDomainFromUrl(item.link) || 'Unknown source',
      date: item.pagemap?.metatags?.[0]?.article:published_time || ''
    })) || [],
    totalResults: data.searchInformation?.totalResults || 0
  };
}

/**
 * Helper function untuk ekstrak domain dari URL
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
 * Fallback data jika Google API gagal
 */
export function getFallbackResults(query) {
  return {
    results: [
      {
        title: `Hasil contoh untuk "${query}" - Wikipedia`,
        url: `https://id.wikipedia.org/wiki/${encodeURIComponent(query)}`,
        content: `Ini adalah contoh hasil karena mesin pencari utama sedang tidak tersedia.`,
        source: "wikipedia.org"
      },
      {
        title: `Pembelajaran tentang ${query}`,
        url: `https://example.com/search?q=${encodeURIComponent(query)}`,
        content: `Sistem sedang mengalami masalah koneksi. Ini adalah contoh hasil untuk "${query}".`,
        source: "example.com"
      }
    ],
    totalResults: 2
  };
}
