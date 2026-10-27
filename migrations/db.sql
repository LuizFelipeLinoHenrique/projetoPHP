CREATE DATABASE tmdb_filmes;
USE tmdb_filmes;

CREATE TABLE filmes (
    id INT AUTO_INCREMENT,
    titulo VARCHAR(255) DEFAULT NULL,
    descricao TEXT,
    poster VARCHAR(255) DEFAULT NULL
);