-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: leetec_sms
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `__efmigrationshistory`
--

DROP TABLE IF EXISTS `__efmigrationshistory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `__efmigrationshistory` (
  `MigrationId` varchar(150) NOT NULL,
  `ProductVersion` varchar(32) NOT NULL,
  PRIMARY KEY (`MigrationId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `__efmigrationshistory`
--

LOCK TABLES `__efmigrationshistory` WRITE;
/*!40000 ALTER TABLE `__efmigrationshistory` DISABLE KEYS */;
INSERT INTO `__efmigrationshistory` VALUES ('20260429161340_InitialCreate','8.0.4'),('20260429164747_AddAuthModels','8.0.4'),('20260429170232_AddNewTables','8.0.4'),('20260501144500_AddSISModels','8.0.4'),('20260503071708_AddFeesAndBillingModule','8.0.4'),('20260503113206_RemovePostedById','8.0.4'),('20260503125003_AddStudentPortalAccount','8.0.4'),('20260518131429_MakeStudentUserIdNullable','8.0.4'),('20260601105027_AddTermRegistrations','8.0.4'),('20260603142255_AddFeePackageLocking','8.0.4'),('20260604095500_MakeInvoiceFeePackageNullable','8.0.4'),('20260611034349_AddSubjects','8.0.4'),('20260614150323_AddStudentCurriculum','8.0.4'),('20260614162059_AddMarks','8.0.4'),('20260616032540_AddReportCardRecords','8.0.4'),('20260616062821_AddAnnouncements','8.0.4'),('20260616095037_AddTeacherSubjectAssignments','8.0.4'),('20260616172109_AddUserPhoneNumber','8.0.4');
/*!40000 ALTER TABLE `__efmigrationshistory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `announcements`
--

DROP TABLE IF EXISTS `announcements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `announcements` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `SchoolId` int(11) NOT NULL,
  `Title` longtext NOT NULL,
  `Content` longtext NOT NULL,
  `TargetCampus` longtext NOT NULL,
  `CreatedAt` datetime(6) NOT NULL,
  `IsActive` tinyint(1) NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `announcements`
--

LOCK TABLES `announcements` WRITE;
/*!40000 ALTER TABLE `announcements` DISABLE KEYS */;
INSERT INTO `announcements` VALUES (1,1,'Exams','starting soon','All','2026-06-16 12:15:25.768003',1);
/*!40000 ALTER TABLE `announcements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `emergencycontacts`
--

DROP TABLE IF EXISTS `emergencycontacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `emergencycontacts` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `StudentId` int(11) NOT NULL,
  `Name` longtext NOT NULL,
  `HomeTelephone` longtext NOT NULL,
  `BusinessTelephone` longtext NOT NULL,
  `Cell` longtext NOT NULL,
  `Relationship` longtext NOT NULL,
  `ContactOrder` int(11) NOT NULL,
  `CreatedAt` datetime(6) NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_EmergencyContacts_StudentId` (`StudentId`),
  CONSTRAINT `FK_EmergencyContacts_Students_StudentId` FOREIGN KEY (`StudentId`) REFERENCES `students` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `emergencycontacts`
--

LOCK TABLES `emergencycontacts` WRITE;
/*!40000 ALTER TABLE `emergencycontacts` DISABLE KEYS */;
INSERT INTO `emergencycontacts` VALUES (3,41,'Augustine','0789097890','0789097890','0789097899','Father',1,'2026-06-01 10:26:02.136004'),(4,41,'Father','Home telephone','0789096778','Cell Number','Mother',2,'2026-06-01 10:26:02.201706'),(5,42,'MARGIEO','082927293','0772395324','0780808246','UNCLE',1,'2026-06-03 13:24:51.783487'),(6,42,'LEONA','0783369837','07899286633','07802757527','AUNT',2,'2026-06-03 13:24:51.857621'),(7,43,'Emma Nyikayaramba','0764352342','0724567822','0772278145','Mother',1,'2026-06-04 12:09:00.838929'),(8,43,'Leon Chirodza','0772435678','0712345678','0784031310','father',2,'2026-06-04 12:09:00.873301'),(9,44,'Leone','0789095364','0789095364','0789095364','father',1,'2026-06-10 17:32:09.842316'),(10,44,'mother','0789095364','0789095364','0789095364','mother',2,'2026-06-10 17:32:09.865134');
/*!40000 ALTER TABLE `emergencycontacts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `families`
--

DROP TABLE IF EXISTS `families`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `families` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `StudentId` int(11) NOT NULL,
  `MaritalStatus` longtext NOT NULL,
  `HomeLanguage` longtext NOT NULL,
  `Religion` longtext NOT NULL,
  `HomeAddress` longtext NOT NULL,
  `HomeTelephone` longtext NOT NULL,
  `Cell` longtext NOT NULL,
  `Email` longtext NOT NULL,
  `CreatedAt` datetime(6) NOT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `IX_Families_StudentId` (`StudentId`),
  CONSTRAINT `FK_Families_Students_StudentId` FOREIGN KEY (`StudentId`) REFERENCES `students` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `families`
--

LOCK TABLES `families` WRITE;
/*!40000 ALTER TABLE `families` DISABLE KEYS */;
INSERT INTO `families` VALUES (5,41,'Single','home Language','Religion','Norton Harare','0784031310','0784031310','leonechirodza@gmail.com','2026-06-01 10:26:01.841820'),(6,42,'Single','english','christianiity','54 letwom road','024576','0780824626','margaretmilimo28@gmail.com','2026-06-03 13:24:51.538567'),(7,43,'Single','Shona','Christianity','54 Glenlorne drive','0766167856','0782017869','leonechirodza@gmail.com','2026-06-04 12:09:00.737949'),(8,44,'Divorced','english','sda','Bugema University, P.O. Box 6529 Kampala, Uganda','0766167856','0784049078','leonechirodza@gmail.com','2026-06-10 17:32:09.508964');
/*!40000 ALTER TABLE `families` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feecategories`
--

DROP TABLE IF EXISTS `feecategories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `feecategories` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `SchoolId` int(11) NOT NULL,
  `Name` longtext NOT NULL,
  `Description` longtext DEFAULT NULL,
  `IsActive` tinyint(1) NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_FeeCategories_SchoolId` (`SchoolId`),
  CONSTRAINT `FK_FeeCategories_Schools_SchoolId` FOREIGN KEY (`SchoolId`) REFERENCES `schools` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feecategories`
--

LOCK TABLES `feecategories` WRITE;
/*!40000 ALTER TABLE `feecategories` DISABLE KEYS */;
INSERT INTO `feecategories` VALUES (1,1,'Tuition Fee','Main tuition fee for all students',1),(2,1,'Administration Fee','School administration fee',1),(3,1,'School Development Fee','School development and infrastructure fee',1),(4,1,'Accommodation Fee','Boarding accommodation fee',1),(5,1,'Examination Fee','Examination and assessment fee',1),(7,1,'Lab Fee','Laboratory and science fee',1),(8,1,'Tuition & Boarding','Combined tuition and boarding fee',1),(9,1,'trip','Core Fees',1),(10,1,'winter camp','Core Fees',1);
/*!40000 ALTER TABLE `feecategories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feepackageitems`
--

DROP TABLE IF EXISTS `feepackageitems`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `feepackageitems` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `FeePackageId` int(11) NOT NULL,
  `FeeCategoryId` int(11) NOT NULL,
  `Amount` decimal(18,2) NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_FeePackageItems_FeeCategoryId` (`FeeCategoryId`),
  KEY `IX_FeePackageItems_FeePackageId` (`FeePackageId`),
  CONSTRAINT `FK_FeePackageItems_FeeCategories_FeeCategoryId` FOREIGN KEY (`FeeCategoryId`) REFERENCES `feecategories` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `FK_FeePackageItems_FeePackages_FeePackageId` FOREIGN KEY (`FeePackageId`) REFERENCES `feepackages` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=67 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feepackageitems`
--

LOCK TABLES `feepackageitems` WRITE;
/*!40000 ALTER TABLE `feepackageitems` DISABLE KEYS */;
INSERT INTO `feepackageitems` VALUES (1,1,1,450.00),(2,1,2,100.00),(3,1,3,150.00),(5,2,1,450.00),(6,2,2,100.00),(7,2,3,150.00),(9,3,1,450.00),(10,3,2,100.00),(11,3,3,150.00),(12,3,4,800.00),(54,4,1,400.00),(55,4,2,50.00),(56,4,3,50.00),(57,4,8,500.00),(58,5,1,450.00),(59,5,2,50.00),(60,5,7,30.00),(61,5,3,50.00),(62,5,1,300.00),(63,7,1,500.00),(64,7,2,50.00),(65,7,7,50.00),(66,7,3,50.00);
/*!40000 ALTER TABLE `feepackageitems` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feepackages`
--

DROP TABLE IF EXISTS `feepackages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `feepackages` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `SchoolId` int(11) NOT NULL,
  `TermId` int(11) NOT NULL,
  `Name` longtext NOT NULL,
  `StudentType` longtext NOT NULL,
  `IsActive` tinyint(1) NOT NULL,
  `LockedAt` datetime(6) DEFAULT NULL,
  `LockedBy` longtext DEFAULT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_FeePackages_SchoolId` (`SchoolId`),
  KEY `IX_FeePackages_TermId` (`TermId`),
  CONSTRAINT `FK_FeePackages_Schools_SchoolId` FOREIGN KEY (`SchoolId`) REFERENCES `schools` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `FK_FeePackages_Terms_TermId` FOREIGN KEY (`TermId`) REFERENCES `terms` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feepackages`
--

LOCK TABLES `feepackages` WRITE;
/*!40000 ALTER TABLE `feepackages` DISABLE KEYS */;
INSERT INTO `feepackages` VALUES (1,1,1,'Day Scholar Term 1 2026','Day',1,NULL,NULL),(2,1,1,'Day Scholar Term 1 2026','Day',1,NULL,NULL),(3,1,1,'Boarding Term 1 2026','Boarding',1,NULL,NULL),(4,1,1,'AHJ Day Package','Day',1,'2026-06-03 14:44:46.006406','admin@leetec.com'),(5,1,1,'AHA Day Package','Day',1,'2026-06-03 14:45:29.455747','admin@leetec.com'),(6,1,1,'AHJ Day Package','Day',1,NULL,NULL),(7,1,1,'AHS Day Package','Day',1,'2026-06-03 14:47:01.583473','admin@leetec.com'),(8,1,1,'AHS Day Package','Day',1,NULL,NULL),(9,1,1,'AHS Day Package','Day',1,NULL,NULL);
/*!40000 ALTER TABLE `feepackages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `guardians`
--

DROP TABLE IF EXISTS `guardians`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `guardians` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `StudentId` int(11) NOT NULL,
  `GuardianType` longtext NOT NULL,
  `Surname` longtext NOT NULL,
  `Forenames` longtext NOT NULL,
  `Title` longtext NOT NULL,
  `Nationality` longtext NOT NULL,
  `Occupation` longtext NOT NULL,
  `CompanyName` longtext NOT NULL,
  `BusinessAddress` longtext NOT NULL,
  `BusinessTelephone` longtext NOT NULL,
  `Cell` longtext NOT NULL,
  `Email` longtext NOT NULL,
  `CreatedAt` datetime(6) NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_Guardians_StudentId` (`StudentId`),
  CONSTRAINT `FK_Guardians_Students_StudentId` FOREIGN KEY (`StudentId`) REFERENCES `students` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `guardians`
--

LOCK TABLES `guardians` WRITE;
/*!40000 ALTER TABLE `guardians` DISABLE KEYS */;
INSERT INTO `guardians` VALUES (7,41,'Father','Chirodza','Leone','Mr','Zimbabwean','Job','Waterfalls Adventist','Bugema University, P.O. Box 6529 Kampala, Uganda','0766167856','0789097890','leonechirodza@gmail.com','2026-06-01 10:26:01.975190'),(8,41,'Mother','Chirodza','Leone','Mrs','Zimbabwe','Job','Waterfalls Adventist','Bugema University, P.O. Box 6529 Kampala, Uganda','0766167856','0766167856','leonechirodza@gmail.com','2026-06-01 10:26:02.047197'),(9,42,'Father','MILIMO','Margaret','Dr','zIMBABWEAN','DOCTOR','WAAHS HOSPITAL','Bugema University, P.O. Box 6529 Kampala, Uganda','0766167856','078956746','leonechirodza@gmail.com','2026-06-03 13:24:51.664991'),(10,43,'Father','Chirodza','Leone','Mr','Zimbabwean','Pastor','Waterfalls Adventist','Bugema University, P.O. Box 6529 Kampala, Uganda','0766167856','0784356783','leonechirodza@gmail.com','2026-06-04 12:09:00.785676'),(11,44,'Father','Chirodza','Leone','Mr','Nationality','occupasion','company','Bugema University, P.O. Box 6529 Kampala, Uganda','c','0786986574','leonechirodza@gmail.com','2026-06-10 17:32:09.626992'),(12,44,'Mother','Chirodza','Leone','Mrs','chirodza','occupation ','Waterfalls Adventist','Bugema University, P.O. Box 6529 Kampala, Uganda','0766167856','0784041234','leonechirodza@gmail.com','2026-06-10 17:32:09.718010');
/*!40000 ALTER TABLE `guardians` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoiceitems`
--

DROP TABLE IF EXISTS `invoiceitems`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `invoiceitems` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `InvoiceId` int(11) NOT NULL,
  `FeeCategoryId` int(11) NOT NULL,
  `Description` longtext NOT NULL,
  `Amount` decimal(18,2) NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_InvoiceItems_FeeCategoryId` (`FeeCategoryId`),
  KEY `IX_InvoiceItems_InvoiceId` (`InvoiceId`),
  CONSTRAINT `FK_InvoiceItems_FeeCategories_FeeCategoryId` FOREIGN KEY (`FeeCategoryId`) REFERENCES `feecategories` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `FK_InvoiceItems_Invoices_InvoiceId` FOREIGN KEY (`InvoiceId`) REFERENCES `invoices` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoiceitems`
--

LOCK TABLES `invoiceitems` WRITE;
/*!40000 ALTER TABLE `invoiceitems` DISABLE KEYS */;
INSERT INTO `invoiceitems` VALUES (11,12,1,'Tuition Fee',450.00),(12,12,1,'Tuition Fee',1500.00),(13,12,2,'Administration Fee',90.00),(14,13,2,'Administration Fee',90.00),(15,14,1,'Tuition Fee',1500.00),(16,15,1,'Tuition Fee',1500.00),(17,12,7,'Lab Fee',15.00),(18,13,7,'Lab Fee',15.00),(19,12,5,'Examination Fee',20.00),(20,13,5,'Examination Fee',20.00),(22,14,10,'winter camp',50.00),(23,12,10,'winter camp',50.00),(24,13,10,'winter camp',50.00),(25,15,10,'winter camp',50.00),(26,16,10,'winter camp',50.00),(27,16,1,'Tuition Fee',1500.00);
/*!40000 ALTER TABLE `invoiceitems` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoices`
--

DROP TABLE IF EXISTS `invoices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `invoices` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `SchoolId` int(11) NOT NULL,
  `StudentId` int(11) NOT NULL,
  `TermId` int(11) NOT NULL,
  `FeePackageId` int(11) DEFAULT NULL,
  `InvoiceNumber` longtext NOT NULL,
  `TotalAmount` decimal(18,2) NOT NULL,
  `AmountPaid` decimal(18,2) NOT NULL,
  `Balance` decimal(18,2) NOT NULL,
  `Status` longtext NOT NULL,
  `IssuedDate` datetime(6) NOT NULL,
  `DueDate` datetime(6) NOT NULL,
  `CreatedAt` datetime(6) NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_Invoices_FeePackageId` (`FeePackageId`),
  KEY `IX_Invoices_SchoolId` (`SchoolId`),
  KEY `IX_Invoices_StudentId` (`StudentId`),
  KEY `IX_Invoices_TermId` (`TermId`),
  CONSTRAINT `FK_Invoices_FeePackages_FeePackageId` FOREIGN KEY (`FeePackageId`) REFERENCES `feepackages` (`Id`) ON DELETE SET NULL,
  CONSTRAINT `FK_Invoices_Schools_SchoolId` FOREIGN KEY (`SchoolId`) REFERENCES `schools` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `FK_Invoices_Students_StudentId` FOREIGN KEY (`StudentId`) REFERENCES `students` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `FK_Invoices_Terms_TermId` FOREIGN KEY (`TermId`) REFERENCES `terms` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoices`
--

LOCK TABLES `invoices` WRITE;
/*!40000 ALTER TABLE `invoices` DISABLE KEYS */;
INSERT INTO `invoices` VALUES (12,1,41,1,NULL,'INV/AHS/1/0001',2125.00,2075.00,50.00,'PartiallyPaid','2026-06-04 09:47:47.511355','2026-04-04 00:00:00.000000','2026-06-04 09:47:47.511430'),(13,1,42,1,NULL,'INV/AHA/1/0002',175.00,125.00,50.00,'PartiallyPaid','2026-06-04 10:41:00.484247','2026-04-04 00:00:00.000000','2026-06-04 10:41:00.484544'),(14,1,43,1,NULL,'INV/AHA/1/0003',1550.00,600.00,950.00,'PartiallyPaid','2026-06-04 14:45:12.862331','2026-04-04 00:00:00.000000','2026-06-04 14:45:12.862378'),(15,1,44,1,NULL,'INV/AHA/1/0004',1550.00,300.00,1250.00,'PartiallyPaid','2026-06-10 17:34:15.915691','2026-04-04 00:00:00.000000','2026-06-10 17:34:15.915747'),(16,1,45,1,NULL,'INV/AHJ/1/0005',1550.00,0.00,1550.00,'Unpaid','2026-06-16 12:35:38.658142','2026-04-04 00:00:00.000000','2026-06-16 12:35:38.658300');
/*!40000 ALTER TABLE `invoices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `invoicingdetails`
--

DROP TABLE IF EXISTS `invoicingdetails`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `invoicingdetails` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `StudentId` int(11) NOT NULL,
  `Surname` longtext NOT NULL,
  `Initials` longtext NOT NULL,
  `Title` longtext NOT NULL,
  `PostalAddress` longtext NOT NULL,
  `PersonalEmail` longtext NOT NULL,
  `CreatedAt` datetime(6) NOT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `IX_InvoicingDetails_StudentId` (`StudentId`),
  CONSTRAINT `FK_InvoicingDetails_Students_StudentId` FOREIGN KEY (`StudentId`) REFERENCES `students` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `invoicingdetails`
--

LOCK TABLES `invoicingdetails` WRITE;
/*!40000 ALTER TABLE `invoicingdetails` DISABLE KEYS */;
/*!40000 ALTER TABLE `invoicingdetails` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `marks`
--

DROP TABLE IF EXISTS `marks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `marks` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `SchoolId` int(11) NOT NULL,
  `StudentId` int(11) NOT NULL,
  `SubjectId` int(11) NOT NULL,
  `TermId` int(11) NOT NULL,
  `AssessmentType` longtext NOT NULL,
  `Paper1Score` decimal(5,2) DEFAULT NULL,
  `Paper2Score` decimal(5,2) DEFAULT NULL,
  `Score` decimal(5,2) DEFAULT NULL,
  `Comments` longtext DEFAULT NULL,
  `CreatedAt` datetime(6) NOT NULL,
  `UpdatedAt` datetime(6) NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_Marks_StudentId` (`StudentId`),
  KEY `IX_Marks_SubjectId` (`SubjectId`),
  KEY `IX_Marks_TermId` (`TermId`),
  CONSTRAINT `FK_Marks_Students_StudentId` FOREIGN KEY (`StudentId`) REFERENCES `students` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `FK_Marks_Subjects_SubjectId` FOREIGN KEY (`SubjectId`) REFERENCES `subjects` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `FK_Marks_Terms_TermId` FOREIGN KEY (`TermId`) REFERENCES `terms` (`Id`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `marks`
--

LOCK TABLES `marks` WRITE;
/*!40000 ALTER TABLE `marks` DISABLE KEYS */;
INSERT INTO `marks` VALUES (1,1,42,1,1,'Mid-term Test',NULL,NULL,78.00,'Good effort','2026-06-14 16:29:54.508498','2026-06-14 16:29:54.525610'),(2,1,45,17,1,'Mid-term Test',43.00,20.00,NULL,'Good progress in mid-term','2026-06-14 17:22:50.853008','2026-06-16 18:23:49.643613'),(3,1,45,17,1,'End of Term Exam',25.00,23.00,NULL,'Excellent improvement','2026-06-14 17:22:50.948108','2026-06-14 17:22:50.948206'),(4,1,45,16,1,'Mid-term Test',50.00,19.00,NULL,'Needs more practice','2026-06-14 17:22:51.000576','2026-06-16 02:56:50.042093'),(5,1,45,16,1,'End of Term Exam',20.00,21.00,NULL,'Steady improvement','2026-06-14 17:22:51.055269','2026-06-14 17:22:51.055365'),(6,1,45,18,1,'Mid-term Test',44.00,22.00,NULL,'Very good','2026-06-14 17:22:51.108272','2026-06-16 02:57:09.182594'),(7,1,45,18,1,'End of Term Exam',23.00,24.00,NULL,'Outstanding effort','2026-06-14 17:22:51.162357','2026-06-14 17:22:51.162466'),(8,1,45,22,1,'Mid-term Test',15.00,14.00,NULL,'Enjoys music class','2026-06-14 17:22:51.217397','2026-06-16 18:23:53.083357'),(9,1,45,23,1,'Mid-term Test',50.00,16.00,NULL,'Creative problem-solving','2026-06-14 17:22:51.282374','2026-06-16 02:57:00.810089'),(10,1,42,34,1,'Mid-term Test',NULL,NULL,24.00,'very good','2026-06-15 09:43:43.916308','2026-06-15 09:43:44.116617'),(11,1,42,32,1,'Mid-term Test',NULL,NULL,NULL,'gooof','2026-06-15 09:43:58.958135','2026-06-15 09:43:58.963754'),(12,1,42,34,1,'End of Term Exam',NULL,NULL,70.00,'hello','2026-06-15 09:54:45.018283','2026-06-15 09:54:45.110502'),(13,1,44,34,1,'Mid-term Test',NULL,NULL,34.00,'verry good','2026-06-16 12:39:50.347117','2026-06-16 12:39:50.443393'),(14,1,44,14,1,'Mid-term Test',NULL,NULL,76.00,'very good','2026-06-16 17:57:29.849818','2026-06-16 17:57:29.917696'),(15,1,45,39,1,'Mid-term Test',50.00,45.00,NULL,'VGOOD','2026-06-16 18:23:43.297143','2026-06-16 18:23:56.270476'),(16,1,45,39,1,'End of Term Exam',18.00,50.00,NULL,NULL,'2026-06-16 18:24:07.395759','2026-06-16 18:24:07.396033'),(17,1,45,22,1,'End of Term Exam',50.00,45.00,NULL,NULL,'2026-06-16 18:24:13.272650','2026-06-16 18:24:22.229063');
/*!40000 ALTER TABLE `marks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `payments` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `SchoolId` int(11) NOT NULL,
  `InvoiceId` int(11) NOT NULL,
  `StudentId` int(11) NOT NULL,
  `PostedByUserId` int(11) NOT NULL,
  `Amount` decimal(18,2) NOT NULL,
  `PaymentMethod` longtext NOT NULL,
  `ReceiptNumber` longtext NOT NULL,
  `Notes` longtext DEFAULT NULL,
  `PaymentDate` datetime(6) NOT NULL,
  `PostedAt` datetime(6) NOT NULL,
  `ReceiptReference` longtext NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_Payments_InvoiceId` (`InvoiceId`),
  KEY `IX_Payments_SchoolId` (`SchoolId`),
  KEY `IX_Payments_StudentId` (`StudentId`),
  CONSTRAINT `FK_Payments_Invoices_InvoiceId` FOREIGN KEY (`InvoiceId`) REFERENCES `invoices` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `FK_Payments_Schools_SchoolId` FOREIGN KEY (`SchoolId`) REFERENCES `schools` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `FK_Payments_Students_StudentId` FOREIGN KEY (`StudentId`) REFERENCES `students` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
INSERT INTO `payments` VALUES (7,1,12,41,5,100.00,'Cash','',NULL,'2026-06-04 00:00:00.000000','2026-06-04 10:05:24.382817','REC/WAH/2026/0001'),(8,1,14,43,5,600.00,'Cash','',NULL,'2026-06-10 00:00:00.000000','2026-06-10 18:08:13.695690','REC/WAH/2026/0002'),(9,1,13,42,5,125.00,'Bank Deposit','wsw22222222222222','2322222','2026-06-15 00:00:00.000000','2026-06-15 09:46:45.280055','REC/WAH/2026/0003'),(10,1,15,44,5,300.00,'Bank Deposit','345678897654321','fees','2026-06-16 00:00:00.000000','2026-06-16 07:14:04.661851','REC/WAH/2026/0004'),(11,1,12,41,5,1975.00,'Bank Deposit','34324656434','dfgh','2026-06-16 00:00:00.000000','2026-06-16 12:34:43.458032','REC/WAH/2026/0005');
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `permissions` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `Name` longtext NOT NULL,
  `Description` longtext NOT NULL,
  `Category` longtext NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reportcardrecords`
--

DROP TABLE IF EXISTS `reportcardrecords`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `reportcardrecords` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `SchoolId` int(11) NOT NULL,
  `StudentId` int(11) NOT NULL,
  `TermId` int(11) NOT NULL,
  `GeneratedAt` datetime(6) NOT NULL,
  `Status` longtext NOT NULL,
  `ReportData` longtext NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reportcardrecords`
--

LOCK TABLES `reportcardrecords` WRITE;
/*!40000 ALTER TABLE `reportcardrecords` DISABLE KEYS */;
INSERT INTO `reportcardrecords` VALUES (1,1,45,1,'2026-06-16 18:26:20.007796','Published','{\"student\":{\"firstName\":\"Test\",\"surname\":\"Learner\",\"studentNumber\":\"AHJ/2026/0005\",\"form\":\"Grade 4\",\"campus\":\"AHJ\",\"curriculum\":\"Cambridge\"},\"term\":{\"name\":\"Term 1 2026\",\"year\":2026,\"nextTermStartDate\":null},\"usesPapers\":true,\"gradingCurriculum\":\"Cambridge Checkpoint\",\"subjects\":[{\"subjectId\":20,\"name\":\"Agriculture\",\"noTerminalExam\":false,\"midterm\":{\"paper1\":null,\"paper2\":null,\"total\":null,\"comments\":\"\"},\"endTerm\":{\"paper1\":null,\"paper2\":null,\"total\":null,\"comments\":\"\"},\"cm\":null,\"grade\":\"\"},{\"subjectId\":39,\"name\":\"Christian Theology\",\"noTerminalExam\":false,\"midterm\":{\"paper1\":50.00,\"paper2\":45.00,\"total\":50,\"comments\":\"VGOOD\"},\"endTerm\":{\"paper1\":18.00,\"paper2\":50.00,\"total\":50,\"comments\":\"\"},\"cm\":50,\"grade\":\"Outstanding\"},{\"subjectId\":17,\"name\":\"English\",\"noTerminalExam\":false,\"midterm\":{\"paper1\":43.00,\"paper2\":20.00,\"total\":50,\"comments\":\"Good progress in mid-term\"},\"endTerm\":{\"paper1\":25.00,\"paper2\":23.00,\"total\":48.00,\"comments\":\"Excellent improvement\"},\"cm\":49,\"grade\":\"Outstanding\"},{\"subjectId\":21,\"name\":\"ICT\",\"noTerminalExam\":false,\"midterm\":{\"paper1\":null,\"paper2\":null,\"total\":null,\"comments\":\"\"},\"endTerm\":{\"paper1\":null,\"paper2\":null,\"total\":null,\"comments\":\"\"},\"cm\":null,\"grade\":\"\"},{\"subjectId\":16,\"name\":\"Mathematics\",\"noTerminalExam\":false,\"midterm\":{\"paper1\":50.00,\"paper2\":19.00,\"total\":50,\"comments\":\"Needs more practice\"},\"endTerm\":{\"paper1\":20.00,\"paper2\":21.00,\"total\":41.00,\"comments\":\"Steady improvement\"},\"cm\":46,\"grade\":\"Outstanding\"},{\"subjectId\":22,\"name\":\"Music\",\"noTerminalExam\":true,\"midterm\":{\"paper1\":15.00,\"paper2\":14.00,\"total\":29.00,\"comments\":\"Enjoys music class\"},\"endTerm\":null,\"cm\":29,\"grade\":\"Good\"},{\"subjectId\":23,\"name\":\"Robotics\",\"noTerminalExam\":true,\"midterm\":{\"paper1\":50.00,\"paper2\":16.00,\"total\":50,\"comments\":\"Creative problem-solving\"},\"endTerm\":null,\"cm\":50,\"grade\":\"Outstanding\"},{\"subjectId\":18,\"name\":\"Science\",\"noTerminalExam\":false,\"midterm\":{\"paper1\":44.00,\"paper2\":22.00,\"total\":50,\"comments\":\"Very good\"},\"endTerm\":{\"paper1\":23.00,\"paper2\":24.00,\"total\":47.00,\"comments\":\"Outstanding effort\"},\"cm\":49,\"grade\":\"Outstanding\"},{\"subjectId\":19,\"name\":\"Shona\",\"noTerminalExam\":false,\"midterm\":{\"paper1\":null,\"paper2\":null,\"total\":null,\"comments\":\"\"},\"endTerm\":{\"paper1\":null,\"paper2\":null,\"total\":null,\"comments\":\"\"},\"cm\":null,\"grade\":\"\"}],\"attendance\":null}');
/*!40000 ALTER TABLE `reportcardrecords` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rolepermissions`
--

DROP TABLE IF EXISTS `rolepermissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rolepermissions` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `RoleId` int(11) NOT NULL,
  `PermissionId` int(11) NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_RolePermissions_PermissionId` (`PermissionId`),
  KEY `IX_RolePermissions_RoleId` (`RoleId`),
  CONSTRAINT `FK_RolePermissions_Permissions_PermissionId` FOREIGN KEY (`PermissionId`) REFERENCES `permissions` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `FK_RolePermissions_Roles_RoleId` FOREIGN KEY (`RoleId`) REFERENCES `roles` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rolepermissions`
--

LOCK TABLES `rolepermissions` WRITE;
/*!40000 ALTER TABLE `rolepermissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `rolepermissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `roles` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `SchoolId` int(11) DEFAULT NULL,
  `Name` longtext NOT NULL,
  `Description` longtext NOT NULL,
  `IsSystemRole` tinyint(1) NOT NULL,
  `CreatedAt` datetime(6) NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_Roles_SchoolId` (`SchoolId`),
  CONSTRAINT `FK_Roles_Schools_SchoolId` FOREIGN KEY (`SchoolId`) REFERENCES `schools` (`Id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,NULL,'SuperAdmin','LeeTec IT - Full platform access',1,'2026-04-29 17:02:50.093636'),(2,NULL,'Headmaster','School head - Full school access',1,'2026-04-29 17:02:50.093748'),(3,NULL,'DeputyPrincipal','Discipline and pastoral care',1,'2026-04-29 17:02:50.093748'),(4,NULL,'BusinessManager','Finance and assets',1,'2026-04-29 17:02:50.093748'),(5,NULL,'Chaplain','Spiritual and pastoral care',1,'2026-04-29 17:02:50.093748'),(6,NULL,'SeniorMaster','Oversees male students and teachers',1,'2026-04-29 17:02:50.093749'),(7,NULL,'SeniorMistress','Oversees female students and teachers',1,'2026-04-29 17:02:50.093749'),(8,NULL,'HOD','Head of Department',1,'2026-04-29 17:02:50.093749'),(9,NULL,'AdminSecretary','Admissions and ID cards',1,'2026-04-29 17:02:50.093749'),(10,NULL,'AccountsSecretary','Fees and payments',1,'2026-04-29 17:02:50.093749'),(11,NULL,'ClassTeacher','Form teacher for one class',1,'2026-04-29 17:02:50.093749'),(12,NULL,'SubjectTeacher','Marks entry and timetable',1,'2026-04-29 17:02:50.093749'),(13,NULL,'Student','Student self-service',1,'2026-04-29 17:02:50.093749'),(14,1,'Teacher','Teaching staff with marks entry access',0,'2026-06-16 13:55:07.000000');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `schools`
--

DROP TABLE IF EXISTS `schools`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `schools` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `Name` longtext NOT NULL,
  `Address` longtext NOT NULL,
  `Phone` longtext NOT NULL,
  `Email` longtext NOT NULL,
  `LogoUrl` longtext NOT NULL,
  `IsActive` tinyint(1) NOT NULL,
  `CreatedAt` datetime(6) NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `schools`
--

LOCK TABLES `schools` WRITE;
/*!40000 ALTER TABLE `schools` DISABLE KEYS */;
INSERT INTO `schools` VALUES (1,'Waterfalls Adventist High School','Waterfalls, Harare','+263 77 000 0000','info@waterfallsadventist.ac.zw','',1,'2026-04-30 02:46:19.168784');
/*!40000 ALTER TABLE `schools` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `studentportalaccounts`
--

DROP TABLE IF EXISTS `studentportalaccounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `studentportalaccounts` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `StudentId` int(11) NOT NULL,
  `Email` longtext NOT NULL,
  `PasswordHash` longtext NOT NULL,
  `Status` longtext NOT NULL,
  `EmailVerified` tinyint(1) NOT NULL,
  `EmailVerificationToken` longtext DEFAULT NULL,
  `EmailVerificationExpiry` datetime(6) DEFAULT NULL,
  `PasswordResetToken` longtext DEFAULT NULL,
  `PasswordResetExpiry` datetime(6) DEFAULT NULL,
  `LastLoginAt` datetime(6) DEFAULT NULL,
  `CreatedAt` datetime(6) NOT NULL,
  `ApprovedAt` datetime(6) DEFAULT NULL,
  `ApprovedByUserId` int(11) DEFAULT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_StudentPortalAccounts_StudentId` (`StudentId`),
  CONSTRAINT `FK_StudentPortalAccounts_Students_StudentId` FOREIGN KEY (`StudentId`) REFERENCES `students` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `studentportalaccounts`
--

LOCK TABLES `studentportalaccounts` WRITE;
/*!40000 ALTER TABLE `studentportalaccounts` DISABLE KEYS */;
INSERT INTO `studentportalaccounts` VALUES (4,43,'bugemastudent@gmail.com','$2a$11$zDEQj9mmoFgCgl9qEXyfb.1QxDsWwIq.DBf/l81SgfG2tZ3u1B1AG','Pending',0,'dc1d742bdded427cb68cffc3f5fcbba8','2026-06-11 18:31:12.676075',NULL,NULL,NULL,'2026-06-10 18:31:12.676161',NULL,NULL),(5,44,'leonechirodza@gmail.com','$2a$11$bL/pXvT5fOQxT8TNLg4RCeHFZMWWaKgFRZXAzAdNIJ11fWCXZRLhC','Pending',0,'2034446c79e048c1aac786d68f2081bf','2026-06-17 18:14:36.360258',NULL,NULL,NULL,'2026-06-16 18:14:36.360340',NULL,NULL),(6,45,'leetec.sms@gmail.com','$2a$11$nSSxllAs5n23iM4IcEzamujk2yZBGeccK8ua1aU/TzScO3p/CKGF.','Active',1,NULL,NULL,NULL,NULL,'2026-06-16 18:24:48.588995','2026-06-16 18:21:11.559011','2026-06-16 18:22:37.063496',1);
/*!40000 ALTER TABLE `studentportalaccounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `students`
--

DROP TABLE IF EXISTS `students`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `students` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `SchoolId` int(11) NOT NULL,
  `UserId` int(11) DEFAULT NULL,
  `StudentNumber` longtext NOT NULL,
  `Surname` longtext NOT NULL,
  `FirstName` longtext NOT NULL,
  `DateOfBirth` longtext NOT NULL,
  `BirthCertificateNo` longtext NOT NULL,
  `Gender` longtext NOT NULL,
  `Form` longtext NOT NULL,
  `DateOfEntry` longtext NOT NULL,
  `Race` longtext NOT NULL,
  `PreviousSchool` longtext NOT NULL,
  `OtherInformation` longtext NOT NULL,
  `FamilyDoctorName` longtext NOT NULL,
  `FamilyDoctorPhone` longtext NOT NULL,
  `MedicalAidSociety` longtext NOT NULL,
  `MedicalAidNo` longtext NOT NULL,
  `Allergies` longtext NOT NULL,
  `Denomination` longtext NOT NULL,
  `Status` longtext NOT NULL,
  `CreatedAt` datetime(6) NOT NULL,
  `Curriculum` longtext NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_Students_SchoolId` (`SchoolId`),
  KEY `IX_Students_UserId` (`UserId`),
  CONSTRAINT `FK_Students_Schools_SchoolId` FOREIGN KEY (`SchoolId`) REFERENCES `schools` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `FK_Students_Users_UserId` FOREIGN KEY (`UserId`) REFERENCES `users` (`Id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `students`
--

LOCK TABLES `students` WRITE;
/*!40000 ALTER TABLE `students` DISABLE KEYS */;
INSERT INTO `students` VALUES (41,1,NULL,'AHS/2026/0002','Chirodza','Leone','1999-08-09','6547829344','Male','Upper 6','2026-06-01','African','Wahs','any','Dr Chirodza','0786789900','Medical Aid','08393843','allergies','Religious','Active','2026-06-01 10:26:01.344235','ZIMSEC A-Level'),(42,1,NULL,'AHA/2026/0002','Milimo','Margaret','2023-08-28','63-2289385t63','Female','Form 4','2026-06-03','Africa','Waterfalls adventist high school','','Dr hetetcry','0780837027','psmas','12366','eye','christianity','Active','2026-06-03 13:24:51.345556','ZIMSEC O-Level'),(43,1,NULL,'AHA/2026/0003','Mvundura','Hadassah','2010-05-26','12345678910','Female','Form 4','2026-06-04','African','Waterfalls Adventist High School','','Dr Solank','0782012987','Quest','234568','Asthma , Fish','Christian','Active','2026-06-04 12:09:00.692570','ZIMSEC O-Level'),(44,1,NULL,'AHA/2026/0004','Sithole','Tanatsa','2004-08-09','098712345','Male','Form 1','2026-06-10','african','Primary','other','leone','26378909876','meidcal','098765342','peanuats','sda','Active','2026-06-10 17:32:08.907575','ZIMSEC O-Level'),(45,1,NULL,'AHJ/2026/0005','Learner','Test','2017-01-01','TEST123456','Male','Grade 4','2026-01-20','','','','','','','','','','Active','2026-06-14 17:14:54.860134','Cambridge');
/*!40000 ALTER TABLE `students` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subjects`
--

DROP TABLE IF EXISTS `subjects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `subjects` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `SchoolId` int(11) NOT NULL,
  `Name` longtext NOT NULL,
  `Code` longtext NOT NULL,
  `Campus` longtext NOT NULL,
  `Level` longtext NOT NULL,
  `CurriculumType` longtext NOT NULL,
  `IsActive` tinyint(1) NOT NULL,
  PRIMARY KEY (`Id`)
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subjects`
--

LOCK TABLES `subjects` WRITE;
/*!40000 ALTER TABLE `subjects` DISABLE KEYS */;
INSERT INTO `subjects` VALUES (1,1,'Computer Science','4021','AHA','O-Level','ZIMSEC',1),(2,1,'Chemistry','4024','AHA','O-Level','ZIMSEC',1),(3,1,'Physics','4023','AHA','O-Level','ZIMSEC',1),(4,1,'Biology','4025','AHA','O-Level','ZIMSEC',1),(5,1,'Mathematics','4004','AHA','O-Level','ZIMSEC',1),(6,1,'Combined Science','4003','AHA','O-Level','ZIMSEC',1),(7,1,'Heritage','4006','AHA','O-Level','ZIMSEC',1),(8,1,'Family & Religious Studies','4047','AHA','O-Level','ZIMSEC',1),(9,1,'Principles of Accounts','4051','AHA','O-Level','ZIMSEC',1),(10,1,'English Language','4005','AHA','O-Level','ZIMSEC',1),(11,1,'Shona Language','4007','AHA','O-Level','ZIMSEC',1),(12,1,'History','4044','AHA','O-Level','ZIMSEC',1),(13,1,'Commerce','4049','AHA','O-Level','ZIMSEC',1),(14,1,'Business Enterprise Skills','4048','AHA','O-Level','ZIMSEC',1),(15,1,'Geography','4022','AHA','O-Level','ZIMSEC',1),(16,1,'Mathematics','MAT','AHJ','Primary','Cambridge',1),(17,1,'English','ENG','AHJ','Primary','Cambridge',1),(18,1,'Science','SCI','AHJ','Primary','Cambridge',1),(19,1,'Shona','SHO','AHJ','Primary','Cambridge',1),(20,1,'Agriculture','AGR','AHJ','Primary','Cambridge',1),(21,1,'ICT','ICT','AHJ','Primary','Cambridge',1),(22,1,'Music','MUS','AHJ','Primary','Cambridge',1),(23,1,'Robotics','ROB','AHJ','Primary','Cambridge',1),(24,1,'English Language','1123','AHA','O-Level','Cambridge',1),(25,1,'Biblical Studies','2035','AHA','O-Level','Cambridge',1),(26,1,'History','2147','AHA','O-Level','Cambridge',1),(27,1,'Mathematics','4024','AHA','O-Level','Cambridge',1),(28,1,'Commerce','7100','AHA','O-Level','Cambridge',1),(29,1,'Computer Science','2210','AHA','O-Level','Cambridge',1),(30,1,'Combined Science','5129','AHA','O-Level','Cambridge',1),(31,1,'Accounting','7707','AHA','O-Level','Cambridge',1),(32,1,'Chemistry','5070','AHA','O-Level','Cambridge',1),(33,1,'Physics','5054','AHA','O-Level','Cambridge',1),(34,1,'Biology','5090','AHA','O-Level','Cambridge',1),(35,1,'Geography','2217','AHA','O-Level','Cambridge',1),(36,1,'Literature in English','2010','AHA','O-Level','Cambridge',1),(37,1,'Business Studies','7115','AHA','O-Level','Cambridge',1),(38,1,'Economics','2281','AHA','O-Level','Cambridge',1),(39,1,'Christian Theology','400l','AHJ','Primary','Cambridge',1);
/*!40000 ALTER TABLE `subjects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `teachersubjectassignments`
--

DROP TABLE IF EXISTS `teachersubjectassignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `teachersubjectassignments` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `SchoolId` int(11) NOT NULL,
  `TeacherId` int(11) NOT NULL,
  `SubjectId` int(11) NOT NULL,
  `Campus` longtext NOT NULL,
  `Form` longtext NOT NULL,
  `IsActive` tinyint(1) NOT NULL,
  `CreatedAt` datetime(6) NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_TeacherSubjectAssignments_SubjectId` (`SubjectId`),
  KEY `IX_TeacherSubjectAssignments_TeacherId` (`TeacherId`),
  CONSTRAINT `FK_TeacherSubjectAssignments_Subjects_SubjectId` FOREIGN KEY (`SubjectId`) REFERENCES `subjects` (`Id`),
  CONSTRAINT `FK_TeacherSubjectAssignments_Users_TeacherId` FOREIGN KEY (`TeacherId`) REFERENCES `users` (`Id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teachersubjectassignments`
--

LOCK TABLES `teachersubjectassignments` WRITE;
/*!40000 ALTER TABLE `teachersubjectassignments` DISABLE KEYS */;
INSERT INTO `teachersubjectassignments` VALUES (1,1,10,16,'AHJ','Grade 4',1,'2026-06-16 13:57:17.000000'),(2,1,10,17,'AHJ','Grade 4',1,'2026-06-16 13:57:17.000000'),(3,1,10,21,'AHJ','Grade 1',1,'2026-06-16 12:13:49.766090'),(4,1,11,39,'AHJ','Grade 2',1,'2026-06-16 17:52:59.036701'),(5,1,11,33,'AHA','Form 6',1,'2026-06-16 17:53:13.938498'),(6,1,11,14,'AHA','Form 1',1,'2026-06-16 17:53:46.283076');
/*!40000 ALTER TABLE `teachersubjectassignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `termregistrations`
--

DROP TABLE IF EXISTS `termregistrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `termregistrations` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `StudentId` int(11) NOT NULL,
  `TermId` int(11) NOT NULL,
  `SchoolId` int(11) NOT NULL,
  `Form` longtext NOT NULL,
  `ClassSection` longtext NOT NULL,
  `Campus` longtext NOT NULL,
  `FeePackageId` int(11) DEFAULT NULL,
  `HasPaidFees` tinyint(1) NOT NULL,
  `PaymentStatus` longtext NOT NULL,
  `PromotionStatus` longtext NOT NULL,
  `Status` longtext NOT NULL,
  `RegisteredAt` datetime(6) NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_TermRegistrations_FeePackageId` (`FeePackageId`),
  KEY `IX_TermRegistrations_SchoolId` (`SchoolId`),
  KEY `IX_TermRegistrations_StudentId` (`StudentId`),
  KEY `IX_TermRegistrations_TermId` (`TermId`),
  CONSTRAINT `FK_TermRegistrations_FeePackages_FeePackageId` FOREIGN KEY (`FeePackageId`) REFERENCES `feepackages` (`Id`) ON DELETE SET NULL,
  CONSTRAINT `FK_TermRegistrations_Schools_SchoolId` FOREIGN KEY (`SchoolId`) REFERENCES `schools` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `FK_TermRegistrations_Students_StudentId` FOREIGN KEY (`StudentId`) REFERENCES `students` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `FK_TermRegistrations_Terms_TermId` FOREIGN KEY (`TermId`) REFERENCES `terms` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `termregistrations`
--

LOCK TABLES `termregistrations` WRITE;
/*!40000 ALTER TABLE `termregistrations` DISABLE KEYS */;
INSERT INTO `termregistrations` VALUES (2,41,1,1,'Upper 6','Upper 6','AHS',NULL,1,'Paid','Pending','Active','2026-06-01 14:43:30.462280'),(3,42,1,1,'Form 4','Form 4','AHA',NULL,0,'Unpaid','Pending','Active','2026-06-03 13:26:48.596392'),(4,45,1,1,'Grade 4','Grade 4','AHJ',NULL,0,'Pending','Pending','Active','2026-06-14 17:21:01.114768'),(5,43,1,1,'Form 4','Form 4','AHA',NULL,0,'Pending','Pending','Active','2026-06-16 03:10:05.465656'),(6,44,1,1,'Form 1','Form 1','AHA',NULL,0,'Pending','Pending','Active','2026-06-16 03:10:05.491085');
/*!40000 ALTER TABLE `termregistrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `terms`
--

DROP TABLE IF EXISTS `terms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `terms` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `SchoolId` int(11) NOT NULL,
  `Name` longtext NOT NULL,
  `TermNumber` int(11) NOT NULL,
  `Year` int(11) NOT NULL,
  `StartDate` datetime(6) NOT NULL,
  `EndDate` datetime(6) NOT NULL,
  `IsActive` tinyint(1) NOT NULL,
  `CreatedAt` datetime(6) NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_Terms_SchoolId` (`SchoolId`),
  CONSTRAINT `FK_Terms_Schools_SchoolId` FOREIGN KEY (`SchoolId`) REFERENCES `schools` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `terms`
--

LOCK TABLES `terms` WRITE;
/*!40000 ALTER TABLE `terms` DISABLE KEYS */;
INSERT INTO `terms` VALUES (1,1,'Term 1 2026',1,2026,'2026-01-20 00:00:00.000000','2026-04-04 00:00:00.000000',1,'2026-05-03 07:32:56.589795');
/*!40000 ALTER TABLE `terms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `userroles`
--

DROP TABLE IF EXISTS `userroles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `userroles` (
  `Id` int(11) NOT NULL,
  `UserId` int(11) NOT NULL,
  `RoleId` int(11) NOT NULL,
  KEY `IX_UserRoles_RoleId` (`RoleId`),
  KEY `IX_UserRoles_UserId` (`UserId`),
  CONSTRAINT `FK_UserRoles_Roles_RoleId` FOREIGN KEY (`RoleId`) REFERENCES `roles` (`Id`) ON DELETE CASCADE,
  CONSTRAINT `FK_UserRoles_Users_UserId` FOREIGN KEY (`UserId`) REFERENCES `users` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `userroles`
--

LOCK TABLES `userroles` WRITE;
/*!40000 ALTER TABLE `userroles` DISABLE KEYS */;
INSERT INTO `userroles` VALUES (1,4,1),(0,10,14),(0,11,14);
/*!40000 ALTER TABLE `userroles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `Id` int(11) NOT NULL AUTO_INCREMENT,
  `SchoolId` int(11) NOT NULL,
  `FirstName` longtext NOT NULL,
  `LastName` longtext NOT NULL,
  `Email` longtext NOT NULL,
  `PasswordHash` longtext NOT NULL,
  `Status` longtext NOT NULL,
  `EmailVerified` tinyint(1) NOT NULL,
  `CreatedAt` datetime(6) NOT NULL,
  `PhoneNumber` longtext DEFAULT NULL,
  PRIMARY KEY (`Id`),
  KEY `IX_Users_SchoolId` (`SchoolId`),
  CONSTRAINT `FK_Users_Schools_SchoolId` FOREIGN KEY (`SchoolId`) REFERENCES `schools` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (4,1,'Leone','Chirodza','leone@leetec.com','$2a$11$ZxU2gypI9qntBEiSt9BAHegpgiGufJlj3f9zgC4/ov/YU4HhnmokO','Active',1,'2026-04-30 15:58:18.643636',NULL),(5,1,'Leone','Chirodza','admin@leetec.com','$2a$11$PUbhNAkvQFVuA/qCvzIxm.x3AGqR2SeruSFxbQeoJR4KaLIFqWOqK','Active',1,'2026-05-03 14:19:50.926419',NULL),(10,1,'John','Doe','teacher@adventhope.ac.zw','$2a$11$Wz8.VRX4cu1dRkCwyknev.apNvPGH0c2IaLkr2ejmXIkjgxvFNp4m','Active',1,'2026-06-16 13:57:17.000000',NULL),(11,1,'Leone','Chirodza','bugemastudent@gmail.com','$2a$11$rWki6cVcVsi3ic6pWkWsreeZTyJfArbDfX8gwVPokuCKoeTJFKYoi','Active',1,'2026-06-16 17:52:30.874449','+256766167856');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-19 16:19:34
