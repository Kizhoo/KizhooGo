/**
 * Search API using SearXNG instance
 * @param {string} query - Search query
 * @param {string} category - Search category (web, images, news, videos)
 * @param {number} page - Page number
 * @returns {Promise} - Promise with search results
 */
export const search = async (query, category = 'web', page = 1) => {
  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      categories: category,
      pageno: page,
      language: 'id'
    });

    const response = await fetch(`/api/search?${params.toString()}`);
    
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Search API error:', error);
    throw error;
  }
};
