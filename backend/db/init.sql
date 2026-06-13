-- Creazione database
CREATE DATABASE IF NOT EXISTS finance_db CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

USE finance_db;

-- Tabella utenti
CREATE TABLE IF NOT EXISTS users (
  id         INT(11)      NOT NULL AUTO_INCREMENT,
  username   VARCHAR(100) NOT NULL UNIQUE,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  created_at TIMESTAMP    NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Tabella transazioni (con chiave esterna verso users)
CREATE TABLE IF NOT EXISTS transactions (
  id          INT(11)                   NOT NULL AUTO_INCREMENT,
  description VARCHAR(255)              NOT NULL,
  amount      DECIMAL(10,2)             NOT NULL,
  type        ENUM('entrata', 'uscita') NOT NULL,
  created_at  TIMESTAMP                 NOT NULL DEFAULT current_timestamp(),
  category    VARCHAR(100)              NOT NULL DEFAULT 'Altro',
  user_id     INT(11)                   NOT NULL,
  PRIMARY KEY (id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;