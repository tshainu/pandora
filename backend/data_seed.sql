/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.8.6-MariaDB, for debian-linux-gnu (x86_64)
--
-- Host: localhost    Database: pandora_db
-- ------------------------------------------------------
-- Server version	11.8.6-MariaDB-0+deb13u1 from Debian

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `employees`
--

DROP TABLE IF EXISTS `employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `employees` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `department` varchar(255) NOT NULL,
  `position` varchar(255) NOT NULL,
  `employee_id` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_id` (`employee_id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `employees`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `employees` WRITE;
/*!40000 ALTER TABLE `employees` DISABLE KEYS */;
INSERT INTO `employees` VALUES
(1,'Nimal Perera','Sewing','Machine Operator','PG001','2026-06-10 04:15:41'),
(2,'Kumari Silva','Cutting','Cutter','PG002','2026-06-10 04:15:42'),
(3,'Ruwan Fernando','Quality Control','QC Inspector','PG003','2026-06-10 04:15:42'),
(4,'Shamila Dias','Finishing','Finisher','PG004','2026-06-10 04:15:42'),
(5,'Pradeep Jayawardena','Administration','Admin Officer','PG005','2026-06-10 04:15:42');
/*!40000 ALTER TABLE `employees` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `evaluations`
--

DROP TABLE IF EXISTS `evaluations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `evaluations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` int(11) NOT NULL,
  `month` varchar(7) NOT NULL,
  `supervisor_name` varchar(255) NOT NULL,
  `evaluation_date` varchar(20) NOT NULL,
  `days_leave_taken` int(11) NOT NULL DEFAULT 0,
  `attendance_score` int(11) NOT NULL DEFAULT 0,
  `attendance_remark` text DEFAULT NULL,
  `late_minutes` int(11) NOT NULL DEFAULT 0,
  `punctuality_score` int(11) NOT NULL DEFAULT 0,
  `punctuality_remark` text DEFAULT NULL,
  `productivity_stars` int(11) NOT NULL DEFAULT 0,
  `productivity_score` int(11) NOT NULL DEFAULT 0,
  `productivity_remark` text DEFAULT NULL,
  `quality_stars` int(11) NOT NULL DEFAULT 0,
  `quality_score` int(11) NOT NULL DEFAULT 0,
  `quality_remark` text DEFAULT NULL,
  `team_respect_supervisors` tinyint(1) NOT NULL DEFAULT 0,
  `team_cooperation` tinyint(1) NOT NULL DEFAULT 0,
  `team_follow_instructions` tinyint(1) NOT NULL DEFAULT 0,
  `team_no_conflicts` tinyint(1) NOT NULL DEFAULT 0,
  `teamwork_score` int(11) NOT NULL DEFAULT 0,
  `teamwork_remark` text DEFAULT NULL,
  `initiative_stars` int(11) NOT NULL DEFAULT 0,
  `initiative_score` int(11) NOT NULL DEFAULT 0,
  `initiative_remark` text DEFAULT NULL,
  `discipline_phone_stars` int(11) NOT NULL DEFAULT 0,
  `discipline_activities_stars` int(11) NOT NULL DEFAULT 0,
  `discipline_behaviour_stars` int(11) NOT NULL DEFAULT 0,
  `discipline_score` decimal(5,2) NOT NULL DEFAULT 0.00,
  `discipline_remark` text DEFAULT NULL,
  `total_score` decimal(8,2) NOT NULL DEFAULT 0.00,
  `percentage` decimal(5,2) NOT NULL DEFAULT 0.00,
  `grade` varchar(50) NOT NULL DEFAULT '',
  `recommendation` varchar(100) DEFAULT 'No Action',
  `supervisor_comment` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `employee_id` (`employee_id`),
  CONSTRAINT `evaluations_ibfk_1` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `evaluations`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `evaluations` WRITE;
/*!40000 ALTER TABLE `evaluations` DISABLE KEYS */;
INSERT INTO `evaluations` VALUES
(1,1,'2025-05','Saman Rathnayake','2025-05-31',0,10,'Perfect attendance',0,10,'Always on time',5,10,'Exceeds targets',4,8,'High quality work',1,1,1,1,10,'Team player',4,8,'Shows initiative',5,5,4,9.30,'Very disciplined',65.30,93.30,'Excellent','Promote','Outstanding employee','2026-06-10 04:15:42');
/*!40000 ALTER TABLE `evaluations` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-06-10  7:41:57
