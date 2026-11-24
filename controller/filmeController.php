<?php

    if (realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) {
        header('Location: ../index.php', true, 302);
        exit;
    }

    require 'config.php';
    require 'model/filmeModel.php';

    $filmes = [];
    if ($pdo) {
        try {
            importarFilmesAPI('05eb3512112d498d29a80ebf896bc3c9');
            $filmes = listarFilmes();
        } catch (PDOException $e) {
            error_log("Catálogo de filmes indisponível.");
        }
    }

    require 'view/filmeView.php';
