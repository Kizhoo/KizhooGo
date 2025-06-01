import { search, getFallbackResults } from '../api/search.js';

// Konfigurasi
const RESULTS_PER_PAGE = 10;
const SEARCH_TYPES = {
  WEB: 'web',
  IMAGES: 'images',
  NEWS: 'news',
  VIDEOS: 'videos'
};

// Elemen DOM
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const themeToggle = document.getElementById('themeToggle');
const webResults = document.getElementById('webResults');
const imageResults = document.getElementById('imageResults');
const loading = document.getElementById('loading');
const resultsCount = document.getElementById('resultsCount');
const pagination = document.getElementById('pagination');
const searchTypeButtons = document.querySelectorAll('.search-type-btn');
const searchSuggestions = document.getElementById('searchSuggestions');
const searchHistory = document.getElementById('searchHistory');
const historyList = document.getElementById('historyList');

// State aplikasi
let currentPage = 1;
let totalResults = 0;
let searchType = SEARCH_TYPES.WEB;
let currentQuery = '';
let darkMode = localStorage.getItem('darkMode') === 'true';
let searchHistoryData = JSON.parse(localStorage.getItem('searchHistory')) || [];

// Inisialisasi tema
function initTheme() {
  if (darkMode) {
    document.body.classList.add('dark-mode');
    themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  } else {
    document.body.classList.remove('dark-mode');
    themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
  }
}

// Toggle tema gelap/terang
themeToggle.addEventListener('click', () => {
  darkMode = !darkMode;
  localStorage.setItem('darkMode', darkMode);
  initTheme();
});

// Toggle tipe pencarian
searchTypeButtons.forEach(button => {
  button.addEventListener('click', () => {
    searchTypeButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    searchType = button.dataset.type;
    
    if (currentQuery) {
      currentPage = 1;
      performSearch(currentQuery);
    }
  });
});

// Fungsi pencarian utama
async function performSearch(query) {
  if (!query.trim()) {
    showWelcomeScreen();
    searchHistory.style.display = 'none';
    return;
  }
  
  addToSearchHistory(query);
  currentQuery = query;
  
  loading.classList.remove('hidden');
  webResults.innerHTML = '';
  imageResults.innerHTML = '';
  pagination.innerHTML = '';
  resultsCount.textContent = 'Mencari...';
  searchHistory.style.display = 'none';
  
  try {
    const data = await search(query, searchType, currentPage);
    
    totalResults = parseInt(data.totalResults) || 0;
    const displayedResults = Math.min(data.results.length, RESULTS_PER_PAGE);
    
    resultsCount.textContent = totalResults > 0 ? 
      `Menampilkan ${displayedResults} dari ${totalResults.toLocaleString('id-ID')} hasil` : 
      `Tidak ada hasil untuk "${query}"`;
    
    if (searchType === SEARCH_TYPES.IMAGES) {
      displayImageResults(data.results);
    } else {
      displayWebResults(data.results);
    }
    
    if (totalResults > RESULTS_PER_PAGE) {
      displayPagination(totalResults);
    }
    
  } catch (error) {
    console.error('Search error:', error);
    
    // Gunakan fallback results
    const fallbackData = getFallbackResults(query);
    
    if (searchType === SEARCH_TYPES.IMAGES) {
      displayImageResults(fallbackData.results);
    } else {
      displayWebResults(fallbackData.results);
    }
    
    resultsCount.textContent = `Gagal menghubungi server pencarian. Menampilkan hasil contoh.`;
    
    const errorMsg = document.createElement('div');
    errorMsg.className = 'error-message';
    errorMsg.innerHTML = `
      <i class="fas fa-exclamation-triangle"></i>
      <span>Mode offline: Menampilkan hasil contoh</span>
    `;
    
    const resultsHeader = document.querySelector('.results-header');
    if (resultsHeader) {
      resultsHeader.prepend(errorMsg);
    }
  } finally {
    loading.classList.add('hidden');
  }
}

// Tampilkan hasil web
function displayWebResults(results) {
  webResults.classList.remove('hidden');
  imageResults.classList.add('hidden');
  
  if (results.length === 0) {
    webResults.innerHTML = `
      <div class="no-results">
        <i class="fas fa-search"></i>
        <h3>Tidak ada hasil yang ditemukan</h3>
        <p>Coba gunakan kata kunci yang lebih umum</p>
      </div>
    `;
    return;
  }
  
  results.forEach(result => {
    const resultCard = document.createElement('div');
    resultCard.className = 'result-card';
    
    resultCard.innerHTML = `
      <a href="${result.url}" class="result-title" target="_blank">${result.title}</a>
      <a href="${result.url}" class="result-url" target="_blank">${result.source}</a>
      ${result.date ? `<div class="result-date">${formatDate(result.date)}</div>` : ''}
      <p class="result-snippet">${result.content}</p>
    `;
    
    webResults.appendChild(resultCard);
  });
}

// Tampilkan hasil gambar
function displayImageResults(results) {
  webResults.classList.add('hidden');
  imageResults.classList.remove('hidden');
  
  if (results.length === 0) {
    webResults.innerHTML = `
      <div class="no-results">
        <i class="fas fa-search"></i>
        <h3>Tidak ada gambar yang ditemukan</h3>
        <p>Coba gunakan kata kunci yang lebih umum</p>
      </div>
    `;
    return;
  }
  
  results.forEach(result => {
    const imageCard = document.createElement('div');
    imageCard.className = 'image-result';
    
    imageCard.innerHTML = `
      <img src="${result.image}" alt="${result.title}" loading="lazy">
      <div class="image-title">${result.title}</div>
      <div class="image-source">${result.source}</div>
    `;
    
    imageCard.addEventListener('click', () => {
      window.open(result.url, '_blank');
    });
    
    imageResults.appendChild(imageCard);
  });
}

// Format tanggal
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

// Tampilkan paginasi
function displayPagination(total) {
  const totalPages = Math.ceil(total / RESULTS_PER_PAGE);
  const maxPagesToShow = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
  
  if (endPage - startPage + 1 < maxPagesToShow) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }
  
  pagination.innerHTML = '';
  
  // Tombol Previous
  if (currentPage > 1) {
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.addEventListener('click', () => {
      currentPage--;
      performSearch(currentQuery);
    });
    pagination.appendChild(prevBtn);
  }
  
  // Tombol First Page
  if (startPage > 1) {
    const firstBtn = document.createElement('button');
    firstBtn.className = 'page-btn';
    firstBtn.textContent = '1';
    firstBtn.addEventListener('click', () => {
      currentPage = 1;
      performSearch(currentQuery);
    });
    pagination.appendChild(firstBtn);
    
    if (startPage > 2) {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'page-ellipsis';
      ellipsis.textContent = '...';
      pagination.appendChild(ellipsis);
    }
  }
  
  // Tombol nomor halaman
  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
    pageBtn.textContent = i;
    pageBtn.addEventListener('click', () => {
      currentPage = i;
      performSearch(currentQuery);
    });
    pagination.appendChild(pageBtn);
  }
  
  // Tombol Last Page
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const ellipsis = document.createElement('span');
      ellipsis.className = 'page-ellipsis';
      ellipsis.textContent = '...';
      pagination.appendChild(ellipsis);
    }
    
    const lastBtn = document.createElement('button');
    lastBtn.className = 'page-btn';
    lastBtn.textContent = totalPages;
    lastBtn.addEventListener('click', () => {
      currentPage = totalPages;
      performSearch(currentQuery);
    });
    pagination.appendChild(lastBtn);
  }
  
  // Tombol Next
  if (currentPage < totalPages) {
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.addEventListener('click', () => {
      currentPage++;
      performSearch(currentQuery);
    });
    pagination.appendChild(nextBtn);
  }
}

// Tampilkan layar selamat datang
function showWelcomeScreen() {
  webResults.innerHTML = `
    <div class="no-results">
      <i class="fas fa-search"></i>
      <h3>Selamat datang di SearchNow</h3>
      <p>Mulai pencarian Anda di atas untuk menemukan informasi di seluruh web</p>
      <div class="search-stats">
        <div class="stat-card">
          <i class="fas fa-globe"></i>
          <div class="stat-value">Miliaran halaman</div>
          <div class="stat-label">Diindeks</div>
        </div>
        <div class="stat-card">
          <i class="fas fa-bolt"></i>
          <div class="stat-value">Cepat</div>
          <div class="stat-label">Hasil instan</div>
        </div>
        <div class="stat-card">
          <i class="fas fa-lock"></i>
          <div class="stat-value">Aman</div>
          <div class="stat-label">Pencarian terlindungi</div>
        </div>
      </div>
    </div>
  `;
  imageResults.classList.add('hidden');
  pagination.innerHTML = '';
  resultsCount.textContent = 'Silakan masukkan kata kunci pencarian';
}

// Tambahkan ke riwayat pencarian
function addToSearchHistory(query) {
  searchHistoryData = searchHistoryData.filter(item => item !== query);
  searchHistoryData.unshift(query);
  searchHistoryData = searchHistoryData.slice(0, 8);
  localStorage.setItem('searchHistory', JSON.stringify(searchHistoryData));
  updateHistoryDisplay();
}

// Perbarui tampilan riwayat pencarian
function updateHistoryDisplay() {
  historyList.innerHTML = '';
  
  searchHistoryData.forEach(query => {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    historyItem.innerHTML = `
      <i class="fas fa-history"></i>
      <span>${query}</span>
    `;
    
    historyItem.addEventListener('click', () => {
      searchInput.value = query;
      currentPage = 1;
      performSearch(query);
    });
    
    historyList.appendChild(historyItem);
  });
}

// Event listener untuk pencarian
searchButton.addEventListener('click', () => {
  currentPage = 1;
  performSearch(searchInput.value);
});

searchInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    currentPage = 1;
    performSearch(searchInput.value);
  }
});

// Event listener untuk suggestion
document.querySelectorAll('.suggestion').forEach(suggestion => {
  suggestion.addEventListener('click', () => {
    searchInput.value = suggestion.textContent;
    currentPage = 1;
    performSearch(suggestion.textContent);
  });
});

// Tampilkan riwayat pencarian saat input fokus
searchInput.addEventListener('focus', () => {
  if (searchHistoryData.length > 0) {
    searchHistory.style.display = 'block';
  }
});

// Sembunyikan riwayat pencarian saat klik di luar
document.addEventListener('click', (e) => {
  if (!searchHistory.contains(e.target) && e.target !== searchInput) {
    searchHistory.style.display = 'none';
  }
});

// Inisialisasi aplikasi
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  updateHistoryDisplay();
  searchInput.focus();
  
  const urlParams = new URLSearchParams(window.location.search);
  const queryParam = urlParams.get('q');
  if (queryParam) {
    searchInput.value = queryParam;
    performSearch(queryParam);
  }
});
        
