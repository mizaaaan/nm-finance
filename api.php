<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(array $body, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

function request_body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === '' || $raw === false) return [];
    $body = json_decode($raw, true);
    return is_array($body) ? $body : [];
}

function clean_text(mixed $value): string
{
    return is_string($value) ? trim($value) : '';
}

function optional_value(array $body, string $key): mixed
{
    if (!array_key_exists($key, $body) || $body[$key] === '') return null;
    return $body[$key];
}

function valid_date_value(mixed $value): bool
{
    if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) return false;
    $date = DateTime::createFromFormat('!Y-m-d', $value);
    return $date !== false && $date->format('Y-m-d') === $value;
}

function user_payload(array $user): array
{
    return [
        'id' => (int)$user['id'],
        'email' => $user['email'],
        'name' => $user['full_name'],
        'role' => $user['role'],
    ];
}

function current_user(PDO $db): ?array
{
    if (empty($_SESSION['user_id'])) return null;
    $stmt = $db->prepare('SELECT id, email, full_name, role FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([(int)$_SESSION['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$user) {
        $_SESSION = [];
        return null;
    }
    return $user;
}

function require_user(PDO $db): array
{
    $user = current_user($db);
    if (!$user) respond(['error' => 'Sign in required to access this API.'], 401);
    return $user;
}

function require_admin(PDO $db): array
{
    $user = require_user($db);
    if ($user['role'] !== 'admin') respond(['error' => 'Admin access required for this action.'], 403);
    return $user;
}

function db_connection(): PDO
{
    $secretsPath = __DIR__ . '/hostinger-secrets.php';
    if (!is_file($secretsPath)) throw new RuntimeException('Hostinger database configuration is missing.');
    $secrets = require $secretsPath;
    if (!is_array($secrets) || empty($secrets['db_name']) || empty($secrets['db_user'])) {
        throw new RuntimeException('Hostinger database configuration is incomplete.');
    }
    $dsn = 'mysql:host=' . ($secrets['db_host'] ?? '127.0.0.1') . ';dbname=' . $secrets['db_name'] . ';charset=utf8mb4';
    return new PDO($dsn, $secrets['db_user'], $secrets['db_password'] ?? '', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
}

try {
    $db = db_connection();
} catch (Throwable $error) {
    respond(['error' => 'Database is not ready. Contact the site administrator.'], 503);
}

if (session_status() !== PHP_SESSION_ACTIVE) {
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$segments = array_values(array_filter(explode('/', trim($path, '/')), 'strlen'));
$resource = $segments[1] ?? '';
$id = isset($segments[2]) ? filter_var($segments[2], FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]) : null;
$body = request_body();

if ($method !== 'GET' && !empty($_SERVER['HTTP_ORIGIN'])) {
    $originHost = parse_url($_SERVER['HTTP_ORIGIN'], PHP_URL_HOST);
    $requestHost = strtolower(preg_replace('/:\d+$/', '', $_SERVER['HTTP_HOST'] ?? '') ?? '');
    if (!$originHost || strtolower($originHost) !== $requestHost) respond(['error' => 'Request origin is not allowed.'], 403);
}

if ($resource === 'ping' && $method === 'GET') respond(['ok' => true, 'message' => 'Next Millionaire Finance API is alive']);

if ($resource === 'auth') {
    $action = $segments[2] ?? '';
    if ($action === 'me' && $method === 'GET') {
        $user = current_user($db);
        if (!$user) respond(['error' => 'Sign in required.'], 401);
        respond(['user' => user_payload($user)]);
    }
    if ($action === 'signup' && $method === 'POST') {
        $email = strtolower(clean_text($body['email'] ?? ''));
        $name = clean_text($body['name'] ?? '');
        $password = is_string($body['password'] ?? null) ? $body['password'] : '';
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(['error' => 'Enter a valid email address.'], 400);
        if ($name === '' || mb_strlen($name) > 255) respond(['error' => 'Enter your name.'], 400);
        if (strlen($password) < 6) respond(['error' => 'Password must be at least 6 characters.'], 400);
        $secrets = require __DIR__ . '/hostinger-secrets.php';
        $adminEmail = strtolower((string)($secrets['admin_email'] ?? 'md.mizan235@gmail.com'));
        $role = $email === $adminEmail ? 'admin' : 'member';
        try {
            $stmt = $db->prepare('INSERT INTO users (email, full_name, password_hash, role) VALUES (?, ?, ?, ?)');
            $stmt->execute([$email, $name, password_hash($password, PASSWORD_DEFAULT), $role]);
        } catch (PDOException $error) {
            if ($error->getCode() === '23000') respond(['error' => 'An account with this email already exists.'], 409);
            throw $error;
        }
        session_regenerate_id(true);
        $_SESSION['user_id'] = (int)$db->lastInsertId();
        respond(['user' => ['id' => (int)$_SESSION['user_id'], 'email' => $email, 'name' => $name, 'role' => $role]], 201);
    }
    if ($action === 'login' && $method === 'POST') {
        $email = strtolower(clean_text($body['email'] ?? ''));
        $password = is_string($body['password'] ?? null) ? $body['password'] : '';
        $stmt = $db->prepare('SELECT id, email, full_name, password_hash, role FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        if (!$user || !password_verify($password, $user['password_hash'])) respond(['error' => 'Email or password is incorrect.'], 401);
        session_regenerate_id(true);
        $_SESSION['user_id'] = (int)$user['id'];
        respond(['user' => user_payload($user)]);
    }
    if ($action === 'logout' && $method === 'POST') {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'] ?? '', $params['secure'], $params['httponly']);
        }
        session_destroy();
        respond(['ok' => true]);
    }
    if ($action === 'forgot' && $method === 'POST') {
        $email = strtolower(clean_text($body['email'] ?? ''));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) respond(['error' => 'Enter a valid email address.'], 400);
        $stmt = $db->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $account = $stmt->fetch();
        if ($account) {
            $token = bin2hex(random_bytes(32));
            $hash = hash('sha256', $token);
            $save = $db->prepare('UPDATE users SET reset_token_hash = ?, reset_expires = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 HOUR) WHERE id = ?');
            $save->execute([$hash, (int)$account['id']]);
            $secrets = require __DIR__ . '/hostinger-secrets.php';
            $from = trim((string)($secrets['mail_from'] ?? ''));
            if ($from !== '' && function_exists('mail')) {
                $host = $_SERVER['HTTP_HOST'] ?? '';
                $link = 'https://' . $host . '/login?token=' . rawurlencode($token);
                $headers = "From: Next Millionaire Finance <" . $from . ">\r\nContent-Type: text/plain; charset=UTF-8";
                @mail($email, 'Reset your Next Millionaire Finance password', "Use this one-time link within one hour to reset your password:\n\n" . $link, $headers);
            }
        }
        respond(['ok' => true, 'message' => 'If an account exists, a password reset link will be sent.']);
    }
    if ($action === 'reset' && $method === 'POST') {
        $token = clean_text($body['token'] ?? '');
        $password = is_string($body['password'] ?? null) ? $body['password'] : '';
        if (strlen($password) < 6) respond(['error' => 'Password must be at least 6 characters.'], 400);
        if (!preg_match('/^[a-f0-9]{64}$/', $token)) respond(['error' => 'This reset link is invalid or expired.'], 400);
        $stmt = $db->prepare('SELECT id FROM users WHERE reset_token_hash = ? AND reset_expires > UTC_TIMESTAMP() LIMIT 1');
        $stmt->execute([hash('sha256', $token)]);
        $user = $stmt->fetch();
        if (!$user) respond(['error' => 'This reset link is invalid or expired.'], 400);
        $update = $db->prepare('UPDATE users SET password_hash = ?, reset_token_hash = NULL, reset_expires = NULL WHERE id = ?');
        $update->execute([password_hash($password, PASSWORD_DEFAULT), (int)$user['id']]);
        respond(['ok' => true]);
    }
    respond(['error' => 'Unknown authentication endpoint.'], 404);
}

$user = $method === 'GET' ? require_user($db) : require_admin($db);
if (isset($segments[2]) && $id === false) respond(['error' => 'Invalid id.'], 400);

try {
    if ($resource === 'members') {
        if ($method === 'GET') {
            $rows = $db->query("SELECT id, name, email, phone, role, DATE_FORMAT(joined_date, '%Y-%m-%d') AS joined_date, created_at FROM members ORDER BY name")->fetchAll();
            foreach ($rows as &$row) $row['id'] = (int)$row['id'];
            respond(['members' => $rows]);
        }
        if ($method === 'POST') {
            $name = clean_text($body['name'] ?? '');
            if ($name === '') respond(['error' => 'Name is required.'], 400);
            if (isset($body['role']) && !in_array($body['role'], ['member', 'admin'], true)) respond(['error' => 'Invalid member role.'], 400);
            if (!empty($body['joined_date']) && !valid_date_value($body['joined_date'])) respond(['error' => 'Invalid joined date.'], 400);
            $stmt = $db->prepare('INSERT INTO members (name, email, phone, role, joined_date) VALUES (?, ?, ?, ?, ?)');
            $stmt->execute([$name, optional_value($body, 'email'), optional_value($body, 'phone'), $body['role'] ?? 'member', $body['joined_date'] ?? gmdate('Y-m-d')]);
            $row = $db->query('SELECT id, name, email, phone, role, DATE_FORMAT(joined_date, "%Y-%m-%d") AS joined_date, created_at FROM members WHERE id = ' . (int)$db->lastInsertId())->fetch();
            $row['id'] = (int)$row['id'];
            respond(['member' => $row], 201);
        }
        if (($method === 'PATCH' || $method === 'PUT') && $id) {
            if (isset($body['role']) && !in_array($body['role'], ['member', 'admin'], true)) respond(['error' => 'Invalid member role.'], 400);
            if (array_key_exists('name', $body) && clean_text($body['name']) === '') respond(['error' => 'Name is required.'], 400);
            $allowed = ['name', 'email', 'phone', 'role'];
            $fields = array_intersect($allowed, array_keys($body));
            if (!$fields) respond(['error' => 'No fields to update.'], 400);
            $sets = [];
            $values = [];
            foreach ($fields as $field) { $sets[] = "`$field` = ?"; $values[] = $field === 'name' ? clean_text($body[$field]) : optional_value($body, $field); }
            $values[] = $id;
            $stmt = $db->prepare('UPDATE members SET ' . implode(', ', $sets) . ' WHERE id = ?');
            $stmt->execute($values);
            if ($stmt->rowCount() === 0) {
                $check = $db->prepare('SELECT id FROM members WHERE id = ?'); $check->execute([$id]);
                if (!$check->fetch()) respond(['error' => 'Member not found.'], 404);
            }
            $stmt = $db->prepare("SELECT id, name, email, phone, role, DATE_FORMAT(joined_date, '%Y-%m-%d') AS joined_date, created_at FROM members WHERE id = ?"); $stmt->execute([$id]);
            $row = $stmt->fetch(); $row['id'] = (int)$row['id']; respond(['member' => $row]);
        }
        if ($method === 'DELETE' && $id) {
            $stmt = $db->prepare('DELETE FROM members WHERE id = ?'); $stmt->execute([$id]);
            if (!$stmt->rowCount()) respond(['error' => 'Member not found.'], 404);
            respond(['ok' => true]);
        }
    }

    if ($resource === 'cars') {
        if ($method === 'GET') {
            $rows = $db->query("SELECT id, name, registration_no, purchase_price, DATE_FORMAT(purchase_date, '%Y-%m-%d') AS purchase_date, status, created_at FROM cars ORDER BY name")->fetchAll();
            foreach ($rows as &$row) { $row['id'] = (int)$row['id']; $row['purchase_price'] = (float)$row['purchase_price']; }
            respond(['cars' => $rows]);
        }
        if ($method === 'POST') {
            $name = clean_text($body['name'] ?? '');
            $price = (float)($body['purchase_price'] ?? 0);
            if ($name === '') respond(['error' => 'Name is required.'], 400);
            if (isset($body['status']) && !in_array($body['status'], ['active', 'in_repair', 'sold'], true)) respond(['error' => 'Invalid car status.'], 400);
            if (!empty($body['purchase_date']) && !valid_date_value($body['purchase_date'])) respond(['error' => 'Invalid purchase date.'], 400);
            if ($price < 0) respond(['error' => 'Purchase price cannot be negative.'], 400);
            $stmt = $db->prepare('INSERT INTO cars (name, registration_no, purchase_price, purchase_date, status) VALUES (?, ?, ?, ?, ?)');
            $stmt->execute([$name, optional_value($body, 'registration_no'), $price, optional_value($body, 'purchase_date'), $body['status'] ?? 'active']);
            $row = $db->query('SELECT id, name, registration_no, purchase_price, DATE_FORMAT(purchase_date, "%Y-%m-%d") AS purchase_date, status, created_at FROM cars WHERE id = ' . (int)$db->lastInsertId())->fetch();
            $row['id'] = (int)$row['id']; $row['purchase_price'] = (float)$row['purchase_price']; respond(['car' => $row], 201);
        }
        if (($method === 'PATCH' || $method === 'PUT') && $id) {
            if (isset($body['status']) && !in_array($body['status'], ['active', 'in_repair', 'sold'], true)) respond(['error' => 'Invalid car status.'], 400);
            if (array_key_exists('name', $body) && clean_text($body['name']) === '') respond(['error' => 'Name is required.'], 400);
            if (array_key_exists('purchase_date', $body) && $body['purchase_date'] !== null && $body['purchase_date'] !== '' && !valid_date_value($body['purchase_date'])) respond(['error' => 'Invalid purchase date.'], 400);
            if (isset($body['purchase_price']) && (float)$body['purchase_price'] < 0) respond(['error' => 'Purchase price cannot be negative.'], 400);
            $allowed = ['name', 'registration_no', 'purchase_price', 'purchase_date', 'status'];
            $fields = array_intersect($allowed, array_keys($body));
            if (!$fields) respond(['error' => 'No fields to update.'], 400);
            $sets = []; $values = [];
            foreach ($fields as $field) { $sets[] = "`$field` = ?"; $value = $body[$field]; if ($field === 'name') $value = clean_text($value); if ($field === 'purchase_price') $value = (float)$value; if ($field === 'registration_no' || $field === 'purchase_date') $value = $value === '' ? null : $value; $values[] = $value; }
            $values[] = $id; $stmt = $db->prepare('UPDATE cars SET ' . implode(', ', $sets) . ' WHERE id = ?'); $stmt->execute($values);
            $check = $db->prepare('SELECT id FROM cars WHERE id = ?'); $check->execute([$id]); if (!$check->fetch()) respond(['error' => 'Car not found.'], 404);
            $stmt = $db->prepare("SELECT id, name, registration_no, purchase_price, DATE_FORMAT(purchase_date, '%Y-%m-%d') AS purchase_date, status, created_at FROM cars WHERE id = ?"); $stmt->execute([$id]);
            $row = $stmt->fetch(); $row['id'] = (int)$row['id']; $row['purchase_price'] = (float)$row['purchase_price']; respond(['car' => $row]);
        }
        if ($method === 'DELETE' && $id) { $stmt = $db->prepare('DELETE FROM cars WHERE id = ?'); $stmt->execute([$id]); if (!$stmt->rowCount()) respond(['error' => 'Car not found.'], 404); respond(['ok' => true]); }
    }

    if ($resource === 'transactions') {
        if ($method === 'GET') {
            $where = []; $values = [];
            if (isset($_GET['type']) && $_GET['type'] !== '') { $where[] = 't.type = ?'; $values[] = $_GET['type']; }
            if (isset($_GET['month']) && $_GET['month'] !== '') { $where[] = "DATE_FORMAT(t.txn_date, '%Y-%m') = ?"; $values[] = $_GET['month']; }
            if (isset($_GET['category']) && $_GET['category'] !== '') { $where[] = 't.category = ?'; $values[] = $_GET['category']; }
            $limit = min(max((int)($_GET['limit'] ?? 200), 1), 500); $offset = max((int)($_GET['offset'] ?? 0), 0);
            $sql = "SELECT t.id, t.type, t.category, t.amount, DATE_FORMAT(t.txn_date, '%Y-%m-%d') AS txn_date, t.description, t.car_id, t.member_id, t.created_by, m.name AS member_name, c.name AS car_name FROM transactions t LEFT JOIN members m ON m.id=t.member_id LEFT JOIN cars c ON c.id=t.car_id";
            if ($where) $sql .= ' WHERE ' . implode(' AND ', $where);
            $sql .= ' ORDER BY t.txn_date DESC, t.id DESC LIMIT ' . $limit . ' OFFSET ' . $offset;
            $stmt = $db->prepare($sql); $stmt->execute($values); $rows = $stmt->fetchAll();
            foreach ($rows as &$row) { $row['id'] = (int)$row['id']; $row['amount'] = (float)$row['amount']; foreach (['car_id','member_id','created_by'] as $key) $row[$key] = $row[$key] === null ? null : (int)$row[$key]; }
            respond(['transactions' => $rows]);
        }
        $types = ['income','expense','contribution','dividend','liability','receivable'];
        $categories = ['driver_rent','other_income','member_contribution','car_maintenance','insurance','registration','fuel','office_expense','transportation','food_entertainment','mobile_internet','depreciation','dividend_payout','security_deposit_received','security_deposit_refunded','advance_rent_received','advance_rent_recognized','accident_fine_receivable_add','accident_fine_receivable_paid'];
        $categoryTypes = ['driver_rent'=>'income','other_income'=>'income','member_contribution'=>'contribution','car_maintenance'=>'expense','insurance'=>'expense','registration'=>'expense','fuel'=>'expense','office_expense'=>'expense','transportation'=>'expense','food_entertainment'=>'expense','mobile_internet'=>'expense','depreciation'=>'expense','dividend_payout'=>'dividend','security_deposit_received'=>'liability','security_deposit_refunded'=>'liability','advance_rent_received'=>'liability','advance_rent_recognized'=>'liability','accident_fine_receivable_add'=>'receivable','accident_fine_receivable_paid'=>'receivable'];
        if ($method === 'POST') {
            if (!in_array($body['type'] ?? '', $types, true)) respond(['error' => 'Invalid transaction type.'], 400);
            if (!in_array($body['category'] ?? '', $categories, true)) respond(['error' => 'Invalid category.'], 400);
            if ($categoryTypes[$body['category']] !== $body['type']) respond(['error' => 'Category does not match the transaction type.'], 400);
            if (!is_numeric($body['amount'] ?? null) || (float)$body['amount'] <= 0) respond(['error' => 'Amount must be greater than 0.'], 400);
            if (!empty($body['txn_date']) && !valid_date_value($body['txn_date'])) respond(['error' => 'Invalid date.'], 400);
            $stmt = $db->prepare('INSERT INTO transactions (type, category, amount, txn_date, description, car_id, member_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
            $stmt->execute([$body['type'],$body['category'],(float)$body['amount'],$body['txn_date'] ?? gmdate('Y-m-d'),optional_value($body,'description'),optional_value($body,'car_id'),optional_value($body,'member_id'),optional_value($body,'created_by')]);
            $stmt = $db->prepare("SELECT id,type,category,amount,DATE_FORMAT(txn_date,'%Y-%m-%d') AS txn_date,description,car_id,member_id,created_by FROM transactions WHERE id = ?"); $stmt->execute([(int)$db->lastInsertId()]);
            $row = $stmt->fetch(); $row['id']=(int)$row['id']; $row['amount']=(float)$row['amount']; respond(['transaction'=>$row],201);
        }
        if (($method === 'PATCH' || $method === 'PUT') && $id) {
            if (isset($body['type']) && !in_array($body['type'],$types,true)) respond(['error'=>'Invalid transaction type.'],400);
            if (isset($body['category']) && !in_array($body['category'],$categories,true)) respond(['error'=>'Invalid category.'],400);
            if (isset($body['amount']) && (!is_numeric($body['amount']) || (float)$body['amount'] <= 0)) respond(['error'=>'Amount must be greater than 0.'],400);
            if (array_key_exists('txn_date',$body) && !valid_date_value($body['txn_date'])) respond(['error'=>'Invalid date.'],400);
            $stmt=$db->prepare('SELECT type,category FROM transactions WHERE id=?');$stmt->execute([$id]);$current=$stmt->fetch();if(!$current)respond(['error'=>'Transaction not found.'],404);
            $nextType=$body['type']??$current['type'];$nextCategory=$body['category']??$current['category'];if(($categoryTypes[$nextCategory]??null)!==$nextType)respond(['error'=>'Category does not match the transaction type.'],400);
            $allowed=['type','category','amount','txn_date','description','car_id','member_id'];$fields=array_intersect($allowed,array_keys($body));if(!$fields)respond(['error'=>'No fields to update.'],400);$sets=[];$values=[];
            foreach($fields as $field){$sets[]="`$field` = ?";$value=$body[$field];if($field==='amount')$value=(float)$value;if(in_array($field,['description','car_id','member_id'],true)&&$value==='')$value=null;$values[]=$value;}$values[]=$id;$stmt=$db->prepare('UPDATE transactions SET '.implode(', ',$sets).' WHERE id=?');$stmt->execute($values);
            $stmt=$db->prepare("SELECT id,type,category,amount,DATE_FORMAT(txn_date,'%Y-%m-%d') AS txn_date,description,car_id,member_id,created_by FROM transactions WHERE id=?");$stmt->execute([$id]);$row=$stmt->fetch();$row['id']=(int)$row['id'];$row['amount']=(float)$row['amount'];respond(['transaction'=>$row]);
        }
        if ($method === 'DELETE' && $id) { $stmt=$db->prepare('DELETE FROM transactions WHERE id=?');$stmt->execute([$id]);if(!$stmt->rowCount())respond(['error'=>'Transaction not found.'],404);respond(['ok'=>true]); }
    }

    if ($resource === 'dashboard' && $method === 'GET') {
        $requested = $_GET['month'] ?? '';
        $month = preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $requested) ? $requested : gmdate('Y-m');
        $totals = $db->query("SELECT COALESCE(SUM(CASE WHEN type IN ('income','contribution') OR (type='liability' AND category IN ('security_deposit_received','advance_rent_received')) OR (type='receivable' AND category='accident_fine_receivable_paid') THEN amount ELSE 0 END),0) AS inflow, COALESCE(SUM(CASE WHEN type IN ('expense','dividend') OR (type='liability' AND category='security_deposit_refunded') THEN amount ELSE 0 END),0) AS outflow FROM transactions")->fetch();
        $balances = $db->query("SELECT COALESCE(SUM(CASE WHEN type='liability' AND category IN ('security_deposit_received','advance_rent_received') THEN amount WHEN type='liability' AND category IN ('security_deposit_refunded','advance_rent_recognized') THEN -amount ELSE 0 END),0) AS liability_balance, COALESCE(SUM(CASE WHEN type='receivable' AND category='accident_fine_receivable_add' THEN amount WHEN type='receivable' AND category='accident_fine_receivable_paid' THEN -amount ELSE 0 END),0) AS receivable_balance FROM transactions")->fetch();
        $stmt=$db->prepare("SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) income,COALESCE(SUM(CASE WHEN type='contribution' THEN amount ELSE 0 END),0) contributions,COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) expenses,COALESCE(SUM(CASE WHEN type='dividend' THEN amount ELSE 0 END),0) dividends FROM transactions WHERE DATE_FORMAT(txn_date,'%Y-%m')=?");$stmt->execute([$month]);$monthly=$stmt->fetch();
        $trendStmt=$db->prepare("SELECT DATE_FORMAT(m.month_start,'%Y-%m') AS month,COALESCE(SUM(CASE WHEN t.type IN ('income','contribution') THEN t.amount ELSE 0 END),0) AS inflow,COALESCE(SUM(CASE WHEN t.type IN ('expense','dividend') THEN t.amount ELSE 0 END),0) AS outflow FROM (SELECT DATE_SUB(STR_TO_DATE(CONCAT(?, '-01'),'%Y-%m-%d'),INTERVAL n MONTH) AS month_start FROM (SELECT 0 n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5) months) m LEFT JOIN transactions t ON t.txn_date>=m.month_start AND t.txn_date<DATE_ADD(m.month_start,INTERVAL 1 MONTH) GROUP BY m.month_start ORDER BY m.month_start");$trendStmt->execute([$month]);$trend=array_reverse($trendStmt->fetchAll());
        $members=$db->query("SELECT m.id,m.name,m.role,COALESCE(SUM(CASE WHEN t.type='contribution' THEN t.amount ELSE 0 END),0) AS contributions,COALESCE(SUM(CASE WHEN t.type='dividend' THEN t.amount ELSE 0 END),0) AS dividends FROM members m LEFT JOIN transactions t ON t.member_id=m.id GROUP BY m.id,m.name,m.role ORDER BY m.name")->fetchAll();
        foreach($members as &$m){$m['id']=(int)$m['id'];$m['contributions']=(float)$m['contributions'];$m['dividends']=(float)$m['dividends'];$m['net']=$m['contributions']-$m['dividends'];}
        $recent=$db->query("SELECT id,DATE_FORMAT(txn_date,'%Y-%m-%d') AS date,type,category,description,amount FROM transactions ORDER BY txn_date DESC,id DESC LIMIT 8")->fetchAll();foreach($recent as &$r){$r['id']=(int)$r['id'];$r['amount']=(float)$r['amount'];}
        $cars=$db->query('SELECT status,COUNT(*) AS count FROM cars GROUP BY status')->fetchAll();foreach($cars as &$c)$c['count']=(int)$c['count'];
        $in=(float)$totals['inflow'];$out=(float)$totals['outflow'];$mi=(float)$monthly['income'];$mc=(float)$monthly['contributions'];$me=(float)$monthly['expenses'];$md=(float)$monthly['dividends'];
        respond(['asOf'=>gmdate('c'),'balance'=>['inflow'=>$in,'outflow'=>$out,'net'=>$in-$out],'liabilityBalance'=>(float)$balances['liability_balance'],'receivableBalance'=>(float)$balances['receivable_balance'],'month'=>$month,'monthly'=>['income'=>$mi,'contributions'=>$mc,'expenses'=>$me,'dividends'=>$md,'net'=>$mi+$mc-$me-$md],'trend'=>array_map(fn($row)=>['month'=>$row['month'],'inflow'=>(float)$row['inflow'],'outflow'=>(float)$row['outflow']],$trend),'members'=>$members,'recent'=>$recent,'cars'=>$cars]);
    }
    if ($resource === 'reset' && $method === 'POST') { $db->exec('SET FOREIGN_KEY_CHECKS=0'); $db->exec('TRUNCATE TABLE transactions'); $db->exec('TRUNCATE TABLE cars'); $db->exec('TRUNCATE TABLE members'); $db->exec('SET FOREIGN_KEY_CHECKS=1'); respond(['ok'=>true]); }
} catch (PDOException $error) {
    if ($error->getCode() === '23000') respond(['error' => 'A record with that email or registration number already exists.'], 409);
    if ($error->getCode() === '23000') respond(['error' => 'The selected member or car no longer exists.'], 400);
    respond(['error' => 'The database request could not be completed.'], 500);
} catch (Throwable $error) {
    respond(['error' => 'The request could not be completed.'], 500);
}

respond(['error' => 'Unknown endpoint or method.'], 404);
