<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// Deliberately insecure, to prove that code scanning blocks the merge. Reverted in the next commit.
class InsecureDemoController
{
    public function __invoke(Request $request): string
    {
        $id = (string) $request->query('id', '');
        $rows = DB::select('SELECT * FROM users WHERE id = '.$id);
        $prefs = unserialize((string) $request->cookie('prefs'));

        return (string) json_encode([$rows, $prefs]);
    }
}
