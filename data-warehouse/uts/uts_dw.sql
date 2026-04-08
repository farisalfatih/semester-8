-- MySQL dump 10.13  Distrib 8.0.45, for Linux (x86_64)
--
-- Host: localhost    Database: uts_dw
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `dim_cabang`
--

DROP TABLE IF EXISTS `dim_cabang`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dim_cabang` (
  `id_cabang` int NOT NULL AUTO_INCREMENT,
  `kode_cabang` varchar(10) NOT NULL,
  `nama_cabang` varchar(50) NOT NULL,
  `kota` varchar(30) NOT NULL,
  `region` varchar(20) NOT NULL,
  PRIMARY KEY (`id_cabang`),
  UNIQUE KEY `kode_cabang` (`kode_cabang`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dim_cabang`
--

LOCK TABLES `dim_cabang` WRITE;
/*!40000 ALTER TABLE `dim_cabang` DISABLE KEYS */;
INSERT INTO `dim_cabang` VALUES (1,'CBG-JKT','XYZ Jakarta Pusat','Jakarta','Jabodetabek'),(2,'CBG-BDG','XYZ Bandung','Bandung','Jawa Barat'),(3,'CBG-SBY','XYZ Surabaya','Surabaya','Jawa Timur');
/*!40000 ALTER TABLE `dim_cabang` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dim_pelanggan`
--

DROP TABLE IF EXISTS `dim_pelanggan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dim_pelanggan` (
  `id_pelanggan` int NOT NULL AUTO_INCREMENT,
  `nama_pelanggan` varchar(50) NOT NULL,
  `jenis_kelamin` enum('L','P') NOT NULL,
  `golongan_umur` varchar(20) NOT NULL,
  PRIMARY KEY (`id_pelanggan`)
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dim_pelanggan`
--

LOCK TABLES `dim_pelanggan` WRITE;
/*!40000 ALTER TABLE `dim_pelanggan` DISABLE KEYS */;
INSERT INTO `dim_pelanggan` VALUES (1,'Budi Santoso','L','Dewasa'),(2,'Siti Rahayu','P','Dewasa'),(3,'Ahmad Hidayat','L','Dewasa'),(4,'Dewi Lestari','P','Dewasa'),(5,'Rizky Pratama','L','Remaja'),(6,'Anisa Putri','P','Remaja'),(7,'Hendra Wijaya','L','Dewasa'),(8,'Rina Wati','P','Dewasa'),(9,'Agus Setiawan','L','Lansia'),(10,'Sri Mulyani','P','Lansia'),(11,'Dian Permata','P','Dewasa'),(12,'Fajar Nugroho','L','Remaja'),(13,'Maya Sari','P','Dewasa'),(14,'Joko Widodo','L','Dewasa'),(15,'Lina Marlina','P','Dewasa'),(16,'Dani Firmansyah','L','Dewasa'),(17,'Wulan Dari','P','Remaja'),(18,'Bambang Sutejo','L','Lansia'),(19,'Nur Hidayah','P','Dewasa'),(20,'Romi Saputra','L','Dewasa');
/*!40000 ALTER TABLE `dim_pelanggan` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dim_produk`
--

DROP TABLE IF EXISTS `dim_produk`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dim_produk` (
  `id_produk` int NOT NULL AUTO_INCREMENT,
  `nama_produk` varchar(50) NOT NULL,
  `kategori` varchar(30) NOT NULL,
  `harga_satuan` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id_produk`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dim_produk`
--

LOCK TABLES `dim_produk` WRITE;
/*!40000 ALTER TABLE `dim_produk` DISABLE KEYS */;
INSERT INTO `dim_produk` VALUES (1,'Beras Premium 5kg','Sembako',75000.00),(2,'Minyak Goreng 2L','Sembako',32000.00),(3,'Gula Pasir 1kg','Sembako',16000.00),(4,'Mie Instan (Renceng)','Sembako',13000.00),(5,'Tepung Terigu 1kg','Sembako',12000.00),(6,'Air Mineral 600ml','Minuman',4000.00),(7,'Teh Kotak 250ml','Minuman',4500.00),(8,'Susu UHT 1L','Minuman',18500.00),(9,'Sabun Mandi Batang','Rumah Tangga',3500.00),(10,'Deterjen 900g','Rumah Tangga',22000.00);
/*!40000 ALTER TABLE `dim_produk` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dim_waktu`
--

DROP TABLE IF EXISTS `dim_waktu`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dim_waktu` (
  `id_waktu` int NOT NULL,
  `tanggal` date NOT NULL,
  `hari` varchar(10) NOT NULL,
  `bulan` int NOT NULL,
  `tahun` int NOT NULL,
  `kuartal` int NOT NULL,
  PRIMARY KEY (`id_waktu`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dim_waktu`
--

LOCK TABLES `dim_waktu` WRITE;
/*!40000 ALTER TABLE `dim_waktu` DISABLE KEYS */;
INSERT INTO `dim_waktu` VALUES (20240101,'2024-01-01','Senin',1,2024,1),(20240102,'2024-01-02','Selasa',1,2024,1),(20240103,'2024-01-03','Rabu',1,2024,1),(20240105,'2024-01-05','Jumat',1,2024,1),(20240107,'2024-01-07','Minggu',1,2024,1),(20240108,'2024-01-08','Senin',1,2024,1),(20240110,'2024-01-10','Rabu',1,2024,1),(20240112,'2024-01-12','Jumat',1,2024,1),(20240114,'2024-01-14','Minggu',1,2024,1),(20240115,'2024-01-15','Senin',1,2024,1),(20240118,'2024-01-18','Kamis',1,2024,1),(20240120,'2024-01-20','Sabtu',1,2024,1),(20240122,'2024-01-22','Senin',1,2024,1),(20240125,'2024-01-25','Kamis',1,2024,1),(20240128,'2024-01-28','Minggu',1,2024,1),(20240129,'2024-01-29','Senin',1,2024,1),(20240131,'2024-01-31','Rabu',1,2024,1),(20240203,'2024-02-03','Sabtu',2,2024,1),(20240207,'2024-02-07','Rabu',2,2024,1),(20240210,'2024-02-10','Sabtu',2,2024,1),(20240214,'2024-02-14','Rabu',2,2024,1),(20240218,'2024-02-18','Minggu',2,2024,1),(20240222,'2024-02-22','Kamis',2,2024,1),(20240225,'2024-02-25','Minggu',2,2024,1),(20240229,'2024-02-29','Kamis',2,2024,1),(20240302,'2024-03-02','Sabtu',3,2024,1),(20240306,'2024-03-06','Rabu',3,2024,1),(20240310,'2024-03-10','Minggu',3,2024,1),(20240315,'2024-03-15','Jumat',3,2024,1),(20240319,'2024-03-19','Selasa',3,2024,1),(20240323,'2024-03-23','Sabtu',3,2024,1),(20240327,'2024-03-27','Rabu',3,2024,1),(20240331,'2024-03-31','Minggu',3,2024,1),(20240403,'2024-04-03','Rabu',4,2024,2),(20240407,'2024-04-07','Minggu',4,2024,2),(20240411,'2024-04-11','Kamis',4,2024,2),(20240415,'2024-04-15','Senin',4,2024,2),(20240419,'2024-04-19','Jumat',4,2024,2),(20240423,'2024-04-23','Selasa',4,2024,2),(20240427,'2024-04-27','Sabtu',4,2024,2),(20240430,'2024-04-30','Selasa',4,2024,2),(20240504,'2024-05-04','Sabtu',5,2024,2),(20240508,'2024-05-08','Rabu',5,2024,2),(20240512,'2024-05-12','Minggu',5,2024,2),(20240516,'2024-05-16','Kamis',5,2024,2),(20240520,'2024-05-20','Senin',5,2024,2),(20240525,'2024-05-25','Sabtu',5,2024,2),(20240529,'2024-05-29','Rabu',5,2024,2),(20240602,'2024-06-02','Minggu',6,2024,2),(20240606,'2024-06-06','Kamis',6,2024,2),(20240610,'2024-06-10','Senin',6,2024,2),(20240614,'2024-06-14','Jumat',6,2024,2),(20240618,'2024-06-18','Selasa',6,2024,2),(20240622,'2024-06-22','Sabtu',6,2024,2),(20240626,'2024-06-26','Rabu',6,2024,2),(20240630,'2024-06-30','Minggu',6,2024,2);
/*!40000 ALTER TABLE `dim_waktu` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fact_penjualan`
--

DROP TABLE IF EXISTS `fact_penjualan`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fact_penjualan` (
  `id_transaksi` int NOT NULL AUTO_INCREMENT,
  `id_cabang` int NOT NULL,
  `id_produk` int NOT NULL,
  `id_pelanggan` int NOT NULL,
  `id_waktu` int NOT NULL,
  `jumlah` int NOT NULL,
  `total_harga` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id_transaksi`),
  KEY `id_cabang` (`id_cabang`),
  KEY `id_produk` (`id_produk`),
  KEY `id_pelanggan` (`id_pelanggan`),
  KEY `id_waktu` (`id_waktu`),
  CONSTRAINT `fact_penjualan_ibfk_1` FOREIGN KEY (`id_cabang`) REFERENCES `dim_cabang` (`id_cabang`),
  CONSTRAINT `fact_penjualan_ibfk_2` FOREIGN KEY (`id_produk`) REFERENCES `dim_produk` (`id_produk`),
  CONSTRAINT `fact_penjualan_ibfk_3` FOREIGN KEY (`id_pelanggan`) REFERENCES `dim_pelanggan` (`id_pelanggan`),
  CONSTRAINT `fact_penjualan_ibfk_4` FOREIGN KEY (`id_waktu`) REFERENCES `dim_waktu` (`id_waktu`)
) ENGINE=InnoDB AUTO_INCREMENT=883 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fact_penjualan`
--

LOCK TABLES `fact_penjualan` WRITE;
/*!40000 ALTER TABLE `fact_penjualan` DISABLE KEYS */;
INSERT INTO `fact_penjualan` VALUES (736,1,1,1,20240101,2,150000.00),(737,1,6,2,20240102,5,20000.00),(738,1,2,3,20240105,3,96000.00),(739,1,8,4,20240108,2,37000.00),(740,1,10,5,20240112,1,22000.00),(741,1,4,6,20240115,4,52000.00),(742,1,1,7,20240120,1,75000.00),(743,1,7,8,20240125,6,27000.00),(744,1,3,9,20240128,3,48000.00),(745,1,9,10,20240131,4,14000.00),(746,2,2,11,20240102,2,64000.00),(747,2,5,12,20240105,3,36000.00),(748,2,1,13,20240108,1,75000.00),(749,2,6,14,20240112,8,32000.00),(750,2,10,15,20240115,2,44000.00),(751,2,4,16,20240120,5,65000.00),(752,2,8,17,20240125,3,55500.00),(753,2,3,18,20240128,4,64000.00),(754,2,7,19,20240131,4,18000.00),(755,2,9,20,20240101,5,17500.00),(756,3,1,1,20240103,3,225000.00),(757,3,3,4,20240107,5,80000.00),(758,3,6,7,20240110,10,40000.00),(759,3,2,10,20240114,2,64000.00),(760,3,10,13,20240118,1,22000.00),(761,3,4,16,20240122,6,78000.00),(762,3,8,19,20240125,2,37000.00),(763,3,5,2,20240129,4,48000.00),(764,3,9,5,20240131,6,21000.00),(765,3,7,8,20240128,5,22500.00),(766,1,2,3,20240203,4,128000.00),(767,1,6,6,20240207,12,48000.00),(768,1,1,9,20240210,2,150000.00),(769,1,10,12,20240214,3,66000.00),(770,1,4,15,20240218,3,39000.00),(771,1,8,18,20240222,4,74000.00),(772,1,3,20,20240225,2,32000.00),(773,1,5,2,20240229,5,60000.00),(774,2,1,5,20240203,2,150000.00),(775,2,7,8,20240207,8,36000.00),(776,2,9,11,20240210,6,21000.00),(777,2,2,14,20240214,3,96000.00),(778,2,4,17,20240218,4,52000.00),(779,2,6,20,20240222,6,24000.00),(780,2,10,3,20240225,2,44000.00),(781,2,8,6,20240229,1,18500.00),(782,3,3,1,20240203,6,96000.00),(783,3,5,4,20240207,2,24000.00),(784,3,1,7,20240210,1,75000.00),(785,3,9,10,20240214,8,28000.00),(786,3,2,13,20240218,4,128000.00),(787,3,7,16,20240222,10,45000.00),(788,3,4,19,20240225,3,39000.00),(789,3,6,2,20240229,7,28000.00),(790,1,8,5,20240302,3,55500.00),(791,1,1,8,20240306,2,150000.00),(792,1,6,11,20240310,15,60000.00),(793,1,10,14,20240315,2,44000.00),(794,1,3,17,20240319,4,64000.00),(795,1,2,20,20240323,3,96000.00),(796,1,4,3,20240327,5,65000.00),(797,1,9,6,20240331,7,24500.00),(798,2,4,9,20240302,6,78000.00),(799,2,2,12,20240306,2,64000.00),(800,2,8,15,20240310,3,55500.00),(801,2,1,18,20240315,3,225000.00),(802,2,6,1,20240319,10,40000.00),(803,2,10,4,20240323,4,88000.00),(804,2,5,7,20240327,3,36000.00),(805,2,3,10,20240331,5,80000.00),(806,3,2,13,20240302,5,160000.00),(807,3,9,16,20240306,4,14000.00),(808,3,7,19,20240310,6,27000.00),(809,3,1,2,20240315,2,150000.00),(810,3,4,5,20240319,4,52000.00),(811,3,8,8,20240323,2,37000.00),(812,3,6,11,20240327,12,48000.00),(813,3,3,14,20240331,3,48000.00),(814,1,5,17,20240403,4,48000.00),(815,1,1,20,20240407,1,75000.00),(816,1,10,3,20240411,3,66000.00),(817,1,2,6,20240415,4,128000.00),(818,1,7,9,20240419,8,36000.00),(819,1,4,12,20240423,3,39000.00),(820,1,8,15,20240427,2,37000.00),(821,1,6,18,20240430,10,40000.00),(822,2,3,1,20240403,6,96000.00),(823,2,9,4,20240407,5,17500.00),(824,2,1,7,20240411,2,150000.00),(825,2,6,10,20240415,8,32000.00),(826,2,4,13,20240419,5,65000.00),(827,2,2,16,20240423,3,96000.00),(828,2,10,19,20240427,2,44000.00),(829,2,8,2,20240430,3,55500.00),(830,3,7,5,20240403,12,54000.00),(831,3,2,8,20240407,2,64000.00),(832,3,9,11,20240411,3,10500.00),(833,3,1,14,20240415,4,300000.00),(834,3,5,17,20240419,2,24000.00),(835,3,3,20,20240423,4,64000.00),(836,3,6,3,20240427,15,60000.00),(837,3,4,6,20240430,4,52000.00),(838,1,1,9,20240504,3,225000.00),(839,1,8,12,20240508,4,74000.00),(840,1,3,15,20240512,2,32000.00),(841,1,10,18,20240516,5,110000.00),(842,1,6,1,20240520,8,32000.00),(843,1,2,4,20240525,3,96000.00),(844,1,4,7,20240529,6,78000.00),(845,2,5,10,20240504,3,36000.00),(846,2,7,13,20240508,10,45000.00),(847,2,1,16,20240512,2,150000.00),(848,2,9,19,20240516,4,14000.00),(849,2,2,2,20240520,4,128000.00),(850,2,8,5,20240525,1,18500.00),(851,2,6,8,20240529,12,48000.00),(852,3,4,11,20240504,5,65000.00),(853,3,10,14,20240508,3,66000.00),(854,3,1,17,20240512,1,75000.00),(855,3,3,20,20240516,6,96000.00),(856,3,7,3,20240520,8,36000.00),(857,3,2,6,20240525,5,160000.00),(858,3,9,9,20240529,5,17500.00),(859,1,8,12,20240602,3,55500.00),(860,1,1,15,20240606,2,150000.00),(861,1,6,18,20240610,10,40000.00),(862,1,4,1,20240614,4,52000.00),(863,1,2,4,20240618,3,96000.00),(864,1,10,7,20240622,2,44000.00),(865,1,3,10,20240626,5,80000.00),(866,1,5,13,20240630,2,24000.00),(867,2,9,16,20240602,6,21000.00),(868,2,7,19,20240606,5,22500.00),(869,2,2,2,20240610,4,128000.00),(870,2,1,5,20240614,3,225000.00),(871,2,8,8,20240618,2,37000.00),(872,2,6,11,20240622,8,32000.00),(873,2,4,14,20240626,3,39000.00),(874,2,10,17,20240630,4,88000.00),(875,3,5,20,20240602,3,36000.00),(876,3,3,3,20240606,4,64000.00),(877,3,1,6,20240610,2,150000.00),(878,3,9,9,20240614,7,24500.00),(879,3,2,12,20240618,5,160000.00),(880,3,7,15,20240622,6,27000.00),(881,3,4,18,20240626,5,65000.00),(882,3,8,1,20240630,3,55500.00);
/*!40000 ALTER TABLE `fact_penjualan` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-08 13:19:46
