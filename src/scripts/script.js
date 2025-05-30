import { search } from '../api/search.js';

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

// Konfigurasi
const RESULTS_PER_PAGE = 10;

// State aplikasi
let currentPage = 1;
let totalResults = 0;
let searchType = 'web';
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
    
    // Jika sudah ada query, lakukan pencarian ulang
    if (currentQuery) {
      currentPage = 1;
      performSearch(currentQuery);
    }
  });
});

// Fungsi pencarian
async function performSearch(query) {
  if (!query.trim()) {
    showWelcomeScreen();
    searchHistory.style.display = 'none';
    return;
  }
  
  // Tambahkan ke riwayat pencarian
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
    
    // Proses hasil
    totalResults = data.results?.length || 0;
    resultsCount.textContent = totalResults > 0 ? 
      `Menampilkan ${Math.min(totalResults, RESULTS_PER_PAGE)} dari ${totalResults} hasil` : 
      `Tidak ada hasil untuk "${query}"`;
    
    if (searchType === 'images') {
      displayImageResults(data.results || []);
    } else {
      displayWebResults(data.results || []);
    }
    
    // Tampilkan pagination jika diperlukan
    if (totalResults > RESULTS_PER_PAGE) {
      displayPagination(totalResults);
    }
    
  } catch (error) {
    console.error('Error fetching search results:', error);
    resultsCount.textContent = 'Gagal memuat hasil. Silakan coba lagi.';
    webResults.innerHTML = `
      <div class="no-results">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Terjadi kesalahan</h3>
        <p>Silakan coba lagi atau gunakan kata kunci berbeda</p>
      </div>
    `;
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
  
  results.slice(0, RESULTS_PER_PAGE).forEach(result => {
    const resultCard = document.createElement('div');
    resultCard.className = 'result-card';
    
    resultCard.innerHTML = `
      <a href="${result.url}" class="result-title" target="_blank">${result.title || 'Tanpa judul'}</a>
      <a href="${result.url}" class="result-url" target="_blank">${getDomainFromUrl(result.url) || result.url}</a>
      <p class="result-snippet">${result.content || 'Tidak ada deskripsi'}</p>
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
  
  results.slice(0, RESULTS_PER_PAGE).forEach(result => {
    const imageCard = document.createElement('div');
    imageCard.className = 'image-result';
    
    imageCard.innerHTML = `
      <img src="${result.img_src || 'https://via.placeholder.com/300x200?text=Gambar+Tidak+Tersedia'}" alt="${result.title || ''}">
      <div class="image-title">${result.title || 'Gambar tanpa judul'}</div>
    `;
    
    imageCard.addEventListener('click', () => {
      window.open(result.url, '_blank');
    });
    
    imageResults.appendChild(imageCard);
  });
}

// Tampilkan pagination
function displayPagination(total) {
  const totalPages = Math.ceil(total / RESULTS_PER_PAGE);
  pagination.innerHTML = '';
  
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
  
  for (let i = 1; i <= totalPages; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
    pageBtn.textContent = i;
    pageBtn.addEventListener('click', () => {
      currentPage = i;
      performSearch(currentQuery);
    });
    pagination.appendChild(pageBtn);
  }
  
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

// Ekstrak domain dari URL
function getDomainFromUrl(url) {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain;
  } catch (e) {
    return url;
  }
}

// Tampilkan layar selamat datang
function showWelcomeScreen() {
  webResults.innerHTML = `
    <div class="no-results">
      <i class="fas fa-search"></i>
      <h3>Selamat datang di SearchNow</h3>
      <p>Mulai pencarian Anda di atas untuk menemukan informasi di seluruh web</p>
    </div>
  `;
  imageResults.classList.add('hidden');
  pagination.innerHTML = '';
  resultsCount.textContent = 'Silakan masukkan kata kunci pencarian';
}

// Tambahkan ke riwayat pencarian
function addToSearchHistory(query) {
  // Hapus duplikat
  searchHistoryData = searchHistoryData.filter(item => item !== query);
  
  // Tambahkan ke awal
  searchHistoryData.unshift(query);
  
  // Batasi hanya 5 item terbaru
  searchHistoryData = searchHistoryData.slice(0, 5);
  
  // Simpan ke localStorage
  localStorage.setItem('searchHistory', JSON.stringify(searchHistoryData));
  
  // Perbarui tampilan
  updateHistoryDisplay();
}

// Perbarui tampilan riwayat pencarian
function updateHistoryDisplay() {
  historyList.innerHTML = '';
  
  searchHistoryData.forEach(query => {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    historyItem.textContent = query;
    
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
  
  // Fokus ke input pencarian
  searchInput.focus();
  
  // Contoh pencarian jika ada query di URL
  const urlParams = new URLSearchParams(window.location.search);
  const queryParam = urlParams.get('q');
  if (queryParam) {
    searchInput.value = queryParam;
    performSearch(queryParam);
  }
});
