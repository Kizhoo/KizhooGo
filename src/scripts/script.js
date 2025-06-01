// Konfigurasi RapidAPI (sesuai gambar yang Anda kirim)
const RAPIDAPI_KEY = 'dc8a533ac0mshd3cd2043aa2a303p14a474jsn89ce876f8d3b'; // Ganti dengan API key Anda
const RAPIDAPI_HOST = 'google-api-unlimited.p.rapidapi.com';
const RESULTS_PER_PAGE = 10;

// Elemen DOM
const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const safeSearchCheckbox = document.getElementById('safe-search-checkbox');
const safeSearchStatus = document.getElementById('safe-search-status');
const safeSearchToggle = document.getElementById('safe-search-toggle');
const resultsContainer = document.getElementById('results-container');
const paginationContainer = document.getElementById('pagination');
const loadingElement = document.getElementById('loading');
const noResultsElement = document.getElementById('no-results');
const errorMessageElement = document.getElementById('error-message');
const errorTextElement = document.getElementById('error-text');
const resultStatsElement = document.getElementById('result-stats');

// State aplikasi
let currentQuery = '';
let currentPage = 1;
let totalResults = 0;
let searchTime = 0;

// Event Listeners
searchButton.addEventListener('click', performSearch);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
});

safeSearchToggle.addEventListener('click', () => {
    safeSearchCheckbox.checked = !safeSearchCheckbox.checked;
    updateSafeSearchStatus();
    if (currentQuery) performSearch();
});

// Fungsi utama untuk melakukan pencarian
async function performSearch() {
    const query = searchInput.value.trim();
    if (!query) return;
    
    currentQuery = query;
    currentPage = 1;
    
    showLoading();
    hideError();
    hideNoResults();
    
    try {
        const startTime = performance.now();
        const response = await fetchSearchResults(query, currentPage);
        const endTime = performance.now();
        searchTime = (endTime - startTime) / 1000;
        
        displayResults(response);
        updateStats(response.search_metadata?.total_results || 0);
        
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Fungsi untuk mengambil hasil pencarian dari RapidAPI (sesuai gambar)
async function fetchSearchResults(query, page = 1) {
    const safeSearchValue = safeSearchCheckbox.checked ? 'active' : 'off';
    const startIndex = (page - 1) * RESULTS_PER_PAGE + 1;
    
    const url = `https://${RAPIDAPI_HOST}/search`;
    
    const params = new URLSearchParams({
        query: query,
        num_results: RESULTS_PER_PAGE,
        start: startIndex,
        lang: 'id',
        region: 'id',
        safe: safeSearchValue
    });

    const options = {
        method: 'POST',
        headers: {
            'content-type': 'application/x-www-form-urlencoded',
            'X-RapidAPI-Key': RAPIDAPI_KEY,
            'X-RapidAPI-Host': RAPIDAPI_HOST
        },
        body: params
    };

    const response = await fetch(url, options);
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
}

// Fungsi untuk menampilkan hasil pencarian
function displayResults(data) {
    resultsContainer.innerHTML = '';
    
    if (!data.organic_results || data.organic_results.length === 0) {
        showNoResults();
        return;
    }
    
    data.organic_results.forEach(item => {
        const resultElement = document.createElement('div');
        resultElement.className = 'result-item';
        
        const domain = getDomainFromUrl(item.link);
        let dateInfo = '';
        
        if (item.date) {
            try {
                const date = new Date(item.date);
                dateInfo = date.toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                });
            } catch {
                dateInfo = item.date;
            }
        }
        
        resultElement.innerHTML = `
            <h3><a href="${item.link}" target="_blank">${item.title}</a></h3>
            <a href="${item.link}" target="_blank" class="result-url">${domain}</a>
            <p class="result-snippet">${item.snippet}</p>
            <div class="result-meta">
                ${dateInfo ? `<span><i class="far fa-calendar"></i> ${dateInfo}</span>` : ''}
                ${item.rating ? `<span><i class="fas fa-star"></i> ${item.rating}</span>` : ''}
            </div>
        `;
        
        resultsContainer.appendChild(resultElement);
    });
    
    createPagination(data.search_metadata?.total_results || 0);
}

// Fungsi untuk membuat paginasi
function createPagination(total) {
    paginationContainer.innerHTML = '';
    totalResults = total;
    
    if (total <= RESULTS_PER_PAGE) return;
    
    const totalPages = Math.ceil(total / RESULTS_PER_PAGE);
    const maxVisiblePages = 5;
    let startPage, endPage;
    
    if (totalPages <= maxVisiblePages) {
        startPage = 1;
        endPage = totalPages;
    } else {
        const maxPagesBeforeCurrent = Math.floor(maxVisiblePages / 2);
        const maxPagesAfterCurrent = Math.ceil(maxVisiblePages / 2) - 1;
        
        if (currentPage <= maxPagesBeforeCurrent) {
            startPage = 1;
            endPage = maxVisiblePages;
        } else if (currentPage + maxPagesAfterCurrent >= totalPages) {
            startPage = totalPages - maxVisiblePages + 1;
            endPage = totalPages;
        } else {
            startPage = currentPage - maxPagesBeforeCurrent;
            endPage = currentPage + maxPagesAfterCurrent;
        }
    }
    
    // Tombol Previous
    if (currentPage > 1) {
        const prevButton = document.createElement('button');
        prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevButton.addEventListener('click', () => goToPage(currentPage - 1));
        paginationContainer.appendChild(prevButton);
    }
    
    // Tombol halaman
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.classList.toggle('active', i === currentPage);
        
        if (i !== currentPage) {
            pageButton.addEventListener('click', () => goToPage(i));
        }
        
        paginationContainer.appendChild(pageButton);
    }
    
    // Tombol Next
    if (currentPage < totalPages) {
        const nextButton = document.createElement('button');
        nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextButton.addEventListener('click', () => goToPage(currentPage + 1));
        paginationContainer.appendChild(nextButton);
    }
}

// Fungsi untuk pergi ke halaman tertentu
async function goToPage(page) {
    currentPage = page;
    showLoading();
    
    try {
        const data = await fetchSearchResults(currentQuery, currentPage);
        displayResults(data);
        resultsContainer.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        showError(error.message);
    } finally {
        hideLoading();
    }
}

// Fungsi untuk memperbarui statistik
function updateStats(total) {
    const start = (currentPage - 1) * RESULTS_PER_PAGE + 1;
    const end = Math.min(currentPage * RESULTS_PER_PAGE, total);
    
    resultStatsElement.textContent = 
        `Menampilkan ${end} dari ${total} hasil (${searchTime.toFixed(2)} detik)`;
}

// Fungsi untuk memperbarui status SafeSearch
function updateSafeSearchStatus() {
    safeSearchStatus.textContent = safeSearchCheckbox.checked ? 'Aktif' : 'Nonaktif';
}

// Helper: ekstrak domain dari URL
function getDomainFromUrl(url) {
    try {
        const domain = new URL(url).hostname.replace('www.', '');
        return domain;
    } catch {
        return url;
    }
}

// Fungsi untuk menampilkan/menyembunyikan loading
function showLoading() {
    loadingElement.style.display = 'block';
    resultsContainer.innerHTML = '';
    paginationContainer.innerHTML = '';
}

function hideLoading() {
    loadingElement.style.display = 'none';
}

// Fungsi untuk menampilkan/menyembunyikan pesan error
function showError(message) {
    errorTextElement.textContent = message;
    errorMessageElement.style.display = 'block';
}

function hideError() {
    errorMessageElement.style.display = 'none';
}

// Fungsi untuk menampilkan/menyembunyikan pesan tidak ada hasil
function showNoResults() {
    noResultsElement.style.display = 'block';
}

function hideNoResults() {
    noResultsElement.style.display = 'none';
}

// Inisialisasi
updateSafeSearchStatus();
