-- 1. Total penjualan per cabang
SELECT 
    c.nama_cabang,
    COUNT(f.id_transaksi) AS jumlah_transaksi,
    SUM(f.jumlah) AS total_qty,
    SUM(f.total_harga) AS total_penjualan
FROM fact_penjualan f
JOIN dim_cabang c ON f.id_cabang = c.id_cabang
GROUP BY c.nama_cabang;

-- 2. Penjualan per kategori produk
SELECT 
    p.kategori,
    SUM(f.jumlah) AS total_qty,
    SUM(f.total_harga) AS total_penjualan
FROM fact_penjualan f
JOIN dim_produk p ON f.id_produk = p.id_produk
GROUP BY p.kategori;

-- 3. Trend penjualan per bulan
SELECT 
    w.bulan,
    w.tahun,
    SUM(f.total_harga) AS total_penjualan
FROM fact_penjualan f
JOIN dim_waktu w ON f.id_waktu = w.id_waktu
GROUP BY w.tahun, w.bulan
ORDER BY w.tahun, w.bulan;

-- 4. Performa cabang per kuartal
SELECT 
    c.nama_cabang,
    w.kuartal,
    SUM(f.total_harga) AS total_penjualan
FROM fact_penjualan f
JOIN dim_cabang c ON f.id_cabang = c.id_cabang
JOIN dim_waktu w ON f.id_waktu = w.id_waktu
GROUP BY c.nama_cabang, w.kuartal
ORDER BY c.nama_cabang, w.kuartal;

-- 5. Analisis berdasarkan jenis kelamin pelanggan
SELECT 
    p.jenis_kelamin,
    COUNT(DISTINCT f.id_pelanggan) AS jumlah_pelanggan,
    SUM(f.total_harga) AS total_belanja
FROM fact_penjualan f
JOIN dim_pelanggan p ON f.id_pelanggan = p.id_pelanggan
GROUP BY p.jenis_kelamin;

-- 6. Top 5 produk terlaris
SELECT 
    pr.nama_produk,
    SUM(f.jumlah) AS total_terjual,
    SUM(f.total_harga) AS total_penjualan
FROM fact_penjualan f
JOIN dim_produk pr ON f.id_produk = pr.id_produk
GROUP BY pr.nama_produk
ORDER BY total_terjual DESC
LIMIT 5;
