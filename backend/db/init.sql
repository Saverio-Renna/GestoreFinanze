-- Creazione database (se non esiste già)
CREATE DATABASE IF NOT EXISTS finanze CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

USE finanze;

-- Tabella transazioni
CREATE TABLE IF NOT EXISTS transactions (
  id          INT(11)                       NOT NULL AUTO_INCREMENT,
  description VARCHAR(255)                  NOT NULL,
  amount      DECIMAL(10,2)                 NOT NULL,
  type        ENUM('entrata', 'uscita')     NOT NULL,
  created_at  TIMESTAMP                     NOT NULL DEFAULT current_timestamp(),
  category    VARCHAR(100)                  NOT NULL DEFAULT 'Altro',
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;