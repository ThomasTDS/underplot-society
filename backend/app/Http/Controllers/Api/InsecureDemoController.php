<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

// Deliberately insecure, to prove that code scanning blocks the merge. Reverted in the next commit.
class InsecureDemoController
{
    public function __invoke(Request $request): string
    {
        $id = $request->string('id')->toString();
        $rows = DB::select('SELECT * FROM users WHERE id = '.$id);
        $prefs = unserialize($_COOKIE['prefs'] ?? '');
        $hash = md5($request->string('password')->toString());
        $remote = file_get_contents($_POST['url'] ?? '');

        return (string) json_encode([$rows, $prefs, $hash, $remote]);
    }
}
