import { useState, useRef, useEffect } from 'react';
import './App.css';

interface DetectionObject {
  id: number;
  name: string;
  confidence: number;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

function App() {
  const [detectedObjects, setDetectedObjects] = useState<DetectionObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<'connecting' | 'connected' | 'failed'>('connecting');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Data deteksi contoh (akan diganti dengan deteksi real)
  const generateRandomDetections = (): DetectionObject[] => {
    const objects = ['Person', 'Vehicle', 'Bag', 'Animal', 'Bicycle', 'Motorcycle', 'Car', 'Truck'];
    const colors = ['#FF6B9D', '#FF8EAD', '#FFABC7', '#FFC4D6', '#FF9EC9', '#FF7EB3'];
    
    const detections: DetectionObject[] = [];
    const count = Math.floor(Math.random() * 4) + 2; // 2-5 deteksi
    
    for (let i = 0; i < count; i++) {
      const randomObject = objects[Math.floor(Math.random() * objects.length)];
      const randomColor = colors[i % colors.length];
      const randomConfidence = Math.floor(Math.random() * 30) + 70; // 70-100%
      
      detections.push({
        id: i + 1,
        name: randomObject,
        confidence: randomConfidence,
        color: randomColor,
        x: Math.random() * 0.7,
        y: Math.random() * 0.7,
        width: 0.1 + Math.random() * 0.2,
        height: 0.1 + Math.random() * 0.2
      });
    }
    
    return detections;
  };

  // Simulasi update deteksi secara berkala
  useEffect(() => {
    if (videoReady) {
      const interval = setInterval(() => {
        setDetectedObjects(generateRandomDetections());
      }, 3000); // Update setiap 3 detik
      
      return () => clearInterval(interval);
    }
  }, [videoReady]);

  // Fungsi untuk menggambar kotak deteksi
  const drawDetectionBoxes = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size sesuai video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Jika tidak ada deteksi, return
    if (detectedObjects.length === 0) return;
    
    // Gambar kotak deteksi untuk setiap objek
    detectedObjects.forEach((obj) => {
      const x = obj.x * canvas.width;
      const y = obj.y * canvas.height;
      const width = obj.width * canvas.width;
      const height = obj.height * canvas.height;
      
      // Gambar kotak dengan sudut membulat
      ctx.strokeStyle = obj.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 8);
      ctx.stroke();
      
      // Gambar background label
      const label = `${obj.name} ${obj.confidence}%`;
      ctx.font = 'bold 14px Inter, Arial, sans-serif';
      const textMetrics = ctx.measureText(label);
      const textWidth = textMetrics.width + 20;
      const textHeight = 24;
      
      // Background rounded
      ctx.fillStyle = obj.color;
      ctx.beginPath();
      ctx.roundRect(x, y - textHeight, textWidth, textHeight, 6);
      ctx.fill();
      
      // Teks label
      ctx.fillStyle = '#FFFFFF';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, x + 10, y - textHeight / 2);
      
      // Corner indicators
      const cornerSize = 12;
      ctx.fillStyle = obj.color;
      
      // Top-left corner
      ctx.fillRect(x - 1, y - 1, cornerSize, 3);
      ctx.fillRect(x - 1, y - 1, 3, cornerSize);
      
      // Top-right corner
      ctx.fillRect(x + width - cornerSize + 1, y - 1, cornerSize, 3);
      ctx.fillRect(x + width - 2, y - 1, 3, cornerSize);
      
      // Bottom-left corner
      ctx.fillRect(x - 1, y + height - 2, cornerSize, 3);
      ctx.fillRect(x - 1, y + height - cornerSize + 1, 3, cornerSize);
      
      // Bottom-right corner
      ctx.fillRect(x + width - cornerSize + 1, y + height - 2, cornerSize, 3);
      ctx.fillRect(x + width - 2, y + height - cornerSize + 1, 3, cornerSize);
    });
  };

  // Update canvas saat deteksi berubah
  useEffect(() => {
    if (videoReady) {
      drawDetectionBoxes();
    }
  }, [detectedObjects, videoReady]);

  // Inisialisasi kamera saat komponen dimuat
  useEffect(() => {
    const initializeCamera = async () => {
      try {
        setIsLoading(true);
        setCameraStatus('connecting');
        
        // Dapatkan stream kamera
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'environment'
          },
          audio: false
        });
        
        streamRef.current = stream;
        
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          
          video.onloadedmetadata = () => {
            video.play()
              .then(() => {
                setVideoReady(true);
                setCameraStatus('connected');
                setIsLoading(false);
                
                // Mulai deteksi setelah kamera siap
                setTimeout(() => {
                  setDetectedObjects(generateRandomDetections());
                }, 1000);
              })
              .catch((error) => {
                console.error('Error playing video:', error);
                setCameraError('Gagal memutar video');
                setCameraStatus('failed');
              });
          };
          
          video.onerror = () => {
            setCameraError('Error pada video stream');
            setCameraStatus('failed');
          };
        }
      } catch (error: any) {
        console.error('Error accessing camera:', error);
        setCameraStatus('failed');
        
        if (error.name === 'NotAllowedError') {
          setCameraError('Izin kamera ditolak. Silakan berikan izin akses kamera.');
        } else if (error.name === 'NotFoundError') {
          setCameraError('Kamera tidak ditemukan.');
        } else {
          setCameraError('Gagal mengakses kamera. Pastikan kamera tersedia dan diizinkan.');
        }
        setIsLoading(false);
      }
    };

    initializeCamera();

    // Cleanup saat komponen di-unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Render
  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <div className="logo-icon">🛡️</div>
            <div className="logo-text">
              <h1>CCTV Deteksi Objek</h1>
              <p className="tagline">Sistem Pengawasan Real-time dengan AI</p>
            </div>
          </div>
          
          <div className="status-indicator">
            <div className={`status-dot ${cameraStatus}`}></div>
            <span className="status-text">
              {cameraStatus === 'connecting' && 'MENGHUBUNGKAN...'}
              {cameraStatus === 'connected' && 'TERHUBUNG ● LIVE'}
              {cameraStatus === 'failed' && 'TERPUTUS'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        <div className="container">
          {/* CCTV Feed Section */}
          <div className="cctv-section">
            <div className="section-header">
              <h2>
                <span className="section-icon">📹</span>
                CCTV LIVE FEED
              </h2>
              <div className="timestamp">
                <span className="time">{new Date().toLocaleTimeString()}</span>
                <span className="date">{new Date().toLocaleDateString('id-ID')}</span>
              </div>
            </div>

            <div className="cctv-feed-container">
              {cameraError && (
                <div className="error-overlay">
                  <div className="error-content">
                    <div className="error-icon">⚠️</div>
                    <h3>Kamera Error</h3>
                    <p>{cameraError}</p>
                    <button 
                      className="retry-btn"
                      onClick={() => window.location.reload()}
                    >
                      Muat Ulang Halaman
                    </button>
                  </div>
                </div>
              )}

              <div className="video-wrapper">
                <video
                  ref={videoRef}
                  className="cctv-video"
                  autoPlay
                  playsInline
                  muted
                />
                <canvas
                  ref={canvasRef}
                  className="detection-canvas"
                />

                {isLoading && (
                  <div className="loading-overlay">
                    <div className="loading-spinner"></div>
                    <p>Menyiapkan CCTV...</p>
                  </div>
                )}

                {/* Overlay informasi */}
                <div className="video-overlay">
                  <div className="overlay-item recording">
                    <span className="red-dot"></span>
                    REC
                  </div>
                  <div className="overlay-item resolution">
                    HD 720p
                  </div>
                </div>
              </div>

              <div className="cctv-info">
                <div className="info-grid">
                  <div className="info-card">
                    <div className="info-icon">🔍</div>
                    <div className="info-content">
                      <h4>Deteksi Aktif</h4>
                      <p className="info-value">{detectedObjects.length} Objek</p>
                    </div>
                  </div>
                  <div className="info-card">
                    <div className="info-icon">📊</div>
                    <div className="info-content">
                      <h4>Akurasi</h4>
                      <p className="info-value">
                        {detectedObjects.length > 0 
                          ? Math.round(detectedObjects.reduce((acc, obj) => acc + obj.confidence, 0) / detectedObjects.length) + '%'
                          : '0%'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="info-card">
                    <div className="info-icon">⏱️</div>
                    <div className="info-content">
                      <h4>Uptime</h4>
                      <p className="info-value">24/7</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detection Results Section */}
          <div className="detection-section">
            <div className="section-header">
              <h2>
                <span className="section-icon">🚨</span>
                DETEKSI OBJEK
              </h2>
              <div className="last-update">
                Terupdate: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            <div className="detection-container">
              {detectedObjects.length > 0 ? (
                <>
                  <div className="detection-list">
                    {detectedObjects.map((obj) => (
                      <div className="detection-card" key={obj.id}>
                        <div 
                          className="detection-header"
                          style={{ backgroundColor: obj.color + '40' }}
                        >
                          <div className="detection-type">
                            <div 
                              className="type-icon"
                              style={{ backgroundColor: obj.color }}
                            >
                              {obj.name.charAt(0)}
                            </div>
                            <div className="type-info">
                              <h3>{obj.name}</h3>
                              <span className="confidence-badge">
                                {obj.confidence}% Confidence
                              </span>
                            </div>
                          </div>
                          <div className="detection-time">
                            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        
                        <div className="detection-body">
                          <div className="detection-metrics">
                            <div className="metric">
                              <span className="metric-label">Ukuran</span>
                              <span className="metric-value">
                                {Math.round(obj.width * 100)}×{Math.round(obj.height * 100)}px
                              </span>
                            </div>
                            <div className="metric">
                              <span className="metric-label">Posisi</span>
                              <span className="metric-value">
                                {Math.round(obj.x * 100)}%, {Math.round(obj.y * 100)}%
                              </span>
                            </div>
                          </div>
                          
                          <div className="confidence-bar">
                            <div className="bar-label">
                              <span>Level Deteksi</span>
                              <span>{obj.confidence}%</span>
                            </div>
                            <div className="bar-container">
                              <div 
                                className="bar-fill"
                                style={{ 
                                  width: `${obj.confidence}%`,
                                  backgroundColor: obj.color
                                }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="detection-summary">
                    <h3>Ringkasan Deteksi</h3>
                    <div className="summary-grid">
                      <div className="summary-item">
                        <span className="summary-label">Total Deteksi</span>
                        <span className="summary-value">{detectedObjects.length}</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Rata-rata Akurasi</span>
                        <span className="summary-value">
                          {detectedObjects.length > 0 
                            ? Math.round(detectedObjects.reduce((acc, obj) => acc + obj.confidence, 0) / detectedObjects.length) + '%'
                            : '0%'
                          }
                        </span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Status Sistem</span>
                        <span className="summary-value active">OPTIMAL</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="no-detections">
                  <div className="no-detection-icon">
                    <div className="radar">
                      <div className="radar-circle"></div>
                      <div className="radar-sweep"></div>
                    </div>
                  </div>
                  <h3>Memindai Area...</h3>
                  <p>Sistem sedang memindai area pengawasan. Deteksi akan muncul di sini.</p>
                  {isLoading && (
                    <div className="scanning-text">
                      <span className="dots">
                        <span>.</span>
                        <span>.</span>
                        <span>.</span>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

            {/* Footer dengan Nama Developer */}
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-developer-info">
            <div className="developer-card">
              <div className="developer-avatar">
                <span className="avatar-icon">👩‍💻</span>
              </div>
              <div className="developer-details">
                <h3 className="developer-name">Nirmalasari</h3>
                <p className="developer-role">Frontend Developer</p>
                <div className="developer-skills">
                  <span className="skill-tag">UI/UX Design</span>
                  <span className="skill-tag">React</span>
                  <span className="skill-tag">TypeScript</span>
                </div>
              </div>
            </div>
            
            <div className="developer-card">
              <div className="developer-avatar">
                <span className="avatar-icon">👨‍💻</span>
              </div>
              <div className="developer-details">
                <h3 className="developer-name">Aldi Alfatih</h3>
                <p className="developer-role">Full Stack Developer</p>
                <div className="developer-skills">
                  <span className="skill-tag">AI Integration</span>
                  <span className="skill-tag">Computer Vision</span>
                  <span className="skill-tag">Backend</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="footer-system-info">
            <div className="system-status">
              <div className="status-indicators">
                <div className="status-item">
                  <div className={`status-light ${cameraStatus === 'connected' ? 'online' : 'offline'}`}></div>
                  <span>CCTV Status: {cameraStatus === 'connected' ? 'LIVE' : 'OFFLINE'}</span>
                </div>
                <div className="status-item">
                  <div className="status-light detection"></div>
                  <span>Detection: {detectedObjects.length} Objects</span>
                </div>
                <div className="status-item">
                  <div className="status-light active"></div>
                  <span>System: {cameraStatus === 'connected' ? 'ACTIVE' : 'INACTIVE'}</span>
                </div>
              </div>
              
              <div className="performance-metrics">
                <div className="metric">
                  <span className="metric-label">Accuracy</span>
                  <span className="metric-value">
                    {detectedObjects.length > 0 
                      ? Math.round(detectedObjects.reduce((acc, obj) => acc + obj.confidence, 0) / detectedObjects.length) + '%'
                      : '--%'
                    }
                  </span>
                </div>
                <div className="metric">
                  <span className="metric-label">FPS</span>
                  <span className="metric-value">30</span>
                </div>
                <div className="metric">
                  <span className="metric-label">Uptime</span>
                  <span className="metric-value">100%</span>
                </div>
              </div>
            </div>
            
            <div className="footer-logo">
              <div className="logo-container">
                <span className="logo-symbol">🔒</span>
                <div className="logo-text">
                  <h3 className="logo-title">SecureVision AI</h3>
                  <p className="logo-subtitle">Intelligent Surveillance System</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="copyright">
            <p>
              © {new Date().getFullYear()} CCTV Detection System v2.0 • 
              Developed by <span className="highlight">Nirmalasari</span> & <span className="highlight">Aldi Alfatih</span>
            </p>
            <p className="tech-stack">
              Built with: React • TypeScript • TensorFlow.js • Computer Vision
            </p>
          </div>
          
          <div className="footer-links">
            <a href="#" className="footer-link">Documentation</a>
            <span className="separator">•</span>
            <a href="#" className="footer-link">API Reference</a>
            <span className="separator">•</span>
            <a href="#" className="footer-link">GitHub</a>
            <span className="separator">•</span>
            <a href="#" className="footer-link">Contact</a>
          </div>
        </div>
        
        <div className="footer-badge">
          <span className="badge-text">🚀 Real-time Object Detection</span>
          <span className="badge-version">v2.0.1</span>
        </div>
      </footer>
    </div>
  );
}

export default App;