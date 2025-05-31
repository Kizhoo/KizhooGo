/**
 * Search API with fallback to multiple engines
 * Supports: SearXNG and DuckDuckGo
 */

// List of available search engines
const SEARCH_ENGINES = {
  SEARXNG: 'searxng',
  DUCKDUCKGO: 'duckduckgo'
};

// Configuration for each engine
const ENGINE_CONFIG = {
  [SEARCH_ENGINES.SEARXNG]: {
    instances: [
      'https://searx.be',
      'https://search.us.projectsegfau.lt',
      'https://searx.space'
    ],
    params: {
      format: 'json',
      language: 'id',
      safesearch: 1
    }
  },
  [SEARCH_ENGINES.DUCKDUCKGO]: {
    endpoint: 'https://api.duckduckgo.com/',
    params: {
      format: 'json',
      no_html: 1,
      no_redirect: 1,
      skip_disambig: 1
    }
  }
};

/**
 * Perform search using multiple engines with fallback
 */
export const search = async (query, category = 'web', page = 1) => {
  // Try engines in order of preference
  try {
    return await searchWithEngine(SEARCH_ENGINES.SEARXNG, query, category, page);
  } catch (error) {
    console.warn('SearXNG failed, trying DuckDuckGo:', error);
    return await searchWithEngine(SEARCH_ENGINES.DUCKDUCKGO, query, category, page);
  }
};

/**
 * Search using specific engine
 */
async function searchWithEngine(engine, query, category, page) {
  switch (engine) {
    case SEARCH_ENGINES.SEARXNG:
      return searchWithSearXNG(query, category, page);
    case SEARCH_ENGINES.DUCKDUCKGO:
      return searchWithDuckDuckGo(query);
    default:
      throw new Error('Unsupported search engine');
  }
}

/**
 * SearXNG Search Implementation
 */
async function searchWithSearXNG(query, category, page) {
  let lastError = null;
  
  for (const instance of ENGINE_CONFIG[SEARCH_ENGINES.SEARXNG].instances) {
    try {
      const params = new URLSearchParams({
        ...ENGINE_CONFIG[SEARCH_ENGINES.SEARXNG].params,
        q: query,
        categories: category,
        pageno: page
      });

      const response = await fetch(`${instance}/search?${params.toString()}`, {
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      if (!data.results || data.results.length === 0) {
        throw new Error('No results from this instance');
      }
      
      return formatSearXNGResults(data);

    } catch (error) {
      lastError = error;
      console.warn(`SearXNG instance ${instance} failed:`, error);
    }
  }
  
  throw lastError || new Error('All SearXNG instances failed');
}

/**
 * DuckDuckGo Search Implementation
 */
async function searchWithDuckDuckGo(query) {
  try {
    const params = new URLSearchParams({
      ...ENGINE_CONFIG[SEARCH_ENGINES.DUCKDUCKGO].params,
      q: query
    });

    const response = await fetch(`${ENGINE_CONFIG[SEARCH_ENGINES.DUCKDUCKGO].endpoint}?${params.toString()}`);
    
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    return formatDuckDuckGoResults(data);

  } catch (error) {
    console.error('DuckDuckGo search failed:', error);
    throw error;
  }
}

/**
 * Result Formatters
 */
function formatSearXNGResults(data) {
  return {
    engine: 'SearXNG',
    results: data.results.map(result => ({
      title: result.title || 'No title',
      url: result.url || '#',
      content: result.content || 'No description available',
      source: getDomainFromUrl(result.url) || 'Unknown source',
      image: result.img_src || null
    })),
    hasMore: data.results.length >= 10
  };
}

function formatDuckDuckGoResults(data) {
  return {
    engine: 'DuckDuckGo',
    results: (data.RelatedTopics || []).concat(data.Results || []).map(item => ({
      title: item.Text || item.FirstURL?.split('/').pop() || 'No title',
      url: item.FirstURL || '#',
      content: item.Text || item.Result || 'No description available',
      source: item.FirstURL ? getDomainFromUrl(item.FirstURL) : 'Unknown source',
      image: item.Icon?.URL || null
    })),
    hasMore: false
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
 * Fallback data when all engines fail
 */
export function getFallbackResults(query) {
  return {
    engine: 'Fallback',
    results: [
      {
        title: `Contoh hasil untuk "${query}" - Wikipedia`,
        url: `https://id.wikipedia.org/wiki/${encodeURIComponent(query)}`,
        content: `Ini adalah contoh hasil karena mesin pencari utama sedang tidak tersedia.`,
        source: "wikipedia.org",
        image: null
      },
      {
        title: `Pembelajaran tentang ${query}`,
        url: `https://example.com/search?q=${encodeURIComponent(query)}`,
        content: `Sistem sedang mengalami masalah koneksi. Ini adalah contoh hasil untuk "${query}".`,
        source: "example.com",
        image: null
      }
    ],
    hasMore: false
  };
}
