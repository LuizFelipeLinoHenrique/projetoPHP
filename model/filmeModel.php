<?php

require_once 'config.php';

function importarFilmesAPI($api_key)
{
    $url = "http://api.themoviedb.org/3/movie/popular?api_key=$api_key&language=pt-BR";

    $resposta = file_get_contents($url);
    $dados = json_decode($resposta, true);

    global $pdo;

    foreach ($dados['results'] as $filme) {
        $titulo = $filme['title'];
        $descricao = $filme['overview'];
        $poster = "http://image.tmdb.org/t/p/w500" . $filme['poster_path'];

        salvarFilme($titulo, $descricao, $poster);
    };
};

function salvarFilme($titulo, $descricao, $poster)
{
    global $pdo;

    try {
        $titulo = $pdo->quote($titulo);
        $descricao = $pdo->quote($descricao);
        $poster = $pdo->quote($poster);

        $verificacao = "SELECT * FROM filmes WHERE titulo = $titulo";
        $resultado = $pdo->query($verificacao);

        if ($resultado->rowCount() > 0) {
            return;
        };

        $sql = "INSERT INTO filmes(titulo, descricao, poster) VALUES ($titulo, $descricao, $poster)";
        $pdo->query($sql);
    } catch (PDOException $e) {
        echo "Erro ao salvar '$titulo': " . $e->getMessage() . "<br>";
    };
};

function listarFilmes()
{
    global $pdo;

    $sql = "SELECT * FROM filmes";
    $resultado = $pdo->query($sql);
    return $resultado->fetchAll(PDO::FETCH_ASSOC);
};
