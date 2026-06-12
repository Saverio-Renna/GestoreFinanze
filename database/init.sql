-- 1. Crea il database se non esiste
CREATE DATABASE IF NOT EXISTS esame_db;
-- 2. Seleziona il database appena creato
USE esame_db;

-- 3. Crea la tabella per memorizzare i movimenti finanziari
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Inserisci i dati finti
INSERT INTO transactions (description, amount, category) VALUES
('Stipendio Mensile', 1500.00, 'Stipendio'),
('Spesa Esselunga', -65.40, 'Cibo'),
('Rifornimento Benzina', -40.00, 'Trasporti');