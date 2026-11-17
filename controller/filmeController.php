<?php

    require 'config.php';
    require 'model/filmeModel.php';

    importarFilmesAPI('05eb3512112d498d29a80ebf896bc3c9');

    $filmes = listarFilmes();

    require 'view/filmeView.php';