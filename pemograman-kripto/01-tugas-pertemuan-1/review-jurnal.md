# SLIDE 1 — JUDUL SESI REVIEW

## Kajian Literatur: Pengembangan Patterned Dataset untuk Prediksi Harga Cryptocurrency

> Tinjauan tiga studi berkesinambungan yang membangun fondasi metodologi dari statistik deskriptif hingga optimasi deep learning

---
---

# PAPER 1

---

# SLIDE 2 — Identitas Paper 1

## Paper 1
### Minimum, Maximum, and Average Implementation of Patterned Datasets in Mapping Cryptocurrency Fluctuation Patterns

> Studi ini menjadi titik awal pengembangan Patterned Dataset sebagai pendekatan baru dalam pemetaan fluktuasi harga cryptocurrency.

---

# SLIDE 3 — Tujuan & Sumber Data (Paper 1)

## Tujuan Penelitian
Membangun dan menguji Patterned Dataset berbasis statistik deskriptif (MIN, MAX, AVG) untuk memetakan pola fluktuasi harga cryptocurrency secara real-time.

## Sumber Data
- API publik **Indodax** (BTC/IDR dan >300 cryptocurrency lainnya)
- Format **JSON**: harga Low, High, Last (Current), dan timestamp
- Periode analisis: **5 bulan tahun 2022**, dihitung per hari

---

# SLIDE 4 — Metode Pembangunan Dataset (Paper 1)

## Formula Patterned Dataset

| Variabel | Keterangan | Rumus |
|----------|------------|-------|
| R | Range Harga | H − L |
| TR | Top Range | H − C |
| LR | Lower Range | C − L |
| PTR | % Top Range | (TR / R) × 100% |
| PLR | % Lower Range | (LR / R) × 100% |

**Kondisi Kunci:**
- **Crash Condition**: PLR = 0, PTR = 100 → harga menyentuh titik terendah
- **Moon Condition**: PLR = 100, PTR = 0 → harga menyentuh titik tertinggi

---

# SLIDE 5 — Hasil & Kesimpulan (Paper 1)

## Perbandingan Fungsi Statistik

| Fungsi | Kemampuan Deteksi |
|--------|-------------------|
| MIN | Sulit menandai awal/akhir fluktuasi |
| MAX | Menandai akhir fluktuasi lebih jelas, awal kurang |
| **AVG** | **Paling akurat menandai awal dan akhir fluktuasi** |

## Kesimpulan
Fungsi **AVG** pada Patterned Dataset memberikan hasil paling presisi dalam mendeteksi perpotongan garis Moon dan Crash sebagai indikator awal pergerakan harga.

> Dataset ini berpotensi dikombinasikan dengan ML, DL, ARIMA, LSTM, dan GRU untuk analisis lebih lanjut.

---
---

# PAPER 2

---

# SLIDE 6 — Identitas Paper 2

## Paper 2
### Patterned Dataset Model for Cryptocurrency Prediction

> Melanjutkan Paper 1, studi ini mengembangkan Patterned Dataset menjadi model prediktif dengan menggabungkan K-Means Clustering dan Deep Learning (GRU vs LSTM-Conv2D).

---

# SLIDE 7 — Tujuan & Data (Paper 2)

## Tujuan Penelitian
- Menentukan pengaruh fluktuasi Bitcoin terhadap altcoin
- Mengoptimalkan **Return on Investment (ROI)** harian dan bulanan
- Membandingkan model **GRU** vs **LSTM-Conv2D** untuk prediksi skenario crash

## Data yang Digunakan
- Sumber: **Indodax**, harga BTC & altcoin dalam IDR
- Clustering: **Mei 2022 – Desember 2022**
- Analisis ROI: **Mei 2022 – April 2024**

---

# SLIDE 8 — Pengembangan Metode (Paper 2)

## Tiga Jenis Dataset

| Jenis | Deskripsi |
|-------|-----------|
| Complete | Semua kondisi pasar |
| Moon | Kondisi harga naik |
| **Crash** | **Kondisi harga turun (hasil terbaik)** |

## K-Means Clustering (2 Cluster)
Dievaluasi dengan 8 metrik: MIS, AMI, NMI, RI, ARI, FMS, HS, VMS
→ **Dataset Crash menghasilkan performa clustering terbaik**

---

# SLIDE 9 — Hasil & Kesimpulan (Paper 2)

## Perbandingan Model Deep Learning

| Model | Keunggulan |
|-------|------------|
| GRU | Lebih sederhana, cepat |
| **LSTM-Conv2D** | **Lebih akurat dalam memprediksi Dataset Crash** |

## Hasil ROI
- ROI **bulanan** lebih tinggi dibanding akumulasi ROI harian
- Contoh: Juni 2022 → potensi profit **45,93%** pada BTC-IDR (Diamond Crash)

## Kesimpulan
Patterned Dataset Model efektif membaca kondisi pasar; LSTM-Conv2D unggul untuk prediksi skenario crash dan dapat dikombinasikan dengan model ML/DL lainnya.

---
---

# PAPER 3

---

# SLIDE 10 — Identitas Paper 3

## Paper 3
### Optimasi Model Dataset Pola untuk Prediksi Harga Bitcoin IDR Menggunakan LSTM

> Membangun temuan Paper 2, studi ini berfokus pada optimasi akurasi prediksi LSTM melalui strategi resampling pada kondisi crash, menghasilkan model prediksi harga BTC-IDR hingga 30 hari ke depan.

---

# SLIDE 11 — Tujuan & Pendekatan (Paper 3)

## Pertanyaan Penelitian
- Bagaimana meningkatkan akurasi model Patterned Dataset dibanding studi sebelumnya?
- Strategi resampling mana yang paling optimal?
- Model apa yang memberikan solusi paling efektif?

## Pendekatan Baru
Menggunakan **Patterned Resample Dataset** pada kondisi crash dengan berbagai interval resampling:
- Harian: 1D – 7D
- Per jam: 1H – 12H
- Per detik: **60 detik (baseline)**

---

# SLIDE 12 — Arsitektur Model LSTM (Paper 3)

## Konfigurasi LSTM

| Parameter | Nilai |
|-----------|-------|
| Layer LSTM | 2 layer, 50 unit/layer |
| Dropout | 20% |
| Optimizer | Adam |
| Loss Function | MSE |
| Epochs | 20 |
| Batch Size | 32 |
| Window Size | 60 |
| Train/Test Split | 80% / 20% |

Preprocessing: **MinMaxScaler (0–1)**, denormalisasi setelah prediksi

---

# SLIDE 13 — Hasil Perbandingan Model (Paper 3)

## Performa pada Dataset Crash

| Model | MAPE | RMSE |
|-------|------|------|
| **LSTM (60s)** | **0,19%** | 870.680 |
| 1D CNN / Conv1D | 4,49% | 28.563.972 |
| ARIMA | 1,11% | 465.748.959 |

## Hasil Resampling Terbaik (3H)
- MAE: 1,523,853 × 10⁷
- RMSE: 1,994,634 × 10⁷
- **MAPE: 1,30%**
- Periode data: Mei 2022 – 23 Januari 2025

---

# SLIDE 14 — Kesimpulan (Paper 3)

## Temuan Utama
- LSTM dengan resampling **3 jam (3H)** memberikan performa prediksi terbaik pada kondisi crash
- Model mampu memprediksi harga BTC-IDR **hingga 30 hari ke depan** dengan tingkat error rendah

## Kontribusi
Penggabungan Patterned Dataset, strategi resampling adaptif, dan LSTM menghasilkan model prediksi yang robust untuk pasar volatile

---
---

# SLIDE 15 — SINTESIS & BENANG MERAH

## Perkembangan Penelitian: Dari Pemetaan ke Prediksi

```
Paper 1                  Paper 2                  Paper 3
──────────────────────────────────────────────────────────
Membangun          →   Menambahkan          →   Mengoptimalkan
Patterned Dataset      K-Means + DL             Resampling LSTM
(AVG terbaik)          (Crash Dataset           (MAPE 1,30%,
                        + LSTM-Conv2D)           prediksi 30 hari)
```

## Kontribusi Kumulatif
- **Paper 1** → Fondasi: konstruksi dataset dan deteksi sinyal
- **Paper 2** → Validasi: clustering + pemilihan model deep learning
- **Paper 3** → Optimasi: resampling + akurasi prediksi jangka pendek

> Ketiga studi membentuk satu kerangka metodologi yang utuh dan dapat diperluas dengan analisis sentimen, model transformer, atau data multi-exchange.

---
