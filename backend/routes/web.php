<?php

use Illuminate\Support\Facades\Route;

// The backend serves only the API and the admin panel. Its root, reached on the
// admin host, goes to the panel instead of a framework page that names the version.
Route::redirect('/', '/admin');
