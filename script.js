// Global variables
let currentStage = 1; // 1 = Kurir -> Pengirim, 2 = Pengirim -> Penerima
let deliveryData = null;
let courierCoords = null;
let senderCoords = null;
let receiverCoords = null;

// DOM elements
const courierLocationInput = document.getElementById('courierLocation');
const getLocationButton = document.getElementById('getLocationButton');
const whatsappMessageTextarea = document.getElementById('whatsappMessage');
const processButton = document.getElementById('processButton');
const errorSection = document.getElementById('errorSection');
const errorText = document.getElementById('errorText');
const deliverySection = document.getElementById('deliverySection');
const mapSection = document.getElementById('mapSection');
const mapTitle = document.getElementById('mapTitle');
const nextStepButton = document.getElementById('nextStepButton');
const instructionsSection = document.getElementById('instructionsSection');
const openMapsButton = document.getElementById('openMapsButton');
const routeDescription = document.getElementById('routeDescription');
const fromLocation = document.getElementById('fromLocation');
const toLocation = document.getElementById('toLocation');
const manualFallback = document.getElementById('manualFallback');
const copyUrlButton = document.getElementById('copyUrlButton');

// Info elements
const senderNameEl = document.getElementById('senderName');
const receiverNameEl = document.getElementById('receiverName');
const weightEl = document.getElementById('weight');
const distanceEl = document.getElementById('distance');
const shippingCostEl = document.getElementById('shippingCost');
const currentStatusEl = document.getElementById('currentStatus');
const routeStageEl = document.getElementById('routeStage');

// Event listeners
processButton.addEventListener('click', processWhatsAppMessage);
nextStepButton.addEventListener('click', proceedToNextStep);
getLocationButton.addEventListener('click', getCurrentLocation);
openMapsButton.addEventListener('click', openGoogleMaps);
copyUrlButton.addEventListener('click', copyMapsUrl);
whatsappMessageTextarea.addEventListener('input', clearPreviousResults);
courierLocationInput.addEventListener('input', clearPreviousResults);

/**
 * Clear previous results when user starts typing
 */
function clearPreviousResults() {
    hideSection(errorSection);
    hideSection(deliverySection);
    hideSection(mapSection);
    hideSection(instructionsSection);
    currentStage = 1;
}

/**
 * Main function to process WhatsApp message
 */
function processWhatsAppMessage() {
    const message = whatsappMessageTextarea.value.trim();
    const courierLocation = courierLocationInput.value.trim();
    
    if (!courierLocation) {
        showError('Silakan masukkan lokasi kurir (pangkalan) terlebih dahulu.');
        return;
    }
    
    if (!message) {
        showError('Silakan tempel pesan WhatsApp terlebih dahulu.');
        return;
    }

    try {
        // Parse courier coordinates
        courierCoords = parseCoordinates(courierLocation);
        
        // Extract JSON from message
        deliveryData = extractJSONFromMessage(message);
        
        // Validate delivery data
        validateDeliveryData(deliveryData);
        
        // Parse coordinates
        senderCoords = parseCoordinates(deliveryData.pengirim.lokasi);
        receiverCoords = parseCoordinates(deliveryData.penerima.lokasi);
        
        // Display delivery info
        displayDeliveryInfo(deliveryData);
        
        // Start with stage 1: Kurir -> Pengirim
        currentStage = 1;
        showStage1();
        
    } catch (error) {
        showError(error.message);
        console.error('Error processing message:', error);
    }
}

/**
 * Show Stage 1: Kurir -> Pengirim
 */
function showStage1() {
    // Update UI elements
    mapTitle.textContent = 'Rute: Kurir → Pengirim';
    currentStatusEl.textContent = 'Menuju Pengirim';
    routeStageEl.textContent = 'Tahap 1/2';
    routeStageEl.className = 'badge bg-primary';
    
    // Update route description
    routeDescription.textContent = 'Siap navigasi dari lokasi kurir ke pengirim';
    fromLocation.textContent = 'Kurir';
    toLocation.textContent = deliveryData.pengirim.nama;
    
    // Show elements
    showSection(deliverySection);
    showSection(mapSection);
    showSection(instructionsSection);
    
    // Show next step button
    nextStepButton.style.display = 'inline-block';
    
    hideSection(errorSection);
}

/**
 * Proceed to Stage 2: Kurir -> Penerima (langsung)
 */
function proceedToNextStep() {
    currentStage = 2;
    
    // Update UI elements
    mapTitle.textContent = 'Rute: Kurir → Penerima';
    currentStatusEl.textContent = 'Menuju Penerima';
    routeStageEl.textContent = 'Tahap 2/2';
    routeStageEl.className = 'badge bg-success';
    
    // Update route description
    routeDescription.textContent = 'Siap navigasi dari kurir ke penerima (langsung)';
    fromLocation.textContent = 'Kurir';
    toLocation.textContent = deliveryData.penerima.nama;
    
    // Hide next step button and instructions
    nextStepButton.style.display = 'none';
    hideSection(instructionsSection);
}

/**
 * Open Google Maps with current route
 */
function openGoogleMaps() {
    let fromCoords, toCoords;
    
    if (currentStage === 1) {
        fromCoords = courierCoords;
        toCoords = senderCoords;
    } else {
        // Stage 2: Kurir langsung ke penerima
        fromCoords = courierCoords;
        toCoords = receiverCoords;
    }
    
    const from = `${fromCoords[0]},${fromCoords[1]}`;
    const to = `${toCoords[0]},${toCoords[1]}`;
    
    // Show manual fallback for Android issues
    if (navigator.userAgent.indexOf('Android') !== -1) {
        manualFallback.style.display = 'block';
    }
    
    // Check if it's mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
        // Try to open native Google Maps app
        if (navigator.userAgent.indexOf('Android') !== -1) {
            // Android: Use the working format with My+Location
            const androidUrl = `https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=${to}`;
            window.location.href = androidUrl;
        } else if (navigator.userAgent.indexOf('iPhone') !== -1 || navigator.userAgent.indexOf('iPad') !== -1) {
            // iOS: Use comgooglemaps scheme
            const iosURL = `comgooglemaps://?saddr=${from}&daddr=${to}&directionsmode=driving`;
            const iosFallback = `https://maps.google.com/maps?saddr=${from}&daddr=${to}&directionsmode=driving`;
            
            try {
                window.location.href = iosURL;
            } catch (e) {
                window.open(iosFallback, '_blank');
            }
        } else {
            // Other mobile devices - use web version
            const webURL = `https://maps.google.com/maps?saddr=${from}&daddr=${to}&directionsmode=driving`;
            window.open(webURL, '_blank');
        }
    } else {
        // Desktop - open in new tab
        const webURL = `https://maps.google.com/maps?saddr=${from}&daddr=${to}&directionsmode=driving`;
        window.open(webURL, '_blank');
    }
}

/**
 * Get current location using GPS
 */
function getCurrentLocation() {
    if (!navigator.geolocation) {
        showError('GPS tidak tersedia di browser ini. Silakan masukkan koordinat secara manual.');
        return;
    }

    // Show loading on button
    getLocationButton.disabled = true;
    getLocationButton.innerHTML = '<div class="spinner-border spinner-border-sm me-1"></div>Mengambil GPS...';

    navigator.geolocation.getCurrentPosition(
        function(position) {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            courierLocationInput.value = `${lat}, ${lon}`;
            
            // Reset button
            getLocationButton.disabled = false;
            getLocationButton.innerHTML = '<i class="fas fa-crosshairs me-1"></i>Ambil GPS';
        },
        function(error) {
            let errorMessage = 'Gagal mengambil lokasi GPS. ';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += 'Izin lokasi ditolak. Silakan aktifkan GPS dan izinkan akses lokasi.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += 'Lokasi tidak tersedia. Pastikan GPS aktif.';
                    break;
                case error.TIMEOUT:
                    errorMessage += 'Waktu habis mencari lokasi. Coba lagi.';
                    break;
                default:
                    errorMessage += 'Error tidak diketahui.';
                    break;
            }
            showError(errorMessage);
            
            // Reset button
            getLocationButton.disabled = false;
            getLocationButton.innerHTML = '<i class="fas fa-crosshairs me-1"></i>Ambil GPS';
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }
    );
}

/**
 * Generate Google Maps directions URL - simple approach without API key
 */
function generateGoogleMapsURL(fromCoords, toCoords) {
    const from = `${fromCoords[0]},${fromCoords[1]}`;
    const to = `${toCoords[0]},${toCoords[1]}`;
    
    // Simple Google Maps directions URL that works without API key
    return `https://www.google.com/maps/dir/${from}/${to}/@${from},15z`;
}

/**
 * Extract JSON data from WhatsApp message
 */
function extractJSONFromMessage(message) {
    try {
        // Look for JSON pattern in the message
        const jsonMatch = message.match(/\{[\s\S]*\}/);
        
        if (!jsonMatch) {
            throw new Error('Tidak ditemukan data JSON dalam pesan. Pastikan pesan mengandung data pengiriman dalam format JSON.');
        }
        
        const jsonString = jsonMatch[0];
        const data = JSON.parse(jsonString);
        
        return data;
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error('Format JSON tidak valid. Silakan periksa kembali data pengiriman.');
        }
        throw error;
    }
}

/**
 * Validate delivery data structure
 */
function validateDeliveryData(data) {
    const requiredFields = [
        'pengirim.nama',
        'pengirim.lokasi',
        'penerima.nama',
        'penerima.lokasi',
        'beratKg',
        'jarakKm',
        'ongkir'
    ];
    
    for (const field of requiredFields) {
        const fieldParts = field.split('.');
        let value = data;
        
        for (const part of fieldParts) {
            if (!value || value[part] === undefined || value[part] === null) {
                throw new Error(`Field '${field}' tidak ditemukan atau kosong dalam data pengiriman.`);
            }
            value = value[part];
        }
    }
}

/**
 * Parse coordinate string to [lat, lon] array
 */
function parseCoordinates(coordString) {
    try {
        const coords = coordString.split(',').map(coord => parseFloat(coord.trim()));
        
        if (coords.length !== 2 || coords.some(isNaN)) {
            throw new Error(`Format koordinat tidak valid: ${coordString}`);
        }
        
        const [lat, lon] = coords;
        
        // Basic validation for Indonesian coordinates
        if (lat < -11 || lat > 6 || lon < 95 || lon > 141) {
            throw new Error(`Koordinat di luar wilayah Indonesia: ${coordString}`);
        }
        
        return [lat, lon];
    } catch (error) {
        throw new Error(`Error parsing koordinat "${coordString}": ${error.message}`);
    }
}

/**
 * Display delivery information in the UI
 */
function displayDeliveryInfo(data) {
    senderNameEl.textContent = data.pengirim.nama;
    receiverNameEl.textContent = data.penerima.nama;
    weightEl.textContent = `${data.beratKg} kg`;
    distanceEl.textContent = `${data.jarakKm} km`;
    shippingCostEl.textContent = `Rp ${data.ongkir.toLocaleString('id-ID')}`;
}

/**
 * Utility functions for showing/hiding sections
 */
function showSection(element) {
    element.style.display = 'block';
}

function hideSection(element) {
    element.style.display = 'none';
}

function showError(message) {
    errorText.textContent = message;
    showSection(errorSection);
    hideSection(deliverySection);
    hideSection(mapSection);
    hideSection(instructionsSection);
}

// Auto-fill example data for testing
document.addEventListener('DOMContentLoaded', function() {
    // Add example data to textarea for easier testing
    const exampleData = `Halo SANTRI EXPRESS!

Saya ingin memesan jasa pengiriman:

{
  "pengirim": {
    "nama": "Gia",
    "lokasi": "-7.663677, 111.115465"
  },
  "penerima": {
    "nama": "The",
    "lokasi": "-7.671843, 111.161385"
  },
  "beratKg": 1,
  "jarakKm": 7.47,
  "ongkir": 14205
}

Mohon konfirmasi ketersediaan layanan. Terima kasih!`;
    
    // Don't auto-fill to keep it clean for actual use
    // whatsappMessageTextarea.value = exampleData;
});

/**
 * Copy Google Maps URL to clipboard for manual fallback
 */
function copyMapsUrl() {
    let fromCoords, toCoords;
    
    if (currentStage === 1) {
        fromCoords = courierCoords;
        toCoords = senderCoords;
    } else {
        fromCoords = courierCoords;
        toCoords = receiverCoords;
    }
    
    const to = `${toCoords[0]},${toCoords[1]}`;
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=${to}`;
    
    // Try to copy to clipboard
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(mapsUrl).then(() => {
            copyUrlButton.innerHTML = '<i class="fas fa-check me-1"></i>Link Disalin!';
            copyUrlButton.classList.remove('btn-outline-primary');
            copyUrlButton.classList.add('btn-success');
            
            setTimeout(() => {
                copyUrlButton.innerHTML = '<i class="fas fa-copy me-1"></i>Copy Link Google Maps';
                copyUrlButton.classList.remove('btn-success');
                copyUrlButton.classList.add('btn-outline-primary');
            }, 2000);
        }).catch(() => {
            // Fallback: show URL in alert for manual copy
            alert(`Copy link ini ke Google Maps:\n\n${mapsUrl}`);
        });
    } else {
        // Fallback for older browsers
        alert(`Copy link ini ke Google Maps:\n\n${mapsUrl}`);
    }
}